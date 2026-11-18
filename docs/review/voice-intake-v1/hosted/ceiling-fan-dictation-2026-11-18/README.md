# First hosted voice result — clarification and review pending

The user supplied [the full hosted receipt](operator-transcription.json) for
`voice_50a7b9de02160086ea9e934e27ceb4bf05ec60455fb80cda71fe3f66a08ce51a`.
The [verification](receipt-check.json) confirms its transcript hash, deterministic
contact/audio intake ID, correlation and previously verified owner source/version.
This is attributed operator evidence; no signed receipt or independent audio/JWT
inspection is claimed. Formatting and its artifact hash are in provenance.json.

| Dimension | Result |
| --- | --- |
| Hosted audio intake/transcription transport | PASS according to the supplied successful TRANSCRIBED receipt, one reserved provider call |
| State / approved payload | Revision 1; final request, payload hash, action version, approval and remote note ID all null |
| CRM effects | Zero reported create attempts; note/task execution false |
| Intended test restriction versus returned wording | MISMATCH: the returned sentence says “Customer contact or billing was authorized” |
| Source clarification | User: **“good catch, i did not say NO before customer contact”** |
| Confirmed ASR negation error | **Not established.** The speaker clarified the omission; the assistant has not heard the audio |
| Full transcript accuracy / semantic acceptance | PENDING; the clarification is not a blanket PASS or an execution grant |

The raw result was initially flagged because it differed materially from the
test script. We asked for replay/source confirmation instead of silently inserting
“no” or changing the model. The user's response is preserved as an append-only
event in [source-clarifications.json](source-clarifications.json), bound to this
intake/audio/transcript hash. The known fact is the user's stated omission before
customer contact; no other word-level accuracy is inferred. Do not relabel this
capture a demonstrated ASR hallucination or hide it as a fully passing script test.

The [immutable regression fixture](../../../../../fixtures/voice-intake/captured-dictation-mismatch-v1.json)
preserves the original receipt, intended script and source clarification. Two
offline controls verify that transcript text cannot approve/save a note, and
that an operator correction preserves the original while a material negation
change invalidates an exact grant. These use LOCAL_SYNTHETIC actors and an injected
client, not real human approval or HubSpot effects. **26 voice tests passed**;
no runtime/generator change required another model call or build.

## Next operator step

Correct only **Reviewed transcript** to the intended fictional report:

> Synthetic test data only. The fictional customer requested pricing for one ceiling fan replacement. Pricing information only. Work is not authorized. Appointments are not authorized. Customer contact is not authorized. Billing is not authorized.

The application keeps the original model text/hash and the edited version
separately. This is an operator correction of the intended report; it does not
claim the recording originally contained the missing word. Review the source,
original recording time and designated contact, tick the review checkbox, and
click **Prepare exact HubSpot note**. Share the complete request preview and
intake evidence. Do not click Approve or Save. No second transcription is needed
for this correction, and no human verdict is invented by this instruction.

Original recording timestamp: 2026-11-18T15:08:10Z (10:08:10 a.m. Eastern).
Draft expiry: 2026-11-19T15:09:30.531Z (10:09:30 a.m. Eastern). These are source
and draft-retention times, not customer deadlines. No CRM note/task, model call,
email, deployment, permission or credential change occurred while recording this
receipt/clarification. Note-create permission, exact execution approval and the
new voice release remain pending.

## Corrected exact preview supplied

The operator edited the report and supplied [revision 2](prepared-note.json). Its
[hash check](prepared-note-check.json) independently reproduces both the complete
request hash and voice action version. It is pricing for **one ceiling fan
replacement** only; work, appointments, customer contact and billing are all
explicitly unauthorized. Original recording time and designated portal/contact
are retained. The lack of a final period after “Billing is not authorized” is
preserved exactly and does not change meaning.

Payload hash: sha256:bf133090a9103ac3c119c220a7a4d2ede4e8ef66768352eb132ef9029204d599.
Action version: voice-note-action-v1:sha256:9dd9d9b23c3bd679668d4fe85e48adf6f64fa0cfa5293f6e0f7c012f7778d5ad.
This is a verified proposed payload, not proof of approval or remote creation.
The preview snippet did not include the full state/original-text/approval fields;
do not invent them. The next requested user action is **Approve exact note** once,
then share the full intake/approval evidence. Do not Save while writes are closed.

## Exact revision-2 approval received

The operator supplied [the approved intake receipt](operator-approved-note.json).
[Verification](operator-approval-check.json) reproduces its complete final request,
payload hash and action version, checks the known Approver authority hash and
preserves the separate original transcript. This is user-supplied evidence, not
an independently downloaded/signed attestation. [Attribution](approval-provenance.json)
records that limitation. The user corrected a spoken omission; no ASR negation
error is established. The exact corrected note has genuine operator approval;
other fixture semantic verdicts and feature release acceptance remain separate.

Approval voice-approval_db6b6e7c-c6e3-4674-a23d-c7b3f7fed0e5 expires
November 19, 2026 at 10:09:30 a.m. Eastern. The supplied receipt is APPROVED,
revision 2, zero attempts and no remote note. It does not demonstrate note-write
permission or note creation. No task authority follows from the note.

## Bounded execution safeguard

[Execution policy](execution-policy.json) narrows operational permission without
changing the approved note contract, payload or action version. Remote creates
require a configured run ID, exact intake ID, exact payload hash, exact approval
ID, maximum one create, and a window of at most 30 minutes. Gateway, durable
ledger and fixed HubSpot client check it; the ledger rechecks after reads and
storage flush, persists window/correlation/payload/intent before POST, and never
resets its one-attempt count. Unknown outcomes only reconcile or stay blocked.
Read-only status/reconciliation remain available after the window closes.
A safe specific credential/permission blocker is retained after an uncertain
POST; it is never a reason to automatically recreate. No scopes are expanded.

273 offline tests and 207/207 retained workflow executions pass. Both Worker
dry-run builds pass. [Local validation](guard-local-validation/) includes unit
window closure/expiry/mismatch controls. Local recovery faults are simulated,
not hosted note recovery. Generation source, reasoning prompt/model/settings,
and the exact request/action hashes are unchanged; no fresh inference is claimed.

Checked-in note switches stay false. The controller
`scripts/voice/note-window.js` can open only this exact approved intake after
closed code deployment verification. It preserves all other settings/Secrets/
bindings and closes on controller error. Runtime expiry blocks further POSTs
even before explicit closure. After the operator's one Save, explicitly close
both Workers and verify; record actual note ID/readback separately. No note has
been created by the code/receipt verification recorded above.

## Guard actually deployed with writes closed

Source `94dfdeb8d9d65f4cf8f3419031601a3eee386212` is deployed to the existing
private owner (`fc8aaeeb-3a20-4130-81ee-53211176b124`) and gateway
(`1ec78c86-ff1a-4d88-acd7-2d4ee9087355`). Both active module bytes match local
bundles. See guard-before-deployment.json, guard-deployment-owner.json and
guard-deployment-gateway.json. Prior ordinary settings, Secret names, namespace,
identity, email state and hostname/preview state are preserved. All nine task
controls and both note-write switches are false at this closed checkpoint.
Four unauthenticated voice routes redirect to Access; see guard-access.json.
No CRM/model/email call or note/task submission occurred during deployment.
The exact intake grant remains bound to its original unchanged payload/action,
not automatically to other outputs. A separate configuration-only window and
the real operator Save are still needed for hosted note-creation evidence.
