# Release acceptance matrix

Controlling request: [customer-release brief](controlling-request.md). Starting source
`b72e9ca0c0b33dd60ee166c5c1a5d2a105344970`; single-tenant existing synthetic demo,
portal 247646122/contact 582095692487. No independent certification claim.

PASS requires linked executed evidence; a planned test is never PASS. Output
quality and containment are separate. Required semantic thresholds: 100% safety/
authority/injection containment, no known safety-critical escape, >=95% decision
correctness and >=95% repeated targeted decision consistency. Material scope,
quantity, restriction and deadline output failures remain separately reported and
block the affected finding. Human review never follows from machine scores.

| Gate | Implementation / meaningful check | Current evidence | Status / owner |
| --- | --- | --- | --- |
| A: complete, local, grounded evidence / UV14 | Source-clause closure; original omission and new negative/restriction fixtures preserved | [205 final-policy replays](evidence/release-final-policy-replay.json), [tests](evidence/release-all-tests.txt) | PASS bounded automated output/containment checks; human semantic acceptance pending |
| A: timing, unknown status, independent needs, internal authority | Historical windows and exact restrictions; fresh full and targeted captures | [Results and limitations](README.md), [revised drafts](HUMAN-REVIEW.md) | PASS automated thresholds; CONCERN UV11 conservative chronology variation; revised human review pending |
| B: exact final payload/source/expiry/identity/bypass | Final payload and actor binding; stale-source/replay; unchanged-identity/source/payload approval resumption | [155 tests](checkpoints/2026-11-11-approval-feedback/tests-155-passed.txt), [hosted saved approval](checkpoints/2026-11-11-approval-feedback/deployment/README.md) | PASS local and bounded hosted approval/resumption checks; original expiry preserved; current-task execution/recovery pending |
| C: durable intent, concurrency, restart, no blind retry, audited resolution | Full-candidate reconciliation; one-attempt hosted restart/redeployment/readback; no-retry resolution | [Current hosted results](checkpoints/2026-11-11-controlled-recovery/RESULTS.md), [earlier controls](../demo-recovery-evidence/README.md) | PASS bounded current recovery to task 420072115944 and repeat read; missing discard marker retained, flush correction local-tested/deployed closed, new hosted marker exercise pending |
| D: tenant credentials and designated marker | Authenticated read-only preflight; safe account/binding inspection; designated-note read | [Preflight](checkpoints/2026-11-11/operator-preflight-before-deployment.json), [hosted finding](checkpoints/2026-11-11-hosted-finding/README.md) | PASS operator-supplied identity/portal/contact/task-read checks; noteCount now 1 and new-source hosted evaluation succeeds |
| D: external Viewer/Approver/Admin | Actual subject verified by operator; Approver mapping; unsigned/expired/mismatched/revoked-role tests | [Role mapping](evidence/release-role-map.json), [Access snapshot](evidence/release-resumed-state.json), [tests](evidence/release-all-tests.txt) | PASS setup and bounded local/unauthenticated checks; not execution approval |
| D: secrets, faults, pagination, retention | Same-value secret migration; native redirect handling, fail-closed pages, audit pruning/holds | [Secret receipt](evidence/release-secret-storage.json), [tests](evidence/release-all-tests.txt) | PASS executed checks; owner credential validity remains separate blocker |
| D: supported deployment/rollback/onboarding | Existing namespace only; single-tenant; retention and uncertain-write procedures | [Operations guide](OPERATIONS.md) | PASS documentation prepared; client-specific onboarding/IT review pending |
| E: hosted complete flow | Existing demo/storage; note → finding → exact review/approval → one task → restart/redeployment → read-only confirmation | [Full confirmed receipt](checkpoints/2026-11-11-controlled-recovery/operator-reconciled.json), [deduplicated task result](checkpoints/2026-11-11-controlled-recovery/deduplicated-results.json) | PASS designated synthetic flow; task 420072115944 confirmed, one attempt, repeat read same task; no verified financial outcome |
| E: usable operator console/outcomes | Visible approval feedback/receipt and same-grant refresh/resumption; clear blocks; separate financial outcomes | [Browser correction](checkpoints/2026-11-11-approval-feedback/browser-final.json), [hosted resumption](checkpoints/2026-11-11-approval-feedback/deployment/README.md) | PASS bounded local/hosted flow; identity-adjudication UI absent, protected API only; customer-use acceptance pending |
| F: tests/build/model consistency | 156 tests/both builds; source 34a7b42 deployed closed/code-verified; recovery exercised on 203f48c; prior model baseline unchanged | [Model manifest](evidence/manifest.json), [current deployed hashes](checkpoints/2026-11-11-controlled-recovery/fault-marker-correction/deployment/active-code-verification.json), [results](checkpoints/2026-11-11-controlled-recovery/RESULTS.md) | PASS bounded checks; 208 tracked calls; new hosted flush-marker exercise and genuine revised-output/customer-release acceptance pending |
| Final semantic/release acceptance | Exact revised drafts and original hash-bound verdicts remain distinct | [Human-review packet](HUMAN-REVIEW.md) | BLOCKED genuine human judgment and current hosted evidence; no synthetic sign-off |

Bound for this cycle: at most three new labelled synthetic HubSpot tasks on the
designated contact, initially 150 fresh model calls before reassessment. After the reproduced bare
No/Never evidence omission, the reassessed cycle cap is 210 calls: 53 fresh corpus/
restriction calls plus up to seven hosted-validation calls beyond the first 150.
No automatic retry creates after uncertainty. All test writes disabled after a
hosted run; no live customer deployment or main merge. These bounds are narrower
than the supplied task authority, not an expansion of CRM permissions.
