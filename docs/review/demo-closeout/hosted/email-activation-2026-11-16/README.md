# Operator email activation

The operator supplied the existing operation's current evidence. Its original
request/payload hash is unchanged, task `420072115944` remains CONFIRMED and its
create-attempt count remains one. The original pasted bytes are preserved beside
the parsed JSON. The original November 11 task body is not presented as a fresh
finding or a new approval.

A November 16 `FRESH_FINDING_OR_SOURCE_CHANGED` event establishes that the new
evaluation transaction committed. In the verified deployed source, this event
and the email fingerprint observation are in the same transaction. Together
with the operator's disabled-email/empty-outbox receipt and direct configuration
checks, this supplies the missing baseline evidence. No additional model call
is needed just to establish it. This proves the baseline path, not a complete
semantic assessment of the unprovided fresh finding text. See
[baseline-assessment.json](baseline-assessment.json).

Email activation was already explicitly authorized. The prepared change enables
only `OPERATOR_EMAIL_ENABLED` on the existing namespace owner, with Resend From
`alerts@aiandmain.ai`, To/Reply-To `janie@aiandmain.ai` and the existing protected
console URL. It reuses the existing Secret and namespace, preserves all ordinary
identity/tenant settings, and keeps all CRM/test/fault/release controls false.
No new key, permission, namespace or Worker is requested. Before/after provider
receipts distinguish actual deployment from preparation and delivery testing.

Email enabled/configured is not proof of a successful send. The next step is two
new clearly labelled synthetic needs, added manually to the designated HubSpot
record without changing the old note/task. A current evaluation should trigger
one HIGH alert and one Immediate Review alert. Actual provider IDs, inbox receipt
and duplicate suppression must be recorded separately. No task may be submitted
until its complete final payload has a fresh operator approval and the bounded
one-create test window is opened. General writeback remains disabled.

## Actual activation result

Deployment completed on November 16, 2026. The private owner is active at
`6f5dfca9-9cda-45ad-822e-b4b15ba458a0`, source commit
`ef70b07` (full SHA in the verification receipt). Email is enabled only on the
private owner; its four Secret names, existing ledger namespace, identity realm,
portal/contact settings and disabled hostname/previews were preserved. All nine
CRM/test/fault/release flags remain false on both Workers. The public gateway
deployment is unchanged. Deployed JavaScript module hashes match the previously
verified closed deployment: this activation changed configuration only.

See [after-activation-verification.json](after-activation-verification.json),
[deployment log](owner-deployment.txt), [dry-run log](owner-dry-run.txt) and
[read-only verification script](verification-script.mjs). The script reads
binding metadata and hashes deployed JavaScript; it does not read stored Secret
values, call HubSpot/model/email APIs, or mutate deployments.

**Delivery remains pending.** No provider delivery ID or inbox receipt is yet
available. Two new, separately labeled synthetic notes must be added manually
and evaluated once by the signed-in operator to test HIGH and Immediate Review
alerts. The existing EV note and confirmed task must remain unchanged. No new
task create, execution approval or release acceptance is recorded here.
