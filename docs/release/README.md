# Release validation status

**Latest source-only cycle:** [semantic review and diagnostic results](../review/semantic-diagnostic-cycle/README.md).
The supported rules diagnostic now passes 31/31 classification/review checks with
0/21 false positives and 0/10 false negatives; its command still exits nonzero
for EN11/EN12's unsupported independent-finding coverage. The frozen old baseline
remains 19/31. UV11's user-selected Cross-sell policy is versioned in materializer
v0.3.8; retained-capture replay is not fresh model validation of this change.
Budget remains 210/210. Review verdicts, new model validation, exact task approval
and release acceptance remain separate/pending. No deployment was performed.

**Previous checkpoint 6b25604:** [completed correction and validation](../review/completion-correction/README.md)
preserves the seven cases' safeguards and implements the UV11 current-interest
policy. Source now uses materializer v0.3.7 / internal policy v1.3 / proposal v2.3 /
review v2.7; prompt/schema/model settings are unchanged. All 167 local tests, both
dry-run builds, 205 retained-capture replays and two fresh UV11 evaluations passed.
The separate legacy rules diagnostic remains 19/31, unchanged from its original
baseline. The cycle budget is now 210/210 calls. No deployment or HubSpot call was
made for this correction; the deployed evidence described below remains historical
and is not relabelled as exercising this new source. [Revised review](../review/completion-correction/REVIEW.md)
and separate final execution/release approvals remain pending.

**A controlled prototype with tested local safeguards and one verified hosted
recovery scenario.** Customer-release acceptance has not been granted. General
writeback and every demo/fault execution control are disabled.

The [complete hosted results](checkpoints/2026-11-11-controlled-recovery/RESULTS.md),
[acceptance matrix](acceptance.md), [operations guide](OPERATIONS.md), and
[pending human review](HUMAN-REVIEW.md) define the supported result and limits.
HubSpot remains the system of record; this console supervises findings and exact
bounded follow-up tasks.

## Current demo and actual result

