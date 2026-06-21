import threading
import torch
import numpy as np

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from app.core.generate_embeddings import TrialEmbedder  
from app.models.model import MultiInputNN

# Ensure phase_labels are in this exact order
phase_labels = ['early phase 1', 'phase 1', 'phase 1/phase 2', 'phase 2', 'phase 2/phase 3', 'phase 3', 'phase 4', 'nan']

class TrialPredictor:
    def __init__(self, model_path: str, device=None):
        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
        print(f"[TrialPredictor] Using device: {self.device}")

        # Load model
        self.model = MultiInputNN(sponsor_dim=384, disease_dim=768, text_dim=768, num_features=len(phase_labels))
        self.model.load_state_dict(torch.load(model_path, map_location=self.device))

        self.model.to(self.device)
        self.model.eval()
        torch.set_num_threads(4)

        self._lock = threading.Lock()

        # Embedder
        self.embedder = TrialEmbedder(device=self.device)

    def _encode_phase(self, phase: str) -> np.ndarray:
        """
        One-hot encode the phase field, including 'nan' as a category.
        """
        # Convert to string and lower to handle potential None, np.nan, or varied casing
        phase_str = str(phase).lower().strip()
        
        one_hot = np.zeros(len(phase_labels), dtype=np.float32)
        
        # Explicitly map empty/None/NaN to 'nan' category
        if not phase_str or phase_str == 'nan': # handles "", " ", None, or actual 'nan' string
            try:
                idx = phase_labels.index('nan') # Find the index of the 'nan' category
                one_hot[idx] = 1.0
            except ValueError:
                # Fallback if 'nan' category itself isn't in phase_labels
                pass 
        else:
            try:
                idx = phase_labels.index(phase_str)
                one_hot[idx] = 1.0
            except ValueError:
                # If a non-empty/non-nan phase string is not found, it remains all zeros.
                # This corresponds to phases seen in production but not in training labels.
                pass 
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
        phase_tensor = torch.from_numpy(np.array(phase_oh, dtype=np.float32)).unsqueeze(0).to(self.device)


        # 4. Prediction
        self.model.eval()

        with torch.no_grad():
            output = self.model(sponsor_tensor, disease_tensor, incl_tensor, excl_tensor, summary_tensor, phase_tensor)
            prob = torch.sigmoid(output).item()
            label = int(prob >= 0.5)

        return {
            "probability": round(prob, 4),
            "label": label
        }
    
    def predict_with_uncertainty(self, trial_dict: dict, n_samples: int = 20) -> dict:
        with self._lock:
            # Encode features once
            sponsor_emb = self.embedder.encode_sponsors([trial_dict['sponsor']])
            disease_emb = self.embedder.encode_diseases([trial_dict['diseases']])
            incl_emb = self.embedder.encode_text_fields([trial_dict['inclusion_criteria']])
            excl_emb = self.embedder.encode_text_fields([trial_dict['exclusion_criteria']])
            summary_emb = self.embedder.encode_text_fields([trial_dict['description']])
            phase_oh = self._encode_phase(trial_dict['phase'])
            phase_tensor = torch.from_numpy(np.array(phase_oh, dtype=np.float32)).unsqueeze(0).to(self.device)

            # Move to device
            sponsor_tensor = torch.tensor(sponsor_emb, dtype=torch.float32).to(self.device)
            disease_tensor = torch.tensor(disease_emb, dtype=torch.float32).to(self.device)
            incl_tensor = torch.tensor(incl_emb, dtype=torch.float32).to(self.device)
            excl_tensor = torch.tensor(excl_emb, dtype=torch.float32).to(self.device)
            summary_tensor = torch.tensor(summary_emb, dtype=torch.float32).to(self.device)

            # Deterministic prediction
            self.model.eval()
            with torch.no_grad():
                det_output = self.model(sponsor_tensor, disease_tensor, incl_tensor, excl_tensor, summary_tensor, phase_tensor)
                deterministic_prob = torch.sigmoid(det_output).item()

            # Expand all input tensors to create a batch of size n_samples
            #    .expand() is very efficient; it doesn't actually copy data.
            sponsor_batch = sponsor_tensor.expand(n_samples, -1)
            disease_batch = disease_tensor.expand(n_samples, -1)
            incl_batch = incl_tensor.expand(n_samples, -1)
            excl_batch = excl_tensor.expand(n_samples, -1)
            summary_batch = summary_tensor.expand(n_samples, -1)
            phase_batch = phase_tensor.expand(n_samples, -1)

            # Enable MC dropout
            self.model.enable_mc_dropout()
            with torch.no_grad():
                out_batch = self.model(sponsor_batch, disease_batch, incl_batch, excl_batch, summary_batch, phase_batch)

                # Output is shape [n_samples, 1]. We apply sigmoid and convert to a flat numpy array.
                preds_tensor = torch.sigmoid(out_batch)
                preds_np = preds_tensor.cpu().numpy().flatten()

            # Reset model to evaluation mode
            self.model.eval()

            # Calculate stats
            prob_mean = preds_np.mean()
            prob_std = preds_np.std()
            label = int(prob_mean >= 0.5)

            return {
                "probability": round(float(prob_mean), 4),
                "uncertainty": round(float(prob_std), 4),
                "label": label,
                "deterministic": round(deterministic_prob, 4)
            }
    
if __name__ == "__main__":
    from app.core.parsing import parse_trial_json
    from app.core.preprocessing import preprocess_trial
    from app.services.clinicaltrials_api import fetch_nctid_data
    from app.core.predict import TrialPredictor

    # Load trial
    data = fetch_nctid_data("NCT05537935")
    parsed = parse_trial_json(data)
    prepped = preprocess_trial(parsed)

    # Predict
    predictor = TrialPredictor(model_path="app/models/model_weights.pth")
    #result = predictor.predict(prepped)
    uncertainty_result = predictor.predict_with_uncertainty(prepped, n_samples=10)

    #print(result)
    print(uncertainty_result)