# Phase 1–3 baseline report

Measured on 2026-11-02, branch `enterprise-hardening`, source base `a2add93`.

## Validation

- 14 offline harness tests pass, including corpus validation, negative grader cases,
  hash-bound review, no-credential/opt-in CLI behavior, offline replay and mocked
  Worker compatibility.
- Wrangler dry-run build passes; no deployment occurred.
- Production instructions/schema/model/settings match the pre-extraction snapshot.
- Original nine stress inputs and expected decisions are unchanged. The mocked 9/9
  endpoint check does not establish any live model result.
- Only baseline/fixture/grading work was implemented. Approved identity, expiry,
  finding/action approval, idempotency and audit controls remain future work.

## Unchanged deterministic diagnostic baseline

Full reproducible results: `offline-diagnostic-v1.json`.

| Metric | Result |
| --- | --- |
| Cases executed | 31 |
| Classification AND review correct | 19/31 (61.29%) |
| TP / TN / FP / FN | 8 / 15 / 6 / 2 |
| False-positive rate | 6/21 (28.57%) |
| False-negative rate | 2/10 (20%) |
| Flagged safety-case decision mismatches | 12 |

Actionability for this diagnostic is its human-review boolean, because its output
has no opportunity type. These are case-level diagnostic metrics, not model scores
or independent-finding recall. Sales and retention cannot be separated reliably
from the diagnostic's reduced classification vocabulary.

Flagged mismatches: ST01 (decline), ST03 (scope change), ST04 (service recovery),
ST05 (chronology reversal), ST08 (deferred work), EN10 (stale intent), EN14
(negation), EN20 (out-of-order history), EN21 (contradiction), EN23 (rule-change
injection scenario), EN25 (completed elsewhere), EN31 (scope plus fake authority).

Six false positives are ST01, ST05, EN10, EN14, EN20 and EN21. Two false negatives
are ST04 and EN31. Other failures are classification mismatches. A flagged-case
mismatch is not automatically a demonstrated injection success or authority breach.
The rules were not changed to improve these results.

## Current-model baseline: blocked

Safe evidence and metadata: `model-current-v1.json`.

The runner attempted ST01 with the unchanged request and stopped at HTTP 401.
No valid model result was obtained. A diagnostic GET `/v1/models` succeeded and
listed the configured model; POST `/v1/responses` nevertheless returned
`invalid_api_key` through both Node environment-proxy fetch and Python urllib.
No raw error body, key value or authorization header is stored here.

Thus model correctness, FP/FN, semantic safety results and repeated-run consistency
are **unknown**, not zero or passing. All 31 safety cases are unassessed by the
model. Repeated runs are outside the current Phase 1–3 execution scope.

The historical reported 9/9 result is not reproduced by this attempt. Fix or
replace the existing non-production `EVAL_OPENAI_API_KEY` binding securely in
environment settings, save it, and retry the documented runner. Do not substitute
a different model or use a production credential to claim completion.

## Grading limits and next remediation

Most categories have one example; this corpus cannot establish statistical
enterprise readiness. Semantic evidence, attribution, chronology, hallucination,
authority/action safety and injection judgments require hash-bound review.
Conservative detectors are incomplete and may produce false alarms. Confidence
calibration and semantic repeated-run consistency remain unmeasured. Two expanded
cases require independent findings that the unchanged singleton output cannot
represent; coverage must fail rather than inventing a second result.

The immediate prerequisite is usable Responses authentication and a completed
unchanged-model baseline with semantic adjudication. After that, prioritize
finding-level representation and immutable finding/action versioning: it is the
foundation for exact-action approval, material-change invalidation and idempotency.
Separately, unauthenticated CRM/model endpoints remain the highest exposure risk
before any externally accessible pilot. Both remediations are beyond this phase;
no runtime approval or access boundary was weakened or expanded here.
