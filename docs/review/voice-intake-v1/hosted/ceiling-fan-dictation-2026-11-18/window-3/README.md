# Third window — same unchanged and unused exact approval

The full current user-supplied intake receipt is preserved in
operator-before-window.json with attribution in receipt-provenance.json. It is
APPROVED revision 2, createAttempts 0, remoteNoteId/executionWindow null, same
original/reviewed text, payload bf133090…, action 9dd9d9b2… and original grant
db6b6e7c…. It matches source 94dfdeb and verified window-2 closed owner b0a776a9.
The same approval expires November 19 at 10:09:30 a.m. Eastern. No transcript,
approval or durable count is reset. This is user-pasted evidence, not a signed
attestation or independently downloaded JWT.

The controller's numbered artifact selector now keeps each successive window
in its own directory and requires the immediately preceding verified closure
and matching current receipt before enabling. Missing, attempted, changed,
unknown, saved or expired input blocks. Existing runtime guards are unchanged:
one exact intake/grant/payload, at most 30 minutes, maximum one durable create
attempt across all windows. New selectors do not grant another create.
All 292 offline tests pass. No Worker code, reasoning/model/settings/schema,
final note payload, credentials, permissions, host, namespace or email setting
changed. No fresh ASR/model call or CRM/email call is required by this controller.

Only a real operator may Save once after actual enable verification. On any
result or expiry, close FIRST using:

```sh
NODE_USE_ENV_PROXY=1 node scripts/voice/note-window.js --close --user-authorized --window-3
```

Preserve the actual result; reconcile read-only if unknown, never create again.
Original windows, failures, timing correction and prior closures stay unchanged.
Hosted note creation and voice feature release acceptance remain pending until
actual evidence/review; task/general/fault/release controls stay false.
