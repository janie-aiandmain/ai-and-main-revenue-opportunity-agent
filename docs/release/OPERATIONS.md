# Supported use and operations

This release candidate supervises evidence-backed findings and prepares bounded
HubSpot follow-up tasks. HubSpot owns contacts, notes, customer history, deals,
pipelines and tasks. Customer communication, scheduling, billing and service work
are not authorized by an internal task. Estimates and task creation are not
verified revenue; outcome attribution requires separate evidence and a deduplicated
outcome record.

## Existing demo account setup

Use only portal **247646122**, contact **582095692487**, with the required synthetic
marker. No separate production HubSpot portal exists according to the user;
do not invent an exclusion ID or infer live business use from Cloudflare's
“Production” version label.

- **Demo gateway:** `ai-and-main-revenue-opportunity-agent`; public hostname protected
  by the existing All traffic Access application. Preview URLs remain disabled.
- **Namespace owner:** `ai-and-main-revenue-opportunity-staging`; hostname/previews
  disabled. `CERTIFICATION_LEDGER` owns the existing SQLite `CertificationLedger`.
  The gateway uses the supported external `DEMO_RECOVERY_LEDGER` class binding.
  Do not create another namespace or change its migration to repair credentials.
- **Settings → Variables and Secrets → Secret:** owner expects
  `STAGING_HUBSPOT_READ_TOKEN`, `STAGING_HUBSPOT_WRITE_TOKEN`, `EVAL_OPENAI_API_KEY`.
  Configure existing credential values from their secure original source, never
  Service Key record IDs. Cloudflare cannot reveal an existing Secret value.
  Do not paste values in chat, logs, shell arguments, configuration files or Git.
- The original demo's `HUBSPOT_ACCESS_TOKEN` and `HUBSPOT_WRITE_TOKEN` are separate
  bindings. Their successful preflight does not prove the owner's bindings work.
  Do not copy, rotate, substitute or expand scopes automatically.
- **Settings → Variables and Secrets → ordinary settings:** issuer, audience,
  portal/contact allowlist, retention and execution flags. `keep_vars:true` on
  the gateway preserves dashboard role mappings. Owner ordinary settings are
  controlled by `wrangler.staging.jsonc`; Wrangler preserves its Secrets separately.
- **Bindings:** resource/class references only, not API credentials. Verify the
  deployed namespace ID and class before and after any deployment.

Sign in through the existing demo Access application. `/identity` returns a
verified subject after signature, issuer, audience and expiry checks. No JWT or
cookie needs to be shared. Map external subjects to **Viewer**, **Approver** or
**Admin** only; membership in an Access Allow policy alone is not task approval.
Use the demo's audience, not the namespace owner's audience. Keep the existing
restrictive policy; there is no need to resume separate staging Access setup.

Read-only preflight must verify **both credentials' portal identities**, allowlisted
contact and synthetic marker before any create. It reports missing/rejected
credentials, insufficient permission, portal/contact mismatch and blocked access
separately. A configured secret name is not evidence of validity. Test with
“Check connection (read-only)” first; model evaluation validity is checked separately.

Minimum capabilities are the existing account-identity read plus designated
contact/notes/associations reads for the reader; bounded task creation plus task
property/association reads needed for reconciliation for the writer. Actual
permission names depend on the HubSpot service-key product. Existing original
credentials have passed identity checks; do not request new keys or wider scopes
without a specific rejected operation and an explicit decision.

## Normal operator flow

Evaluate → review evidence/current status/limits → prepare a final task with
explicit internal due time → inspect the complete preview → approve → submit.
Relative customer deadlines remain tied to the source timestamp; an operator
task due time cannot renew an old customer deadline. Unknown status stays unknown.

Approval binds to the exact final properties, due time, portal/contact association,
correlation and payload version, together with source/finding/review versions,
verified actor identity and 24-hour validity. Material changes invalidate it.
The Worker rechecks current source and grant immediately before POST. A semantic
PASS on a captured draft is never execution approval for that final request.

Blocked findings remain blocked. Source identity ambiguity requires explicit
finding-identity review through the protected API; the current console does not
yet provide a dedicated identity-adjudication form. This is a supported-use/UX
limitation, not permission to clear the registry or merge different needs.

