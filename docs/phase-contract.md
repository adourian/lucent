# Shipped checkpoint phase contract

The v0.3.0 model takes exactly eight float32 phase inputs, in this order:

| Index | Canonical serving value | Registry phase array |
| --- | --- | --- |
| 0 | `early phase 1` | `["EARLY_PHASE1"]` |
| 1 | `phase 1` | `["PHASE1"]` |
| 2 | `phase 1/phase 2` | `["PHASE1", "PHASE2"]` |
| 3 | `phase 2` | `["PHASE2"]` |
| 4 | `phase 2/phase 3` | `["PHASE2", "PHASE3"]` |
| 5 | `phase 3` | `["PHASE3"]` |
| 6 | `phase 4` | `["PHASE4"]` |
| 7 | `nan` | absent, null, empty array, or `["NA"]` |

## Model input

Each supported phase activates exactly one input in the order above. Combined
phases have dedicated inputs, and missing values activate the last input. An
all-zero vector is outside the model contract.

The ordered categories are defined in
[`PHASE_CATEGORIES`](../backend/app/core/phases.py). Their order and the eight
input dimensions must remain fixed for compatibility with the shipped
checkpoint. The phase-handling fix preserves the checkpoint, network dimensions,
and vectors for already-canonical valid values.

## Serving policy

The registry fetcher passes JSON through unchanged. `parse_trial_json` preserves
the entire phase value; `preprocess_trial` canonicalizes it using `core/phases.py`.
`TrialPredictor._encode_phase` uses that same normalization for direct callers,
then sets exactly one of the eight entries. Both deterministic and MC inference
use this encoder.

Array ordering is irrelevant, duplicate phase entries collapse, and the two
trained combinations use their own categories. Other combinations (including
Phase I/III, Phase III/IV, or missing mixed with a known phase) are rejected.
Unknown strings and malformed values raise `UnsupportedPhaseError`; the
prediction endpoint returns HTTP 422 without generating a prediction.

Historical strings remain accepted, ignoring case, whitespace, underscores and
hyphens, e.g. `Phase-2/Phase-3`. Missing scalar values (`None`, numeric NaN,
empty strings, `nan`, `none`) map to `nan`. `NA`, `N/A` and `not applicable`
also use this category because the model has no separate not-applicable input.
This serving policy does not imply that missing and not-applicable trials are
clinically equivalent or that prediction quality is validated for them.
Malformed array members, such as null or blank strings, are rejected.

Prediction cache keys now include `phase-v2`, bypassing old predictions made
with incorrect vectors. Existing entries are retained; general cache expiry
and model/input versioning remain separate work.

## Regression checks

`backend/tests/test_phase_handling.py` covers registry parsing through exact
encoding, all trained categories, combined-phase permutations, missing and
malformed values, actual checkpoint input tensors in both inference paths,
endpoint rejection and the phase cache migration. Embeddings are stubbed in
these focused checkpoint tests so they do not require model downloads.
