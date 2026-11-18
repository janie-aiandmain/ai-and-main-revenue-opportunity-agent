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

## Third window actually verified open

[note-window-enable.json](note-window-enable.json) verifies both Workers'
configuration activation and unchanged active module bytes, Secret names,
namespace, identity/tenant/email/host/preview settings. All nine task/fault/
general-release controls remain false. Both unauthenticated voice routes
redirect to Access. The controller made zero CRM/model/email calls and zero
note submissions; no Worker-code deployment was needed.

Run `voice-note-run-e9a78a1c-e5ad-44a3-8019-b41f5ab78160` expires November 18 at
7:05:54 p.m. Eastern (2026-11-19T00:05:54.364Z). Its duration is exactly thirty
minutes. Only the same unused intake, original grant and bf133090… payload can
execute. The durable one-attempt cap applies across windows; no approval/count
is reset or renewed. The real operator is asked to refresh, Load and Save once.
Actual hosted note creation and its permission remain PENDING until a Save result.

On any result/error/expiry, close using --close --user-authorized --window-3
before further steps; preserve result and reconcile read-only if unknown.
No task, customer action, email or general feature release is authorized.
