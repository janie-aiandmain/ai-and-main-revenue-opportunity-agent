# Bounded demo evidence package — garage task recovery

**Observed result:** one approved synthetic HubSpot task was created, its response
was deliberately discarded, the Worker restarted, and read-only reconciliation
confirmed task **424319510263** with the approved payload unchanged and still
**one create attempt**. This verifies this injected scenario, not every network
outage, customer deployment or production release. The next-day saved-state read also returned the same task and one attempt from
another ledger boot. The bounded positive recovery demonstration is complete;
user release acceptance and broader hosted negative validation remain separate.

| Gate / dimension | Status | Evidence and practical scope |
| --- | --- | --- |
| Immutable failures and semantic review | PASS for the reviewed source packets | Original failures/captures/verdicts remain preserved. Current label-correction packet has user PASS for three cards/two runs/six exact outputs. [Decision record](../../synthetic-label-correction/adjudication/README.md). Changed/future outputs do not inherit approval. |
| Model reasoning / generated evidence | PASS for targeted validation | Materializer v0.3.12 / evidence v1.3: two fresh non-production calls, six expected finding instances, no automated failures; 3/3 proposal versions stable across two runs. 229 local tests, 207 retained workflow executions, 32 prior capture comparisons and both builds passed. This is not a new broad five-run study. [Results](../../synthetic-label-correction/README.md). |
| External operator and isolated portal | PASS for this operation | Signed-in operator receipt: EXTERNAL_VERIFIED Approver, both credentials in portal 247646122, designated synthetic contact 582095692487, three notes, marker/task reads pass. [Preflight](operator-preflight.json). No credential substitution, permission expansion or new infrastructure. |
| Complete final-payload approval | PASS for this operation | Exact request hash, review/action version and grant match. [Prepared request](prepared-task.json), [hash check](prepared-payload-check.json), [operator approval](operator-approval-receipt.json). December 1, 3:45 p.m. Eastern is the user's intentional internal target, not a customer deadline. |
| Durable pre-POST state and one-create budget | PASS for this operation | APPROVED/null remote ID/zero attempts baseline, persistent operation/correlation before submission, then one budget reservation and POST intent. [Baseline](operator-before-submission.json), [bounded run](window.json). |
| Injected discard, hosted restart and remote recovery | PASS for this scenario | Explicit discard marker and restart into UNKNOWN, followed by closed configuration activation and a new ledger boot. One exact correlation/properties/contact match produces CONFIRMED remote task 424319510263. [Unknown receipt](operator-after-discard.json), [confirmed receipt](operator-reconciled.json), [recovery check](reconciliation-check.json). |
| Repeated confirmed-operation read | PASS for next-day stored-state persistence | Same CONFIRMED task, hash, trace and one attempt on November 17, from new boot 6c1e6684…. [Repeat-read proof](repeat-read-check.json). This is a saved operation read, not a second HubSpot lookup or submission. |
| Approval invalidation / unknown-state negatives | Local tests PASS; current hosted negative matrix NOT EXECUTED | Local tests cover changed payload/source/contracts/actor/expiry and absent/ambiguous/mismatched reconciliation. This actual run uses one positive exact approval and one successful match; it does not demonstrate every hosted rejection path. |
| Outcome separation | PASS within this test | [One deduplicated task-effect record](outcome-separation.json); no financial outcome or revenue-attribution record created by this exercise. Task creation does not establish consent, current job status, pricing delivered, work performed or revenue rescued. |
| Final execution closure | PASS, live rechecked | All nine execution/fault/release flags false on both active Workers; same code/namespace/Secret names/identity/tenant/host settings. [Closure](window-close.json), [post-reconciliation active-version check](post-reconciliation-config.json), [November 17 final check](final-config-2026-11-17.json). Operator email remains enabled separately. |
| Customer production / release acceptance | PENDING / outside this demo | General writeback remains off. No main merge or real-customer rollout is authorized by these tests. |

## Exact approval and effect identifiers