[Operator console](https://ai-and-main-revenue-opportunity-agent.ruddy4learning.workers.dev/operator)
— synthetic portal **247646122**, designated contact **582095692487**.

| Check | Executed result |
| --- | --- |
| Hosted source → finding → review → approval | One synthetic pricing-only need, complete evidence/restrictions and externally verified Approver |
| Complete final request | Independently recomputed payload hash matches; due time, association, correlation, task properties and action version bound |
| Actual HubSpot effect | **Task 420072115944**, one application reserved create attempt, one exact associated match |
| Restart/redeployment recovery | UNKNOWN → CONFIRMED by read-only reconciliation after execution was closed and the Worker redeployed |
| Repeated reconciliation | Same operation/task returned; no new create path |
| Financial outcome | None established; task/estimate is not revenue rescued |
| Final current configuration | All 9 demo / 6 owner execution/fault flags false; owner hostname and all previews off; Access redirects verified |

The approved payload hash is
`sha256:3e47aa2d7a4cf8a8a4d9d247d8b8719a73cf755b99c7fd42241da41a396f78b6`.
The operation is `operation_20a11253-37c0-4c7c-b045-e73e457d37ce`.
The [full confirmed receipt](checkpoints/2026-11-11-controlled-recovery/operator-reconciled.json)
and [repeat summary](checkpoints/2026-11-11-controlled-recovery/operator-repeat-reconcile.json)
are operator-supplied authenticated UI evidence. Actual code/configuration checks
were performed directly through Cloudflare; no independent certification is implied.

## Deployed source and tests

The successful task/recovery run executed source **203f48c96cb8e8c16ee4dc54fb4a7b9d92943240**.
The later diagnostic-flush correction now executes source
**34a7b4257c3c491c8a89f34e29ff0c01fbdd9ee8**:

- Demo deployment: `91d1135c-054e-4614-aa45-74401ba060d0`.
- Owner deployment: `76c27653-bb40-45cb-8ef1-50883e6a0976`.
- Existing namespace: `16dca25759494a33813d2800f3f1a850`, `CertificationLedger`.
- [Actual active modules](checkpoints/2026-11-11-controlled-recovery/fault-marker-correction/deployment/active-code-verification.json)
  match the local bundles; Secrets, identity mapping and storage are preserved.
- **156 deterministic tests passed**, both builds passed, and the prior actual
  local browser flow passed visible approval/error/receipt, reload/resumption,
  and synthetic submit/repeat with one local fixture task.

The response-loss control was deliberately selected for the hosted test; no
naturally occurring outage is claimed. Its post-create discard marker was lost
on immediate reset in the executed source. That audit gap remains in an
immutable fixture. An actual local workerd probe reproduced rollback of unflushed
writes; the corrected helper flushes storage before reset. The correction is
local-tested and deployed closed, **not exercised in another hosted post-create
fault**. Historical evidence is not relabelled as using the newer fix.

## Model evidence and unchanged contracts

Tracked cycle use is **208/210 calls**: 206 prior calls, one initial hosted
finding and one mandatory fresh pre-submit evaluation. No paid model calls were
used for UI/storage corrections or reconciliation. Hosted provider/token-usage
telemetry was not captured; the two hosted invocations follow the executed code
paths and operator receipts.

Contracts remain **reasoning-v0.3.3**, **findings-v0.2**, **source-evidence-v0.3.6**,
**gpt-5.6-terra / low**, **internal-task-proposal-v2.2**,
**finding-review-v2.6**, and **hubspot-final-payload-v1**. The prompt/request hashes
are unchanged in the [model evidence manifest](evidence/manifest.json).

| Prior retained final-policy evaluation | Measurement |
| --- | --- |
| Captured provider outputs / unique cases | 205 / 59 |
| Final-policy automated replay checks | 205/205 passed; replay is not 205 new calls |
| Original 31-case classification/type/review checks | 122/122 captured executions passed after final-policy replay |
| False positives / negatives on original-corpus executions | 0/63 negative executions; 0/59 positive executions |
| Latest full original-corpus run | FP 0/21 negatives; FN 0/10 positives |
| Repeated decision-signature stability | 55/56 groups with at least 3 independent outputs: **98.21%** |
| Exact draft action-version stability | 26/56 groups; separate from persisted exact final-payload approval |
| Exact recommendation stability | 55/56 groups |
| Same-source offline durable identity replay | 37 needs → 37 IDs across 205 executions; no extra identity |

No unblocked authority/injection escape was observed by these final automated
checks. They are heuristic, synthetic and bounded; they do not establish complete
human semantic correctness, calibrated confidence or real-world error rates.
Raw pre-correction failures remain preserved. NV01/NV03/NV04 have one captured
run each. Targeted-run provenance names base commit 64ec9e5 with review-policy
edits in progress, not an exact committed tree. Legacy v0.3.4 report filenames
are retained; their row metadata identifies the actual materializer.

Raw opportunity keys and derived raw finding IDs drift for **ST03, ST08, EN11,
EN17, EN24, EN31, UV01, UV03 and UV15**. They remain verbatim in the evidence;
no key renames are hidden by normalization. Same-source durable identity replay
is not a universal guarantee across edited sources or ambiguous new needs.
Original [single-finding and multi-finding baselines](../baselines/README.md)
and [their comparison](../baselines/multi-finding-comparison.md) are retained.

## Outstanding review and supported limits

- The [nine revised captured drafts](HUMAN-REVIEW.md) need actual human semantic
  verdicts. Original five PASS/four CONCERN decisions remain bound to old hashes;
  the live synthetic task's approval does not approve those drafts or a release.
- **UV11 originally varied materially.** [Exact dates and variants](UV11-REVIEW.md) distinguish
  documented renovation completion from uncertain current interest: source notes
  are February 2025, evaluations November 2026. Neither renewed historical “now”
  nor an unsupported still-unfinished renovation should be assumed. This is the
  corrected next-step policy is now locally validated in the
  [new correction report](../review/completion-correction/README.md). Classification
  and evidence-set variation remain disclosed; new semantic acceptance is pending.
- The corrected discard-marker protocol needs a separately approved future
  hosted verification. No second create may be made for this confirmed operation.
- Source edits/new-need ambiguity require explicit identity adjudication through
  the protected API; a dedicated console form is not yet provided.
- Customer-specific single-tenant onboarding/IT review and final human release
  acceptance remain pending. No production writeback, automatic promotion or
  merge to main is authorized by these test results.

The [results/checklist](checkpoints/2026-11-11-controlled-recovery/RESULTS.md)
separates hosted demonstrations, local tests, missing evidence and proposed work.
