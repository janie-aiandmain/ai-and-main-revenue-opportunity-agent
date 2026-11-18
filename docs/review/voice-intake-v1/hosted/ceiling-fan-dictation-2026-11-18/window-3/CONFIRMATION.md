# Hosted synthetic voice-note save confirmed

The real operator's uploaded receipt reports **NOTE_CONFIRMED**, HubSpot note
**426427657968**, portal **247646122**, designated synthetic contact
**582095692487**, **one create attempt** and **one transcription call**.
The normal save and strict readback occurred November 18, 2026 at approximately
6:38 p.m. Eastern. Both Workers' note-write switches and all nine task/fault/
general-release controls are now explicitly verified false. No further Save
or another window is needed for this consumed intake.

[Original uploaded bytes](operator-save-receipt.raw.txt) and
[normalized receipt](operator-save-receipt.json) are preserved separately.
Only the missing leading JSON brace was added for parsing; fields were unchanged.
[Provenance](save-receipt-provenance.json) identifies the user-supplied evidence.
No independent HubSpot download, JWT inspection or signed attestation is claimed.
The [offline verifier](../../../../../../scripts/voice/verify-save-receipt.js)
checks the exact request, original grant, source/deployment, timeline and actual
post-action configuration evidence. Run it from this evidence commit with
`node scripts/voice/verify-save-receipt.js`; [result](confirmed-save-check.json).

| Gate | Result | Evidence / boundary |
| --- | --- | --- |
| Hosted audio transcription | PASS response received | One call; the user clarified a spoken omission, then corrected the reviewed text. No ASR negation error or broad accuracy claim. |
| Human correction and exact note approval | PASS for this note | Revision 2; original transcript/hash retained; original approval db6b6e7c… unchanged. Other fixture semantic decisions are not approved by this grant. |
| Exact request and action integrity | PASS | Payload bf133090… and action 9dd9d9b2… reproduce the complete originally approved request, timestamp and contact association. |
| Durable intent before POST | PASS reported by known deployed handler | VOICE_POST_INTENT_PERSISTED_BEFORE_CREATE at 23:38:43.777Z, after target/approval checks, before response at 23:38:44.117Z. |
| Normal hosted HubSpot create and strict readback | PASS operator receipt | One attempt; note 426427657968; unique correlation/full-body/timestamp/contact match at 23:38:45.487Z. This demonstrates existing writer permission for this approved synthetic create. |
| Post-action closure | PASS independent Cloudflare readback | note-window-close.json: both note switches and all nine task controls false; code, Secrets, namespace, identity/tenant/email/host/preview settings preserved; Access still protects routes. |
| Hosted repeated submit | NOT RUN for this note | One durable attempt and one confirmed ID are observed; local repeat/no-second-create tests remain separate. |
| Hosted interruption / restart recovery for notes | NOT RUN | This normal save had no injected fault or observed natural outage. Earlier local simulated note faults and hosted task-recovery proofs are separate evidence. |
| Current saved note → finding evaluation | NOT RUN for this note | Prior v1.2 synthetic model/local workflow evidence remains preserved; it is not a fresh evaluation of this saved note. |
| General voice-feature release / customer rollout | PENDING | Exact note approval and this single result do not grant broad release acceptance. |

## Exact binding and actual timeline

- Intake: voice_50a7b9de02160086ea9e934e27ceb4bf05ec60455fb80cda71fe3f66a08ce51a
- Approval: voice-approval_db6b6e7c-c6e3-4674-a23d-c7b3f7fed0e5 (original, not renewed)
- Payload: sha256:bf133090a9103ac3c119c220a7a4d2ede4e8ef66768352eb132ef9029204d599
- Action: voice-note-action-v1:sha256:9dd9d9b23c3bd679668d4fe85e48adf6f64fa0cfa5293f6e0f7c012f7778d5ad
- Voice/note contracts: service-provider-voice-intake-v1.2 / hubspot-reviewed-voice-note-v1.2
- Original source recording: 2026-11-18T15:08:10.000Z; retained without renewing timing
- Source: 94dfdeb8d9d65f4cf8f3419031601a3eee386212
- Owner version at Save: 15f4131b-496e-492b-a67e-29b24ae97054
- Ledger boot at Save: 90c41631-4bc6-420a-ad50-afd73500c31e
- Correlation: ai-main-voice-50a7b9de02160086ea9e934e27ceb4bf05ec60455fb80cda71fe3f66a08ce51a

The final task/contact/work restrictions remain in the reviewed note. The
original spoken text remains in the intake audit separately; it was not silently
rewritten as if the ASR model had returned the corrected text. No task, customer
contact, appointment, billing or work is approved or performed by this note.
No financial outcome or revenue rescued is established. No permission, credential
or runtime/generation change was needed to process this result.

The latest unchanged-runtime offline suite is 292/292 and both Worker dry-run
builds previously passed; they were not rerun for this evidence-only recording.
The exact receipt/closure verifier above passed. No additional model, ASR, HubSpot
or email call was made by Codex to verify the receipt or close the window.
All earlier captures, failed windows, timing correction, human decisions and
accepted task-demo evidence remain unchanged. Main is not merged or modified.