- Portal/contact: `247646122` / `582095692487`.
- Finding: `op_1207462a-0eb2-4a52-a5af-57ee8d05a00b`.
- Operation: `operation_523891b4-49a7-4d23-be0f-dcc749e62b9c`.
- Review/grant: `review_7444f90f-3134-4c33-84c1-4dd745132df4` /
  `approval_28429c11-0ed2-4407-8829-341af213b0ab`.
- Payload: `sha256:3520fb4dba279f873d13cf71895932cbc0dd598d08256d9fa93e7351e784f1a7`.
- Action: `final-action-v1:sha256:8dcbdc2e04e351265420267a55ad6ff422d3a71ca3560abdf083e5617051e8df`.
- Correlation: `ai-main-3184719d-c295-435d-8cbc-7ca1c0051167`.
- New task: **424319510263**, one observed create attempt.
- Existing EV task: **420072115944**, not reset, updated or recreated by this exercise.
- Ledger boots: baseline `9505f353…`, after discard `278e51dc…`, post-closure
  reconciliation `e8c0aef0…`.
- Closed owner/gateway versions: `d2c840a5-de7b-4c53-bacc-10869241f651` /
  `66e3caac-21f7-4b8a-933c-b9d8abb10357`.

## Claims, failures and limitations retained

The original task payload/grant, provider/model captures, reservation journals and
all stages' receipts remain unchanged. Missing JSON delimiters in pasted receipts
are documented; their exact original bytes are preserved. Operator-provided
receipts are not misrepresented as independent HubSpot calls or JWT inspections
by Codex. Live remote matching is established by the verified server path and its
trace. Configuration activation/closure and active bindings were independently
read through Cloudflare's API.

The earlier Wrangler upload succeeded but its newer subdomain-read follow-up
returned code 9106; the failed command remains archived alongside direct active-
code verification. The bounded window used the existing supported settings-
inheritance/version API and succeeded without new credentials, scopes or code.

The legacy single-summary diagnostic's multiple-finding coverage limit remains
separate from the supported 207-execution workflow gate; no original expectation
or historical 19/31 baseline was removed to manufacture success. Targeted fresh
validation is positive-only; a broad false-positive rate cannot be inferred.
No additional model call was made merely to record reconciliation. Hosted model
telemetry is absent from these operation receipts, so a total provider/token
count across local and hosted runs is not fabricated.

## Human closeout checklist

- [ ] Confirm the exact internal three-outlet verification task and chosen due
  time are acceptable; it authorizes no added work, contact, scheduling or billing.
- [ ] Accept the demonstrated one-create/injected-discard/restart/read-only-match
  evidence with the stated scope; do not relabel it as a naturally occurring outage.
- [ ] Review the final repeated confirmed-operation read when supplied.
- [ ] Acknowledge the remaining hosted negative-validation and production-review
  gaps; semantic acceptance, exact task approval and release acceptance are separate.

The supported description is **a controlled prototype with tested local safeguards
and one verified hosted synthetic response-loss recovery**. No revenue rescued
is established. The highest-priority follow-up validation is a hosted changed-
payload/expired-approval rejection test that is blocked before POST; it should
require no further CRM task creation. Do not start it or expand this run automatically.

## November 17 closeout

The delayed read-only check is complete. Exact task ID 424319510263, state
CONFIRMED, original payload hash/action version/revision/correlation and one
attempt are unchanged. No trace event or additional create appeared. The ledger
boot is now 6c1e6684-756e-4222-8b07-32782b33db78, demonstrating stored confirmed
state surviving another boot. Original pasted bytes and the minimally completed
parsed copy are preserved. This did not issue a fresh HubSpot lookup.

The final direct Cloudflare check on November 17 verifies the same closed active
versions with all nine execution/fault/release flags false, private owner URL and
all previews off, the existing namespace/Secret names intact and unauthenticated
console/execute requests still redirected to Access. No deployment, model call,
CRM call, email-provider call or configuration change was made for this closeout.

**No more console actions are required for this recovery test.** Do not create
again, renew approval or reopen the consumed run. The existing EV task remains
outside this operation and was not reset or recreated. The supported outcome is
one bounded hosted synthetic recovery plus repeated saved-state persistence;
there is no verified financial outcome and no automatic customer-production or
release acceptance. The separately identified hosted approval-invalidation
negative test remains follow-up work, not a hidden passing gate.
