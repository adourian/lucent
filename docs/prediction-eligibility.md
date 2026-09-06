# Prediction eligibility

Lucent checks the registry record before reading a cached prediction or running
inference. Passing this check means the input meets the serving contract; it
does not establish clinical validity, calibration or predictive accuracy.

## Required and optional inputs

| Input | Rule |
| --- | --- |
| Phase | Accept the eight [model categories](phase-contract.md), including missing/NA. Unsupported phases and combinations cause abstention. |
| Brief summary | Require a nonblank summary with content. |
| Conditions | Require a list containing at least one condition with content. Healthy volunteers are accepted. |
| Eligibility criteria | Require content beyond section headings. A separate exclusion section is optional; the existing splitter's fallback is preserved. |
| Lead sponsor | Require a nonblank sponsor name with content. |
| Study type | Accept `INTERVENTIONAL`. An explicitly different type causes abstention. An absent type is disclosed but does not alone prevent prediction. |
| Trial identity | The request supplies the NCTID. If the record includes an NCTID, it must match the request after stripping whitespace and uppercasing. |
| Report context | Title, status, enrollment, completion date and registry update date may be absent or null. They are not required model features. |

“Content” excludes whitespace, punctuation alone, and exact missing-value
markers such as `NA`, `N/A`, `nan`, `null`, `none`, `not reported` and
`not provided`. No minimum character/word count, enrollment threshold,
recruitment-status filter or drug-modality restriction is applied. This check
does not judge whether otherwise-present prose is medically informative.

Missing phase has a dedicated checkpoint input. Missing summary, conditions,
sponsor or the whole criteria field has no supported imputation contract.
The eligibility splitter explicitly supports an absent separate exclusion
section. Those distinctions determine which omissions can still be scored.

The exact training distribution of text lengths and study types has not been
established. The interventional-study restriction is a conservative serving
scope decision, not a claim that training membership has been reconstructed.
An unreported study type remains accepted because it is not a model feature
and cannot be recovered from the historical input schema. Revisit these limits
with a validated cohort; do not infer confidence from passing the gate.

## Outcomes

- `supported`: required inputs are present, with no missing phase, study type
  or separate exclusion section detected.
- `supported_with_missing`: prediction is allowed, and `missing_fields`
  identifies those supported omissions. Missing optional report context does
  not change eligibility. The frontend discloses missing inputs.
- `unsupported`: an explicit phase or study type is outside the serving scope.
- `insufficient_input`: required clinical text, conditions or sponsor are absent.
- `malformed_upstream`: the response is not a study object, consumed fields have
  wrong types, JSON is invalid, or the returned trial ID conflicts with the request.

Null optional containers/fields are normalized to parser defaults. Wrong field
types are never coerced into text. Registry `phases` and `conditions` must be
arrays of strings; historical scalar phase aliases remain supported by the
low-level phase encoder, not by the registry payload validator.

## Abstention response

Unsupported or insufficient records return HTTP 422. Malformed registry data
returns HTTP 502. Both return this structure, with no probability, deterministic
score, uncertainty or label:

```json
{
  "status": "abstained",
  "category": "insufficient_input",
  "message": "This trial cannot currently be evaluated because required clinical information is missing.",
  "reasons": [
    {
      "code": "MISSING_BRIEF_SUMMARY",
      "field": "brief_summary",
      "message": "The brief summary is missing."
    }
  ]
}
```

Reason codes are `MISSING_BRIEF_SUMMARY`, `MISSING_CONDITIONS`,
`MISSING_ELIGIBILITY_CRITERIA`, `MISSING_SPONSOR`, `UNSUPPORTED_PHASE`,
`UNSUPPORTED_STUDY_TYPE`, `MALFORMED_UPSTREAM_DATA`, `INVALID_FIELD_TYPE` and
`TRIAL_ID_MISMATCH`. Multiple omissions are reported together. Structural errors
take precedence; otherwise unsupported scope takes precedence over insufficiency,
while both sets of reasons are retained. Known study types are named explicitly
(for example, “This is an observational study”). Missing-information reasons name
each absent field. Unrecognized upstream values are not echoed.

The frontend displays “Analysis unavailable” with the explanation, clears the
previous report, and removes any recent estimate for the abstained trial. It
does not substitute a numerical score or present abstention as model uncertainty.
Other recent analyses remain session history. Sessions created before the
eligibility gate are not restored.

## Implementation and checks

[`assess_prediction_eligibility`](../backend/app/core/eligibility.py) is the
central API gate. It validates types, checks scope and missingness, and prepares
accepted inputs using the existing parser and preprocessing functions. The
original payload remains unchanged for source hashing. Low-level embedding and
predictor utilities remain available for development; the public API enforces
this input contract.

Eligibility source participates in the [artifact fingerprint](prediction-cache.md).
The cache response schema is `v2`; old entries cannot bypass the gate, and
abstentions are never cached as predictions. Browser sessions use `v3`.

Backend regressions cover complete and partially missing inputs, every trained
phase category, missing clinical content, heading-only criteria, study scope,
malformed nested fields, invalid JSON, and abstention before cache/inference.
Frontend regressions cover the unavailable message, supported omissions and
rejection of responses without eligibility metadata.
