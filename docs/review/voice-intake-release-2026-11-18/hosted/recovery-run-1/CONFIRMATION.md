# Hosted injected note-loss recovery — confirmed

**Real HubSpot note 426418751203, one create attempt, same original exact
approval/payload, recovered by read-only reconciliation after a hosted restart.**
All three note switches and all nine task/general/legacy-fault switches are
verified false on both Workers. The separate normal ceiling-fan note
426427657968 remains consumed and untouched. No additional Save or recovery
click is required for either intake.

| Step actually executed | Evidence | Result |
| --- | --- | --- |
| Human recorded/reviewed/approved NEW synthetic recovery note | operator-transcribed.json / operator-approved-note.json; source94dfdeb | Exact grant, one ASR call, zero initial attempts |
| Authenticated operator chose explicit recovery Save on source367621d | Complete original request/payload38bcfb54… / actioncc6b1333… / grant5429433f… | Fixed portal247646122/contact582095692487, source time retained |
| Durable armed fault and POST intent | 2026-11-19T00:23:34.528Z | Persisted before one create |
| Deliberate application response discard before success/ID recorded | 00:23:34.906Z | Injected test, NOT a natural outage |
| Actual hosted Durable Object restart | Copied pre-boot48e80e4c… → post-loss8bbd0ca9…; same owner deploymente3b12a88… | Constructor trace at00:25:14.635Z; NOTE_UNKNOWN, remoteID null, attempts1 |
| Explicit close on BOTH Workers | note-window-close.json at00:26:52.219Z | Three note switches and nine task/general switches all false |
| Real operator read-only reconciliation | 00:30:56.609Z → strict match00:30:58.249Z | NOTE_CONFIRMED, remoteID426418751203, attempts STILL1 |
| Persisted operation after config restart | Recovery boot877698de… under closed ownerfb54487b… | Original grant/request/correlation/fault marker retained |
| Final independent Cloudflare readback | final-config-readonly.json | Same source/module bytes/Secrets/binding names/namespace/host and all switches off; anonymous routes redirect to Access |

All UTC times above occurred November18 in America/New_York (POST7:23 p.m.,
restart7:25 p.m., closure7:26 p.m., match7:30 p.m. Eastern). The original
recording was6:48:36 p.m. Eastern and was not renewed by testing.

The known deployed strict handler found ONE candidate with the exact correlation,
complete body/timestamp and designated-contact association. No second create
was attempted. This is a real hosted HubSpot effect with an intentionally
injected application fault; it is not merely a local mock and is not evidence
of every possible real outage. Absent/ambiguous/mismatched/unavailable lookup
negatives were executed locally and remain separately labelled.

## Binding / attribution

- Intake: voice_97c46fc9fed04c915710b946da30c37d24cfcea2939558c9825f75f3e91ffb1d
- Correlation: ai-main-voice-97c46fc9fed04c915710b946da30c37d24cfcea2939558c9825f75f3e91ffb1d
- Payload: sha256:38bcfb5450333b1ff0757352e751b44e24f496db065b42f8d964dd715f17537d
- Action: voice-note-action-v1:sha256:cc6b1333e049b08fa0ec04cffea8106e5b8bd955070911d70bbea826d292becf
- Original approval: voice-approval_5429433f-f84f-46d4-8f9c-14563523eb9f; unchanged, not renewed
- Fault policy: exact-note-response-discard-restart-v1
- Hosted runtime source: 367621d5d3b60cb0415c3f8a544abf3861c7d6a7

Raw uploaded loss/reconciliation bytes, normalized JSON and provenance are
retained separately. Only a missing leading object brace was added to parse
each field list; no field value changed. The pre-boot UUID was copied by the
user, not independently downloaded. These are operator-supplied hosted receipts
matched to actual deployed module/configuration evidence and the known handler;
no signed attestation, independent HubSpot download or JWT inspection is claimed.

Reproduce offline at this evidence commit:

```sh
node scripts/voice/verify-recovery-receipts.js --loss
node scripts/voice/verify-recovery-receipts.js --complete
```

The latest source367621d has302 offline passes,207 retained workflow passes,
both dry-run builds, native local actual-abort recovery, and a current normal
Chromium/workerd UI regression pass. The browser/local fixtures create simulated
effects, never live CRM/model calls. Five captured v1.2 reasoning outputs have
actual user semantic PASS in ../../adjudication; no new reasoning/prompt/schema/
model change occurred. One new hosted ASR call was used for this control.

A separate final controlled-demo release decision remains PENDING. No task,
customer contact, scheduling, billing, work, financial outcome or customer rollout
is authorized by this note or recovered effect. Main remains unchanged.
