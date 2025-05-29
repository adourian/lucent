import torch
import numpy as np
from app.core.generate_embeddings import TrialEmbedder  
from app.models.model import MultiInputNN

# Ensure phase_labels are in this exact order
phase_labels = ['early phase 1', 'phase 1', 'phase 1/phase 2', 'phase 2', 'phase 2/phase 3', 'phase 3', 'phase 4']

class TrialPredictor:
    def __init__(self, model_path: str, device=None):
        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
        print(f"[TrialPredictor] Using device: {self.device}")

        # Load model
        self.model = MultiInputNN(sponsor_dim=384, disease_dim=768, text_dim=768, num_features=len(phase_labels))
        self.model.load_state_dict(torch.load(model_path, map_location=self.device))

        self.model.to(self.device)
        self.model.eval()

        # Embedder
        self.embedder = TrialEmbedder(device=self.device)

    def _encode_phase(self, phase: str) -> np.ndarray:
        """
        One-hot encode the phase field.
        """
        one_hot = np.zeros(len(phase_labels), dtype=np.float32)
        try:
            idx = phase_labels.index(phase.lower())
            one_hot[idx] = 1.0
        except ValueError:
            pass  # all zeros if unknown phase
        return one_hot

    def predict(self, trial_dict: dict) -> dict:
        """
        Predict success for a single preprocessed trial.
        Args:
            trial_dict: output of preprocess_trial()
        Returns:
            Dictionary with predicted probability and label
        """
        # 1. Embeddings
        sponsor_emb = self.embedder.encode_sponsors([trial_dict['sponsor']])
        disease_emb = self.embedder.encode_diseases([trial_dict['diseases']])
        incl_emb = self.embedder.encode_text_fields([trial_dict['inclusion_criteria']])
        excl_emb = self.embedder.encode_text_fields([trial_dict['exclusion_criteria']])
        summary_emb = self.embedder.encode_text_fields([trial_dict['description']])

        # 2. One-hot numerical features (only phase)
        phase_oh = self._encode_phase(trial_dict['phase'])
        phase_tensor = torch.tensor(np.array(phase_oh, ndmin=2), dtype=torch.float32)


        # 3. Move to device
        sponsor_tensor = torch.tensor(sponsor_emb, dtype=torch.float32).to(self.device)
        disease_tensor = torch.tensor(disease_emb, dtype=torch.float32).to(self.device)
        incl_tensor = torch.tensor(incl_emb, dtype=torch.float32).to(self.device)
        excl_tensor = torch.tensor(excl_emb, dtype=torch.float32).to(self.device)
        summary_tensor = torch.tensor(summary_emb, dtype=torch.float32).to(self.device)
        phase_tensor = phase_tensor.to(self.device)

        # 4. Prediction
        with torch.no_grad():
            output = self.model(sponsor_tensor, disease_tensor, incl_tensor, excl_tensor, summary_tensor, phase_tensor)
            prob = output.item()
            label = int(prob >= 0.5)

        return {
            "probability": round(prob, 4),
            "label": label
        }
    
    def predict_with_uncertainty(self, trial_dict: dict, n_samples: int = 20) -> dict:
        # 1. Encode features once
        sponsor_emb = self.embedder.encode_sponsors([trial_dict['sponsor']])
        disease_emb = self.embedder.encode_diseases([trial_dict['diseases']])
        incl_emb = self.embedder.encode_text_fields([trial_dict['inclusion_criteria']])
        excl_emb = self.embedder.encode_text_fields([trial_dict['exclusion_criteria']])
        summary_emb = self.embedder.encode_text_fields([trial_dict['description']])
        phase_oh = self._encode_phase(trial_dict['phase'])
        phase_tensor = torch.tensor([phase_oh], dtype=torch.float32).to(self.device)

        # Move to device
        sponsor_tensor = torch.tensor(sponsor_emb, dtype=torch.float32).to(self.device)
        disease_tensor = torch.tensor(disease_emb, dtype=torch.float32).to(self.device)
        incl_tensor = torch.tensor(incl_emb, dtype=torch.float32).to(self.device)
        excl_tensor = torch.tensor(excl_emb, dtype=torch.float32).to(self.device)
        summary_tensor = torch.tensor(summary_emb, dtype=torch.float32).to(self.device)

        # Enable MC dropout
        self.model.enable_mc_dropout()

        # 2. Perform N forward passes
        preds = []
        with torch.no_grad():
            for _ in range(n_samples):
                out = self.model(sponsor_tensor, disease_tensor, incl_tensor, excl_tensor, summary_tensor, phase_tensor)
                preds.append(out.item())

        preds_np = np.array(preds)
        prob_mean = preds_np.mean()
        prob_std = preds_np.std()
        label = int(prob_mean >= 0.5)

        return {
            "probability": round(prob_mean, 4),
            "uncertainty": round(prob_std, 4),
            "label": label
        }
    
if __name__ == "__main__":
    from app.core.parsing import parse_trial_json
    from app.core.preprocessing import preprocess_trial
    from app.services.clinicaltrials_api import fetch_nctid_data
    from app.core.predict import TrialPredictor

    # Load trial
    data = fetch_nctid_data("NCT00072579")
    parsed = parse_trial_json(data)
    prepped = preprocess_trial(parsed)

    # Predict
    predictor = TrialPredictor(model_path="app\models\model_weights.pth")
    #result = predictor.predict(prepped)
    uncertainty_result = predictor.predict_with_uncertainty(prepped, n_samples=20)

    #print(result)
    print(uncertainty_result)