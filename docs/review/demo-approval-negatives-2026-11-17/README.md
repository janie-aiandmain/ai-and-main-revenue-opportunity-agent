# Existing-demo approval rejection validation

The user selected the **existing synthetic demo**. No pilot data, customer portal,
new Worker, new namespace or additional task creation is needed for this cycle.
The completed [garage recovery](../demo-closeout/hosted/garage-recovery-2026-11-16/CERTIFICATION.md)
and existing EV task are preserved; neither consumed operation is reopened.

The smallest added capability is an authenticated demo diagnostic. It routes to
`approval-negative-fixtures:negative-<UUID>` inside the existing namespace, verifies
that exact object ID, and refuses populated operational storage. It invokes the
unchanged production approval validator using synthetic grants and an injected
non-network client. All nine live execution/fault/release controls must be false
in both Workers. It never reads CRM notes, calls a model, sends mail or creates a
HubSpot task. It cannot be enabled for another portal/customer configuration.

The distinction matters: a closed writeback gate alone cannot establish that an
expired or changed approval would be rejected. This test reaches the actual core
approval checks with a simulated executor; the live execution gates stay closed.
Invocation identity is separately recorded. Synthetic test grants are **not human
sign-off**, and simulated effects/failures are **not hosted CRM effects/outages**.

| Existing-demo gate | Current status | Evidence |
| --- | --- | --- |
| Reviewed evidence/recommendations | Preserved PASS for exact accepted outputs | [Six hash-bound decisions](../demo-closeout/synthetic-label-correction/adjudication/README.md); no generator change here |
| Exact-payload approval and remote recovery | Preserved demonstrated result | Garage task 424319510263; one create, deliberate application response discard, restart/reconciliation; not a natural outage |
| Core rejection matrix | PASS locally: 38/38 | [Node SQLite report](offline-matrix.json): 37 negatives, zero create escapes; valid repeat control one simulated create |
| Worker isolation/auth/routing/report persistence | PASS locally | [workerd report](local-worker.json): operational-root refusal, Viewer/expired synthetic JWT/spoof/cross-origin blocks, cached report survives restart, zero external network calls |
| Source regression/builds | PASS | [Validation summary](validation.json): 233 tests, 207 retained workflow executions, review integrity, both dry-run builds |
| Actual closed hosted deployment | PASS | [Owner readback](deployment-owner.json), [gateway readback](deployment-gateway.json), [Access check](access-check.json): actual active module hashes match the tested bundle; all nine switches false; identity/tenant/bindings/Secret names/ordinary settings/hostname state preserved |
| Actual hosted rejection-fixture invocation | PENDING authenticated operator | New console button runs the matrix with no CRM action. Local Worker execution is not this gate |
| Final demo release acceptance | PENDING human decision | Does not grant general writeback or certify real-customer deployment |

## What the matrix tests

The [immutable versioned fixture](../../../fixtures/approval-negative-v1.json)
contains a valid repeated-submission control; missing, revoked, expired and
future-issued grants; identity/review/contract mismatch; corrupted or materially
changed payload/action data; every final-request field; changed review, source
and classification; and uncertain outcomes with absent, duplicate, mismatched or
unavailable simulated lookups. Every negative must produce its specific expected
rejection or blocked UNKNOWN trace. An unrelated exception is a test failure.
The valid control must reach the injected create exactly once on repeat execution.

Reports contain fixture/policy/approval-contract hashes and simulated create
counts. Fixture operational rows are cleaned in that isolated object after each
case. A durable COMPLETE report is returned on the same run ID without rerunning;
an interrupted RUNNING record cannot be silently restarted. No real operation
IDs, approvals, source records or email outboxes are changed by these fixtures.

## Reproduce and inspect

```sh
npm run approval:negative:offline
npm run approval:negative:worker
npm test
npm run regression:offline
npm run review:current
npm run check
npm run staging:check
```

The Worker/native suites require permitted local subprocesses/loopback sockets.
The sandbox initially blocked them; the same commands passed with the authorized
local execution permissions. No dependency or test expectation was weakened.

No reasoning, schema, materializer, task, proposal, approval or identity contract
changes. [Contract/source hashes](contracts.json) identify the new diagnostic.
Fresh model inference is not needed for an unchanged generator; none was run.
Passing retained captures is replay, not a new model evaluation.

## Verified deployment and next human action

Both existing Workers now run source
`bef3d71276b94c7d398225487c2ecbc36f35bd71`:

- Private owner: `3586b7d5-0ce4-42f2-baef-5f1a744443e5`.
- Demo gateway: `f7ae2b0f-07f1-467d-b7cd-fe8eab47b0fd`.

Each is active at 100% with downloaded JS module hashes matching the local upload
bundle. The same `CertificationLedger` class/namespace remains bound; no migration,
namespace or Worker was added. Owner hostname and all previews stay off. Gateway
Access redirects unauthenticated console, identity, findings, diagnostic, execute
and legacy-write requests. Operator email stays enabled only on its prior owner
configuration; no email was sent for these checks. All nine execution/fault/release
flags remain false. [Deployment notes](DEPLOYMENT.md) retain the transient verifier
failure separately from the successful activation/readback.

Open the existing [operator console](https://ai-and-main-revenue-opportunity-agent.ruddy4learning.workers.dev/operator),
sign in, and click **Run approval safety checks — no CRM writes** once. Share its
result JSON; do not Evaluate, Prepare, Approve or Submit a task. This records a real
authenticated invocation of hosted **synthetic** tests, not real human approvals
inside the fixtures. Release acceptance remains a separate review of the exact
deployed version and evidence package. No pilot data is required.

## Remaining limits

This is a controlled demo, not an independent or universal certification. Local
expired-token and role tests plus actual Access protection do not demonstrate
every real identity-provider/session failure. The new hosted matrix, when run,
uses the real deployed core but a non-network effect stub. It does not replace the
preserved actual HubSpot recovery proof. No financial outcome or revenue rescued
is established. Customer identity/retention/onboarding and permitted CRM records
need a separate customer deployment review; no such rollout is approved here.
