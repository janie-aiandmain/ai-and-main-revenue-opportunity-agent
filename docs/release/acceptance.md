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
| A: complete, local, grounded evidence / UV14 | Reproduce preserved omission, implement source-bound qualifier completion, unseen counterexamples and fresh repeated model checks | Prior [blocked UV14](../review/semantic-corrections/README.md) | FAIL output; PASS prior containment; product correction in progress |
| A: historical timing, unknown status, distinct needs, internal-only authority | Existing internal policy and source-relative gates; repeat affected tests | [Prior corrections](../review/semantic-corrections/README.md) | PASS prior local checks; fresh release evaluation pending |
| B: exact final payload, source, expiry, identity and bypass | Existing GeneralFindingLedger + operation ledger; adversarial payload/actor/replay checks | [Prior local pipeline](../review/semantic-corrections/local-worker-final.json) | Pending release checks; product work |
| C: durable intent, concurrency, restart, no blind retry, audited resolution | Existing durable SQLite; full candidate match; explicit operator terminal resolution | [Earlier hosted controls](../demo-recovery-evidence/README.md) retained | PASS earlier injected-loss demo; affected release retest pending |
| D: tenant credentials and designated marker | Read-only deployed preflight before any create | [Earlier preflight](../demo-recovery-evidence/hosted-success.json) | Pending current check; external credentials if rejected |
| D: external identity and Viewer/Approver/Admin | Verify actual configured issuer/audience/subjects and unauthenticated denial; test invalid/revoked roles | Existing RS256 verifier; live mapping unverified | BLOCKED customer authentication until actual configuration verified |
| D: secrets, upstream faults, pagination and retention | Existing sanitized blockers; test paging limits, errors, retention and active-operation safety | Existing tests | Pending release checks / product work |
| D: supported deployment, rollback and onboarding | Single-tenant allowlisted context; operational runbook | Existing setup docs | Pending consolidated customer runbook |
| E: hosted note → finding → review → exact preview → approved task/readback | Existing namespace, existing demo only; bounded labelled synthetic tests; never claim test actor is human | Latest corrected workflow not deployed | BLOCKED pending corrected deployment and real operator identity; bounded synthetic validation permitted |
| E: usable operator console, clear blocks, separate financial outcomes | Narrow existing console; browser validation; no CRM CRUD | Existing local console/outcome tests | Pending release UI verification |
| F: deterministic/build, fresh model and targeted repetitions, actual deployed code | Versioned evidence with source/deployment IDs, raw captures and usage | Prior 122 tests / 49 model cases | Pending affected release verification |
| Final semantic/release acceptance | Compact revised-output package; prior original decisions retained | [Original user decisions](../review/seven-cases/human-verdicts.json) | BLOCKED human judgment; never synthesized |

Bound for this cycle: at most three new labelled synthetic HubSpot tasks on the
designated contact, at most 150 fresh model calls before reassessing results.
No automatic retry creates after uncertainty. All test writes disabled after a
hosted run; no live customer deployment or main merge. These bounds are narrower
than the supplied task authority, not an expansion of CRM permissions.
