"""Content-addressed identity for the deployed prediction pipeline."""

import hashlib
import json
from importlib.metadata import version
from pathlib import Path


CACHE_SCHEMA_VERSION = "v2"
PREDICTION_CACHE_TTL_SECONDS = 24 * 60 * 60
PREDICTION_SAMPLES = 500

# Immutable revisions used for both loading and cache identity. Model and
# tokenizer must be loaded from the same revision.
ENCODERS = {
    "sponsor": {
        "model_name_or_path": "sentence-transformers/all-MiniLM-L6-v2",
        "revision": "1110a243fdf4706b3f48f1d95db1a4f5529b4d41",
    },
    "text": {
        "model_name_or_path": "kamalkraj/BioSimCSE-BioLinkBERT-BASE",
        "revision": "e13c779231f4f75ba00d1554a5c348b7d3fa8112",
    },
    "disease": {
        "model_name_or_path": "Charangan/MedBERT",
        "revision": "315cdfc82d4d6eb1cabfb35444095e5b975d4d9d",
    },
}


def payload_hash(value) -> str:
    """Object key order/JSON whitespace do not affect identity; arrays do."""
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":"),
                         ensure_ascii=False, allow_nan=False).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_artifact_identity(model_path: str, device: str) -> dict[str, str]:
    """Computed once at predictor startup, never for individual requests.

    Source hashes make code changes invalidate predictions without relying on
    a developer remembering to increment a preprocessing version string.
    """
    app_dir = Path(__file__).resolve().parents[1]

    def source_hashes(*names):
        return {name: file_hash(app_dir / name) for name in names}

    model_id = file_hash(Path(model_path))
    preprocessing_id = payload_hash(source_hashes(
        "core/parsing.py", "core/preprocessing.py", "core/phases.py", "core/eligibility.py",
    ))
    encoder_id = payload_hash({
        "encoders": ENCODERS,
        "code": source_hashes("core/generate_embeddings.py"),
    })
    artifact_id = payload_hash({
        "schema": CACHE_SCHEMA_VERSION,
        "model_id": model_id,
        "preprocessing_id": preprocessing_id,
        "encoder_id": encoder_id,
        "inference": source_hashes("core/predict.py", "models/model.py"),
        "samples": PREDICTION_SAMPLES,
        "device": device,
        "runtime": {name: version(name) for name in (
            "torch", "numpy", "transformers", "tokenizers", "sentence-transformers",
        )},
    })
    return {"model_id": model_id, "preprocessing_id": preprocessing_id,
            "encoder_id": encoder_id, "artifact_id": artifact_id}


def prediction_cache_key(environment: str, nctid: str, artifact_id: str,
                         source_hash: str) -> str:
    return f"prediction:{CACHE_SCHEMA_VERSION}:{environment}:{nctid}:{artifact_id}:{source_hash}"
