# Second window for the same unused exact note approval

The user supplied the full current intake receipt after read-only Load saved
intake. [Receipt](operator-before-window.json) still shows APPROVED revision 2,
zero create attempts, null remoteNoteId, null executionWindow, one transcription
call, unchanged original/reviewed text and original approval. It matches the
verified closed owner 1c3c72d0 and source 94dfdeb. [Attribution](receipt-provenance.json)
identifies this as user-pasted evidence, not a signed or independently downloaded
attestation. The shorter first pasted preview is not a complete status receipt.

The exact request/hash/action/grant are unchanged: payload bf133090…, action
9dd9d9b2…, approval db6b6e7c…. No transcript, approval, attempt count or earlier
window is reset. The original grant still expires November 19 at 10:09:30 a.m.
Eastern. A separate at-most-30-minute operational window may cover ONLY this
unused note. Unknown, attempted, previously saved, changed or expired notes
cannot use this path. Original first-window and closure evidence stay unchanged.

The controller selector `--window-2` keeps this plan, enable/resume/close records
in this directory. It checks the current receipt against the original grant and
prior verified closure, then checks live Cloudflare code/bindings/closed versions
before opening. Runtime code still revalidates the real operator, exact grant,
current tenant, fixed contact, complete payload, expiry and zero attempts before
its single POST. A new operational run never grants another create for an intake
whose durable attempt count is already nonzero. No user identity is synthesized.

Use the real operator Save once only after verified enable. On any resulting
receipt/error, CLOSE FIRST using:

```sh
NODE_USE_ENV_PROXY=1 node scripts/voice/note-window.js --close --user-authorized --window-2
```

Then preserve the result and reconcile read-only if necessary; never retry create
after an unknown outcome. No runtime module, prompt/model, schema, credentials,
permissions, infrastructure or source note payload changed for this controller
update. No new ASR/model/CRM/email call was needed. General/task/fault/release
controls stay false. Hosted Save evidence remains PENDING until supplied.

## Timing defect rejected and closed before asking the operator to Save

The first window-2 attempt is preserved in note-window-enable.json. Separate
clock reads produced a duration of 1,800,001 ms, exceeding the runtime limit by
one millisecond. The guard correctly rejected it; no Save was requested and the
controller made zero CRM/model/email calls. Both runtime switches were rolled
back and verified closed on both Workers. This is a controller scheduling defect,
not a HubSpot credential failure or a remote note-write test.

The controller now derives both timestamps from one clock reading and validates
the complete proposed configuration before any PATCH. For this already recorded
run, resume may ONLY shorten the end to start plus exactly 30 minutes; it keeps
the same run/intake/grant/payload/one-create limit, never extends the deadline,
and writes the original/corrected plans in note-window-timing-correction.json
without changing note-window.json. An expired plan cannot be revived. The worker
code and policy remain unchanged. The invalid interval could not authorize a
create through either deployed guard.

The corrected offline suite passes 289/289, including single-clock timing,
shorten-only/no-renewal controls and expired/future-start rejection. Earlier
286-test results, operator receipt and failed enable report remain unchanged.
No new model/ASR call, source payload change or approval renewal is needed.

## Same run actually resumed and verified open

[note-window-resume.json](note-window-resume.json) verifies corrected activation
on both existing Workers with identical active module bytes, Secret names,
namespace, identity/tenant/email settings and host/preview state. All nine
task/fault/general-release controls remain false; unauthenticated voice page and
submit requests still redirect to Access. The controller made zero CRM/model/
email calls and zero note submissions. No runtime deployment was needed.

Run voice-note-run-ace7c329-5734-4cfe-83bb-e94623d00f8b is open until November 18
at 6:26:54 p.m. Eastern (23:26:54.109Z). It is the same second run, shortened
by one millisecond from the rejected plan, not a fresh approval or renewed
deadline. note-window-timing-correction.json preserves both plans. Only the
original note intake/grant/payload can execute, with the existing durable
one-attempt limit. The real operator has been asked to Load and Save once.

Hosted note creation/permission/readback remain PENDING until a real Save result.
On that result, close with `--close --user-authorized --window-2` before further
steps. Preserve old evidence and current status; unknown outcomes reconcile only.
Do not reset counts, send a Codex POST, ask for another transcription, transfer
this grant to a changed payload or imply feature release acceptance.

## Second window expired; explicitly closed before resuming

The user asked to resume after the 6:26 p.m. Eastern deadline. Runtime expiry
already blocked new creates. [Actual closure](note-window-close.json) verifies
both note switches false on BOTH Workers and all nine task/fault/general-release
controls false. Active code, Secrets, namespace, identity/tenant/email/host/
preview settings and Access protection remain unchanged. The controller made
zero CRM/model/email calls and zero note submissions. The closure report retains
the original plan timestamp ending .110Z; actual effective expiry was .109Z,
as separately preserved in note-window-timing-correction.json and the verified
resume record. Neither earlier artifact is overwritten.

No actual Save result has been supplied since the valid second window, so do
not infer that the intake is still unused. The user has been asked for fresh
read-only Load saved intake evidence before another window. If already confirmed,
reuse the result; if attempted or unknown, reconcile read-only, never create again.
No new recording, preparation, approval or model call is presently needed.
