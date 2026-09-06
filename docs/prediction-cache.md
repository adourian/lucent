# Prediction identity and timestamps

Every prediction request fetches the current ClinicalTrials.gov record and checks
[prediction eligibility](prediction-eligibility.md) before checking Redis.
An unchanged eligible record can reuse a prediction from the same
deployed pipeline for up to 24 hours. A changed record or artifact uses a
different cache entry.

## Identity

Keys have this structure:

```text
prediction:v2:{environment}:{NCTID}:{artifact_id}:{source_hash}
```

NCTIDs are stripped and uppercased. Hashes use SHA-256. The artifact identity is
computed once when the predictor starts, using:

| Component | Identity |
| --- | --- |
| Checkpoint | SHA-256 of the loaded checkpoint file (`model_id`) |
| Preprocessing | Hashes of parsing, preprocessing, phase-encoding and eligibility source (`preprocessing_id`) |
| Encoders/tokenizers | Immutable model repository revisions and embedding-generation source (`encoder_id`) |
| Inference | Predictor and network source, MC sample count, device, and installed Torch, NumPy, Transformers, Tokenizers and Sentence Transformers versions |
| Cache contract | Schema version (`v2`) |

The encoder revisions used to load models and tokenizers are the same revisions
included in the identity. Definitions and hash construction live in
[`prediction_identity.py`](../backend/app/core/prediction_identity.py).
Preprocessing or inference source edits automatically change the fingerprint;
no manual version bump is needed for those changes. Even comment-only changes
can invalidate predictions. Changes to the cache/response contract require a
schema-version bump. A deployment's artifacts and source are fixed for its
process lifetime; restart the backend after replacing them.

`source_hash` covers the full registry JSON payload with sorted object keys and
compact serialization. Array order remains significant. Hashing the full record
also invalidates reports when contextual fields change, even if network inputs
are identical. This conservative policy keeps the prediction and displayed
registry context together without a second source-cache layer.

## Lifetime and migration

Redis writes set `ex=86400`. Cache hits do not renew expiry. Old `nctid:...`
and `nctid:...:phase-v2:...` keys are never read or migrated into the new schema:
they lack trustworthy timestamps and full artifact/source identity. They remain
in Redis until removed through normal maintenance; no manual clearing is
required for correctness. New entries expire automatically.

The former `prediction:v1:...` namespace is also bypassed: its responses predate
eligibility metadata. The current gate runs even when a matching cache entry exists.

A cache hit must pass response-schema validation and match the requested NCTID,
source hash and artifact identifiers. Invalid entries are recomputed. Redis
failures allow fresh inference. A registry failure cannot fall back to an old,
unchecked prediction. This means even cache hits require a registry request,
trading some latency and outage availability for explicit evidence freshness.
HTTP responses use `Cache-Control: no-store` so browser/proxy caching cannot
bypass that check.

## Response times and provenance

| Field | Meaning |
| --- | --- |
| `generated_at` | Backend UTC time when inference completed; unchanged on cache hits |
| `source_fetched_at` | Backend UTC time when the record used for that prediction was fetched; unchanged on cache hits |
| `source_last_updated` | Registry `lastUpdatePostDateStruct.date`, or null; a registry publication date, not Lucent's analysis time |
| `cache_hit` | Whether this response reused a Redis prediction |
| `model_id`, `preprocessing_id`, `encoder_id`, `artifact_id`, `source_hash` | Content/version identifiers described above |
| `input_status`, `missing_fields` | Eligibility outcome and supported input omissions |

The frontend displays `generated_at` directly in the report and recent analyses,
including its date and local timezone. It never substitutes browser time.
Cache hits are labeled “Cached result.” The browser session schema is now `v3`,
so old sessions predating backend timestamps or eligibility are not restored. An open
report remains a snapshot until the user requests another analysis.

## Checks

Backend regressions exercise the HTTP response, original timestamps on hits,
changed checkpoint/code/encoder/runtime identities, changed registry data,
expiry, legacy-key isolation, malformed cached entries, and outages. Frontend
regressions render the report and recent analyses using server-dated responses
and reject absent or invalid timestamps. Run:

```sh
cd backend
python -m pytest tests -q
cd ../frontend
npm test
npm run lint
npm run typecheck
npm run build
```

Backend deployment should precede the updated frontend: the new frontend
requires the timestamp and provenance fields in its API responses.
