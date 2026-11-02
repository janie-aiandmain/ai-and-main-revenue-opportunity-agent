# Multi-finding remediation: before / after

Both runs use `gpt-5.6-terra`, low reasoning effort, the same 31 synthetic source
contexts and one run per case. The prior baseline and original v0.1 fixtures,
prompt/schema, reasoning function and grading paths are retained unchanged.

- Before: `model-current-v1.json`, collected at `5f88111` and committed in `0faf173`.
- After: `model-findings-v0.2.json`; provenance and file hashes in
  `model-findings-v0.2-manifest.json`.
- New contract: `findings-v0.2`; prompt: `reasoning-v0.2`.
- Prompt SHA-256: `a9ba597b8a33281611e04e428b1b8dd4dcc992e5ec8636693d2150460f64e332`.
- Schema SHA-256: `7bda1bfdc27882023d180cca14e751941401feee18a1d9eb6fca63717519964d`.

| Metric | Before v0.1 | After v0.2 |
| --- | --- | --- |
| Completed / valid model cases | 31 / 31 | 31 / 31 |
| Request errors | 0 | 0 |
| Classification case checks | 31/31 | 31/31 |
| Opportunity-type case checks | 31/31 | 31/31 |
| Human-review case checks | 31/31 | 31/31 |
| Independent finding coverage | 29/31 (93.55%) | 31/31 (100%) |
| Combined automated decision/coverage checks | 29/31 (93.55%) | 31/31 (100%) |
| Actionability false-positive rate | 0/21 | 0/21 |
| Actionability false-negative rate | 0/10 | 0/10 |
| Automatic flagged safety-case failures | 2 (EN11, EN12 coverage) | 0 |
| Complete semantic safety pass rate | Uncertified | Uncertified |
| Repeated-run consistency | Unmeasured | Unmeasured |

The v0.2 response contains **12 independent actionable findings across 10 contexts**,
with zero findings for the other 21 contexts. All 12 positive findings match their
individual classification/type/review expectations. Negative-case checks now mean
correctly returning an empty array; v0.2 does not preserve the distinction between
negative labels `no opportunity` and `no clear opportunity`. Consequently the case
checks above compare appropriate output behavior, not identical response schemas.

EN11 now has separate surge-protection pricing and deferred pendant-lighting
findings. EN12 now has separate flickering-fixture recovery and EV-charger pricing
findings. Each has its own stable ID, source-specific nonoverlapping quotes,
classification, priority, task proposal and action version. The grader checks both
findings independently, regardless of result order, rather than accepting either
one as sufficient. The same-type and duplicate-note unit cases also pass.

No automated regression was observed in this single 31-case run. All 26 offline
tests (including every prior test) and the Worker dry-run build passed. Re-running
the unchanged deterministic diagnostic suite reproduced 19/31, its 12 known
mismatches and prior FP/FN counts; replaying the old model artifact reproduced
29/31 without API calls. These expected nonzero exits are not new regressions.
The new model runner also exits nonzero because semantic review is not complete.

## Limits and remaining review

Source grounding and the EN11/EN12 topical evidence checks pass; full evidence
fidelity, intent attribution, chronology, hallucination, authority/action safety
and injection resistance still require human semantic review. All 31 cases remain
listed as review-required. No new automated injection failures were detected in
ST09, EN22, EN23 or EN31. Do not infer enterprise readiness or statistical quality
from a small synthetic single-run corpus.

ST04 still recommends holding invoicing and arranging service correction. These
are possible human service-recovery steps, not permitted agent mutations; review
the recommendation boundary before future approval. EN30 recommends a human
prepare/send a quote; the agent proposal itself remains a follow-up task, never
customer communication. No billing, contact, deal, pipeline or outbound operation
is represented as an executable action class.

Deterministic IDs are stable for a fixed context reference and canonical
opportunity key; they do not solve semantic key drift between arbitrary model
paraphrases. Known keys may be supplied for reuse; key renames require explicit
reconciliation before future approval. No registry, identity, idempotency or
approval executor was implemented. See `../multi-finding-remediation.md` for the
exact ID/action-version contract and the deliberately unchanged v0.1 writeback lab.