## Controlled hosted validation, still outstanding

Keep `CRM_WRITEBACK_ENABLED`, `ENABLE_TEST_TASK_WRITES`,
`ENABLE_GENERAL_EXECUTION`, `GENERAL_RELEASE_APPROVED` and the three legacy
`DEMO_RECOVERY_*` flags false. New `DEMO_ONLY_EXECUTION_ENABLED` and
`DEMO_RESPONSE_LOSS_TEST_ENABLED` default false on both Workers.

Only after credential/contact/identity preflight, deploy and verify the exact
candidate source in the existing two Workers. Do not race an operator's dashboard
secret save. The prepared demo-only executor supports a short-lived, at-most-three
durably budgeted synthetic run on the designated contact; prefer one task for this
cycle. It requires a fresh human review and exact-payload approval. No corpus
verdict is bypassed. The fault control is operator-only and one-use; it deliberately
discards a successful response before recording success. It is an injected
application fault, not a genuine network outage.

Record final approved payload/hash/version, durable pre-submit trace, actual
HubSpot task ID/contact association, boot/version IDs and create-attempt count.
Restart/redeploy, then reconcile read-only. Repeat submission must reuse that
operation, not create another. Disable both demo-only flags immediately afterward
and verify active versions. Do not report this scenario as executed until these
receipts exist; the current package contains only earlier hosted controls and
current local tests.

## Uncertain writes and incident response

Persist operation ID, correlation, exact request and SENDING intent before create.
After timeout/interruption, reconcile all contact-associated candidates and all
pages against correlation, task properties and contact association. Absent,
ambiguous or mismatched results stay blocked. Never use a known ID to hide a
second candidate, reset the operation or automatically POST again.

An Admin can record audited terminal `ABANDON_UNCERTAIN` resolution with a ticket
reference. This does not authorize a replacement create. Preserve the receipt,
ledger and idempotency tombstone; investigate the remote task in HubSpot. On a
credential or service incident, close execution first and replace credentials only
through a separately authorized secure procedure. Never print upstream bodies or
authorization headers to diagnose failure.

## Retention, deployment and rollback

Audit metadata defaults to **365 days**, configurable `AUDIT_RETENTION_DAYS`
(1–3650). Daily pruning preserves unresolved safety/audit holds. Operational
source anchors, exact operation payloads, outcome deduplication and idempotency
tombstones remain while the deployment operates; audit TTL is not an automated
delete policy for those records. Define lifecycle deletion/backups with client IT
before real customer use. Store minimal context necessary for evidence and exact
approval; do not build a duplicate CRM history store.

Deploy explicit configs only: gateway `wrangler.jsonc`, owner
`wrangler.staging.jsonc`. First run tests and both dry-run builds; record source
SHA and verify deployed module hashes, bindings, secret **types/names**, disabled
flags and unauthenticated redirects. A version label alone is insufficient.
Never dump binding values. Keep the same class/migration/namespace.

Rollback begins by closing all execution/fault flags on both Workers. Retain
durable operation state and investigate SENDING/UNKNOWN records read-only.
Redeploy a reviewed compatible code/config version with writes still disabled;
do not blindly restore earlier settings that enabled legacy writeback. Never
delete/recreate storage, discard uncertain intent or rerun old creates to recover.
Reverify Access, tenant identity, state compatibility and actual deployed code
before any separately approved execution window.

## Real customer onboarding and release

Use a separate single-tenant deployment per client with its own credentials,
configuration, external identity application/role mapping, storage and audit data.
Use test records first, approved portal/contact boundaries, minimum verified
capabilities, provider data/PII terms, documented retention and incident owners.
No shared demo credentials or AI/test identities qualify as customer authentication.
Customer IT and the operator own their identity/scopes/source-data approvals;
AI & MAIN owns tested code, bounded-action policy, monitoring and release evidence.

Final customer promotion remains blocked until the acceptance matrix, actual
hosted end-to-end evidence and attributable final human acceptance identify the
same exact candidate. No automatic production promotion or merge to `main`.
