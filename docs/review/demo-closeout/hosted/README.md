# Hosted closeout — closed deployment verified

The user approved all eleven v2.6 semantic cards/five negative controls, then
separately directed proceeding with hosted deployment, email activation and task
execution. [Authorization](authorization.json) bounds this to the existing demo
Workers and synthetic portal/contact, at most one new task, with a real operator's
exact final-payload approval still mandatory. General writeback is not authorized.

## Executed

Both Workers now run reviewed source `32c14912520c6cb2175e20921caecbb8d03505b2`,
with 100% traffic on the verified versions:

| Existing Worker | Deployed version | Result |
| --- | --- | --- |
| ai-and-main-revenue-opportunity-agent | 262b43bc-8111-405d-8862-37d0f22e21d6 | PASS code/settings/Access verification |
| ai-and-main-revenue-opportunity-staging | a9c4dda8-9cb9-44ef-a626-60af8b20b8b5 | PASS code/settings/namespace verification |

[Direct Cloudflare verification](closed-deployment-verification.json) compares
downloaded active module hashes with the exact deployment bundles. Source
reasoning remains v0.3.11 / proposal v2.6; no output-generation change was made
after the accepted packet. The existing SQLite namespace
`16dca25759494a33813d2800f3f1a850` and CertificationLedger class are unchanged.
The gateway's external binding still points to that owner/namespace.

All eight gateway and four owner Secret names are preserved as Secrets. No
secret values were retrieved, printed, copied or replaced. Your verified
Approver mapping remains on the gateway, which validates the real Access actor
before invoking the private owner binding. The owner has no public hostname;
it does not need a duplicate public Approver mapping. Issuer/audience settings
are unchanged, and all preview URLs remain disabled.

Five unauthenticated checks (`/identity`, `/operator`, findings, execute and the
legacy write path) return HTTP 302 to the existing Access login. All CRM/general/
test/fault/release controls and operator email remain false. No new namespace,
Worker, credentials, scopes or Access application was created. The initial
sandbox proxy EPERM was resolved using the allowed execution path; Cloudflare
access and deployment then succeeded. No business-service request was used for
these deployment checks.

Owner configuration now preserves dashboard ordinary settings with `keep_vars:
true` and records the selected Resend route with delivery disabled. Role/tenant
settings were merged into private temporary deployment configuration; secret
values are absent from those files and from Git. See the
[before-deployment receipt](before-deployment.json), the two dry-run/deployment
logs here, and the [progress status](status.json).

## Current operator action

Refresh the existing demo `/operator`, sign in through the existing Access app,
and click **Check connection (read-only)**. Its receipt must verify both existing
credentials belong to portal `247646122`, contact `582095692487` retains the
synthetic marker, task reads work, role is Approver and writes remain disabled.
It should identify the new owner source/version above. Share the receipt only,
never a JWT, cookie or credential. This is authentication/isolation verification,
not another semantic decision or task approval.

Then perform one read-only evaluation with email still disabled. This validates
the hosted model and seeds the outbox's existing-finding fingerprint state so
enabling email does not backfill alerts for old findings. Do not add new test
notes before that baseline or approve/submit an old confirmed task.

Once preflight/baseline pass, enable the already configured operator email and
use new clearly labelled synthetic needs to verify actual inbox delivery and
deduplication. The existing Secret is present; provider validity/delivery remain
unverified until an actual send succeeds. No new key is requested in advance.

For the one-task recovery exercise, prepare a genuinely new synthetic finding,
select a future internal staff due time, inspect the complete final request and
click **Approve exact task** in the console. A chat statement is not that exact
grant. Only then open the bounded one-create/response-loss window. Preserve the
existing confirmed task `420072115944` and its operation. Never reset it to
produce another create. The [prepared hosted checklist](../HOSTED-CLOSEOUT.md)
defines the recovery evidence and final closure checks.

## Pending / not claimed

- Authenticated read-only preflight and current hosted model evaluation.
- Email activation, actual Resend provider receipt/inbox delivery and remote
  duplicate-suppression check.
- Exact approval for a new final task payload, one new task/restart/reconciliation
  demonstration and the durable injected-discard marker.
- Final user acceptance of those hosted results.

No new HubSpot task or email has been created in this deployment phase, and no
new hosted model call or recovery exercise is claimed. The 306 recorded source
evaluation calls remain separate from any subsequent operator-driven model use.
No revenue outcome is established. Main remains unmerged.
