# Remaining hosted demo checks — prepared, not executed

Source gates and human acceptance are separate. Perform these checks only after
the new v2.6 packet is accepted and the specific hosted scope is authorized. Use
the existing demo gateway, namespace owner and synthetic portal/contact; do not
create infrastructure or restart Cloudflare Access setup. No new credential is
requested unless an actual check identifies a specific failure.

## 1. Closed deployment and read-only operator walkthrough

- Read current Cloudflare metadata first. Preserve existing Secret bindings,
  ordinary Access/role/tenant settings and the existing CertificationLedger
  namespace. Owner `keep_vars:false` means its dashboard-only ordinary settings
  must be reconciled into a temporary reviewed configuration before deploying;
  do not silently erase the role mapping or email route settings. Never put
  secret values in that file or Git. No migrations/new resources are required.
- Deploy only the reviewed gateway/owner source with all CRM/general/test/fault/
  email/release flags false; keep owner hostname and all previews disabled.
  Verify actual active code/version hashes, binding/class/namespace and disabled
  controls. Source dry-runs are not evidence of the deployed configuration.
- Through the existing Access app, verify identity/Approver role, both credential
  portal IDs, the designated contact/marker and task-read ability. Evaluate the
  existing synthetic note and inspect its finding, source, evidence and bounds.
  Prepare a preview only if needed; do not approve or submit a task in this phase.
- Verify HIGH/Immediate Review presentation and restart/readback with the current
  contract. Record exact deployed hashes and operator receipts. Stop on any
  credential, portal/contact, identity or source mismatch; do not broaden scopes.

## 2. Bounded operator email delivery

After separate delivery authorization, verify the existing Resend Secret and
verified sender without exposing values. Limit recipients to the selected test
operator: `janie@aiandmain.ai`, From `alerts@aiandmain.ai`, Reply-To
`janie@aiandmain.ai`. No customer email is authorized. CRM writes remain off.

Capture the alert fingerprint, durable outbox record, provider ID and actual inbox
receipt for a labelled synthetic HIGH/Immediate finding. Reprocessing the same
material must not send another alert. Any retry/uncertainty must preserve its
idempotency key and remain within the documented provider retention window;
otherwise block for resolution. Keep old alerts from being backfilled. Disable
delivery after the bounded test unless ongoing demo activation is separately
accepted. Existing local tests cover both HIGH and Immediate routing; report
which paths are actually exercised remotely rather than claiming both from one.

## 3. One new synthetic recovery exercise, if authorized

The existing confirmed task `420072115944` and its operation must remain intact.
Do not reset that operation, reuse its expired approval or create a duplicate to
test recovery. Use a genuinely distinct labelled synthetic control need on the
designated contact. If a new note is needed, the human adds it in HubSpot; no
note-write permission is added to the agent.

The operator reviews the current finding, selects a fresh **internal** due time,
inspects the complete final HubSpot payload and issues a separate exact approval.
Then open only a bounded demo execution/fault window for that operation. Record
operation/correlation, approved hash/version and the durable pre-POST state.
After one create, deliberately discard the response using the existing
operator-only control. Capture the persisted discard marker before reset.

Close execution/fault flags, redeploy/restart the same namespace, and reconcile
read-only by correlation, complete task properties and contact association. Expect
one remote task ID and one create attempt; repeat reconciliation must return it
without POST. Unknown, absent, ambiguous or mismatched results stay blocked and
must not produce a second create. Record the new boot/deployment IDs and exact
trace; label the fault **injected**, not a natural network outage.

Verify a changed-payload approval is rejected without another create. Keep task
creation, opportunity value and verified financial outcomes separate. No revenue
rescued is established by this test. Finish by verifying all test/fault/write
flags are disabled and preserve all receipts, including any failed check.

## Final user acceptance

Present one linked evidence table for the current deployed version: source/model
results, semantic decisions, read-only operator flow, actual email delivery if
executed, exact-payload approval and recovery traces/task ID/create count if
executed, and final disabled flags. Unexecuted items remain PENDING. The supported
claim stays “controlled prototype with tested local safeguards” until these
bounded hosted results are demonstrated and accepted. No automatic main merge,
real-customer onboarding or production writeback follows.
