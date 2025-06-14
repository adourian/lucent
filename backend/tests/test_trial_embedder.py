import pytest
import numpy as np
import torch

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from backend.app.core.generate_embeddings import TrialEmbedder  


@pytest.fixture
def mock_embedder(monkeypatch):
    embedder = TrialEmbedder(device="cpu", batch_size=2)

    # Mock SBERT encoding
    def mock_encode(sentences, **kwargs):
        return np.random.rand(len(sentences), 384)  # or 768 depending on model

    def mock_tokenizer(batch, **kwargs):
        class MockBatchEncoding(dict):
            def to(self, device):
                return self

        return MockBatchEncoding({
            "input_ids": torch.randint(0, 1000, (len(batch), 10)),
            "attention_mask": torch.ones((len(batch), 10))
        })

    class MockDiseaseModel:
        def eval(self): return self
        def to(self, device): return self
        def __call__(self, **kwargs):
            class Output:
                last_hidden_state = torch.randn(len(kwargs["input_ids"]), 10, 768)
            return Output()

    monkeypatch.setattr(embedder.sponsor_model, "encode", mock_encode)
    monkeypatch.setattr(embedder.text_model, "encode", mock_encode)
    monkeypatch.setattr(embedder, "disease_tokenizer", mock_tokenizer)
    monkeypatch.setattr(embedder, "disease_model", MockDiseaseModel())

    return embedder


def test_encode_sponsors(mock_embedder):
    sponsors = ["Pfizer", "Moderna"]
    emb = mock_embedder.encode_sponsors(sponsors)
    assert emb.shape == (2, 384) or emb.shape == (2, 768)


def test_encode_text_fields(mock_embedder):
    texts = ["Eligibility includes males aged 30–60", "Patients with no prior cancer diagnosis"]
    emb = mock_embedder.encode_text_fields(texts)
    assert emb.shape == (2, 384) or emb.shape == (2, 768)


def test_encode_diseases(mock_embedder):
    diseases = ["Type 2 Diabetes", "Breast Cancer"]
    emb = mock_embedder.encode_diseases(diseases)
    assert emb.shape == (2, 768)