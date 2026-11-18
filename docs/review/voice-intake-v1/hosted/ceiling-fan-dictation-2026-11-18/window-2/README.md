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
