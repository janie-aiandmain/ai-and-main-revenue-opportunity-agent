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
| B: exact final payload/source/expiry/identity/bypass | Final payload and actor binding; stale-source/replay and native Fetch checks | [151 deterministic tests](evidence/release-all-tests.txt), [local Worker](evidence/release-local-worker-final.json) | PASS local; current hosted enforcement pending |
| C: durable intent, concurrency, restart, no blind retry, audited resolution | Full-candidate reconciliation and audited permanent no-retry resolution | [Earlier hosted controls](../demo-recovery-evidence/README.md), [current local recovery](evidence/release-local-worker-final.json) | PASS earlier hosted injection + current local tests; revised hosted path pending |
| D: tenant credentials and designated marker | Authenticated read-only preflight; safe account/binding inspection; designated-note read | [Preflight](checkpoints/2026-11-11/operator-preflight-before-deployment.json), [hosted finding](checkpoints/2026-11-11-hosted-finding/README.md) | PASS operator-supplied identity/portal/contact/task-read checks; noteCount now 1 and new-source hosted evaluation succeeds |
| D: external Viewer/Approver/Admin | Actual subject verified by operator; Approver mapping; unsigned/expired/mismatched/revoked-role tests | [Role mapping](evidence/release-role-map.json), [Access snapshot](evidence/release-resumed-state.json), [tests](evidence/release-all-tests.txt) | PASS setup and bounded local/unauthenticated checks; not execution approval |
| D: secrets, faults, pagination, retention | Same-value secret migration; native redirect handling, fail-closed pages, audit pruning/holds | [Secret receipt](evidence/release-secret-storage.json), [tests](evidence/release-all-tests.txt) | PASS executed checks; owner credential validity remains separate blocker |
| D: supported deployment/rollback/onboarding | Existing namespace only; single-tenant; retention and uncertain-write procedures | [Operations guide](OPERATIONS.md) | PASS documentation prepared; client-specific onboarding/IT review pending |
| E: hosted complete flow | Existing demo/storage; source note → finding → operator-reviewed exact request | [Hosted finding/preview checkpoint](checkpoints/2026-11-11-hosted-finding/README.md) | PASS through exact prepared preview; final signed-in execution approval and bounded task/recovery tests pending; 0 new HubSpot tasks this cycle |
| E: usable operator console/outcomes | Browser preview/approval/repeat; clear blocks; deduplicated verified outcomes | [Local browser](evidence/release-browser-local.json), [Worker/outcomes](evidence/release-local-worker-final.json) | PASS local flow; identity-adjudication UI absent, protected API only; hosted usability pending |
| F: tests/build/model consistency | 151 tests, both builds; prior 205 saved outputs/206 calls, 55/56 repeated groups stable; actual deployed hashes; first hosted positive control | [Model manifest](evidence/manifest.json), [deployed hashes](checkpoints/2026-11-11/active-code-verification.json), [hosted control](checkpoints/2026-11-11-hosted-finding/README.md) | PASS bounded local/model/deployed checks; 207 cumulative reported calls; full hosted write/recovery and genuine revised-output/release acceptance pending |
| Final semantic/release acceptance | Exact revised drafts and original hash-bound verdicts remain distinct | [Human-review packet](HUMAN-REVIEW.md) | BLOCKED genuine human judgment and current hosted evidence; no synthetic sign-off |

Bound for this cycle: at most three new labelled synthetic HubSpot tasks on the
designated contact, initially 150 fresh model calls before reassessment. After the reproduced bare
No/Never evidence omission, the reassessed cycle cap is 210 calls: 53 fresh corpus/
restriction calls plus up to seven hosted-validation calls beyond the first 150.
No automatic retry creates after uncertainty. All test writes disabled after a
hosted run; no live customer deployment or main merge. These bounds are narrower
than the supplied task authority, not an expansion of CRM permissions.
