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
