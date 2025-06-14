import torch
import numpy as np
from tqdm import tqdm
from transformers import AutoTokenizer, AutoModel
from sentence_transformers import SentenceTransformer


class TrialEmbedder:
    def __init__(self, device=None, batch_size=64):
        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
        print(f"[TrialEmbedder] Using device: {self.device}")

        # Models
        self.sponsor_model = SentenceTransformer('all-MiniLM-L6-v2', device=str(self.device))
        self.text_model = SentenceTransformer('kamalkraj/BioSimCSE-BioLinkBERT-BASE', device=str(self.device))
        self.disease_tokenizer = AutoTokenizer.from_pretrained("Charangan/MedBERT")
        self.disease_model = AutoModel.from_pretrained("Charangan/MedBERT").to(self.device)
        self.disease_model.eval()

        self.batch_size = batch_size

    def _batch_embed_sbert(self, sentences, model):
        embeddings_list = []
        n = len(sentences)
        for i in tqdm(range(0, n, self.batch_size), desc="Embedding batches"):
            batch = sentences[i:i + self.batch_size]
            batch_embeddings = model.encode(
                batch,
                convert_to_numpy=True,
                normalize_embeddings=True,
                batch_size=self.batch_size,
                show_progress_bar=False
            )
            embeddings_list.append(batch_embeddings)
        return np.vstack(embeddings_list)

    def encode_sponsors(self, sponsor_names):
        return self._batch_embed_sbert(sponsor_names, self.sponsor_model)

    def encode_text_fields(self, texts):
        return self._batch_embed_sbert(texts, self.text_model)

    def encode_diseases(self, diseases):
        all_embeddings = []
        n = len(diseases)
        for i in tqdm(range(0, n, self.batch_size), desc="Embedding diseases"):
            batch = diseases[i:i + self.batch_size]
            encoded = self.disease_tokenizer(
                batch,
                padding=True,
                truncation=True,
                max_length=512,
                return_tensors='pt'
            ).to(self.device)

            with torch.no_grad():
                output = self.disease_model(**encoded)
                cls_embeddings = output.last_hidden_state[:, 0, :]  # CLS token
                cls_np = cls_embeddings.cpu().numpy()
                all_embeddings.append(cls_np)

        return np.vstack(all_embeddings)