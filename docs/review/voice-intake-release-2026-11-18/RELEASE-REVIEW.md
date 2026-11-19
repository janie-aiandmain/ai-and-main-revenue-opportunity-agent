# Final decision — controlled synthetic HubSpot voice demo

**Implementation and hosted recovery are complete. Human release acceptance is
the remaining decision.** Accepting this packet records acceptance of the
existing guarded synthetic demo only; it activates no note/task/test/fault switch,
customer rollout, connector certification, website offer or checkout.

This separate final decision follows AGENTS.md: semantic verdicts, exact note
approvals and release acceptance are distinct. The immutable candidate facts,
exact document/evidence hashes and packetHash are in release-candidate.json.
Original PENDING packet fields remain untouched; a later actual user event
determines acceptance. Future changed source/output/configuration does not
automatically inherit it.

## Exact candidate

- Runtime source: **367621d5d3b60cb0415c3f8a544abf3861c7d6a7**
- Closed private owner: **fb54487b-599e-4433-8554-aa0a58c2f1e3**
- Closed protected gateway: **9066a43e-eea8-4073-94c7-3d59b7bb9d13**
- Account: cda2ab71dd8127c8031c945a738b86e2
- Synthetic portal/contact:247646122 /582095692487
- Voice/note contracts:v1.2 unchanged; fault policy:exact-note-response-discard-restart-v1
- Reasoning-v0.3.3 /findings-v0.2 /gpt-5.6-terra /low are unchanged.

## Executed gates

| Gate | Status | What the evidence actually establishes |
| --- | --- | --- |
| Full deterministic suite | PASS302/302 | Includes current note authority, material-change rejection, expiry, one-use fault and no-second-create boundaries. |
| Supported retained workflow | PASS207/207 | Replay, not fresh inference. Its generic PENDING labels are historical harness metadata; current five semantic verdicts derive from the user event. |
| Worker builds | PASS both | Gateway and private owner; same existing class/namespace, no migration/permission expansion. |
| Normal UI regression on current source | PASS LOCAL | Actual Chromium/workerd + independent local HTTP/SQLite fixtures, including repeated processing. Not hosted CRM or fresh model inference. |
| Actual normal voice-note save | PASS HOSTED operator receipt | Note426427657968, one attempt, exact approval/readback on source94dfdeb; unchanged payload builder and normal branch have current regression coverage. |
| Note-specific abort/recovery negatives | PASS LOCAL | Actual local Worker abort plus absent/ambiguous/mismatched/unavailable lookup tests remain blocked or reconcile; no second create. |
| Hosted injected note-loss recovery | PASS HOSTED operator receipts | Note426418751203; intent persisted, response discarded before success, new boot, UNKNOWN, then read-only exact match after switches closed; still one attempt. |
| Five targeted reasoning outputs | PASS automated + genuine user semantic PASS5/5 | Three scope cases, decline and injected-approval control; exact original hashes/packet preserved and adjudicated append-only. No fresh reasoning call in this recovery-only cycle. |
| Post-run code/configuration/Access | PASS independent Cloudflare reads | All THREE note write/release/fault and NINE task/general/legacy-fault flags false on BOTH Workers. Code, Secrets, namespace, tenant/identity/email/host/preview settings preserved. Anonymous routes redirect to Access. |
| Final controlled-demo acceptance | PENDING USER | This decision only; it cannot create another note/task or authorize real customers. |

Normal note, recovery note and any follow-up task require different approvals.
The recovery note contains no customer service/quote request, no task authority
and no financial outcome. No task or new email was sent in this cycle. Existing
operator-email settings were preserved. Neither consumed intake needs another
Save, recording, approval, reconciliation click or test window.

## Limits to retain on acceptance

- Scope is this controlled synthetic HubSpot demo, NOT a certified real-customer
  connector or general unattended writeback. Notes remain bounded to authenticated
  exact approvals and named one-use test windows; all activation flags stay off.
- One hosted injected response discard/restart is demonstrated. This is not a
  natural outage or proof of all external failure modes. Other negatives are
  local tests; direct hosted repeated-POST and adverse lookup injections were
  not performed. Read-only retry recovery did not make another create.
- Hosted receipts are supplied by the actual operator and matched to verified
  code/configuration and hashes. No independent HubSpot download, signed receipt
  or JWT inspection is claimed. Raw uploads and parsing repairs are retained.
- The operator reviewed both actual recordings/notes. The earlier separate
  synthetic audio-transcript field was not adjudicated by the five-row PASS
  answer; broad ASR reliability/word-error rate is not established. Mandatory
  per-note human review remains in place.
- Prompt/schema/model and business generation are unchanged. The five prior
  targeted captures were not rerun; neither saved note was freshly evaluated
  into live findings in this cycle. Existing finding/task gates remain separate.
- No revenue rescued, conversion or financial attribution is established by
  either note. HubSpot remains the system of record; no CRM replacement was built.
- The shared-product/certified-adapter direction is preserved. No customer CRM
  connector is certified and no other CRM, offer or checkout is activated.

Supporting evidence: hosted/recovery-run-1/CONFIRMATION.md, recovery-check.json,
final-config-readonly.json, raw operator receipts/provenance, contracts.json,
validation/ and adjudication/. Prior failures, captures, verdicts and accepted
task-demo evidence remain unchanged. Main is not merged.

**Decision requested:** Accept this exact candidate for the existing controlled
synthetic demo only, with all note/task/fault execution switches still closed;
or identify changes needed. Semantic PASS and prior exact grants do not answer
this release question automatically.
