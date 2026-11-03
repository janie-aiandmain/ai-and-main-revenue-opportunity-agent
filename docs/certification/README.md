# Staging certification evidence — not certified for live writeback

This cycle adds the smallest separate certification path on `enterprise-hardening`.
It reuses the existing source-anchored correction ledger through a storage adapter,
binds grants to the complete final task request, and adds a persisted outbox with
read-only reconciliation. It does not change `reasoning-v0.2`, `findings-v0.2`,
`gpt-5.6-terra`, effort `low`, corpus expectations, HubSpot scopes, production
configuration, or the existing agent/CRM product boundary.

**No hosted deployment or HubSpot request was made.** The environment only has the
non-production evaluation credential. Cloudflare credentials, an isolated HubSpot
portal/designated contact, separate test read/write credentials and external Access
configuration are unavailable. The network policy does not permit the Cloudflare,
HubSpot or Access API hosts. Deployed production writeback state cannot be verified.
The legacy `/writeback-task` route is now unconditionally closed in source, including
when its old flag is true; this source guard has not been deployed to production.
The production Wrangler configuration, credentials and permissions are unchanged.

## Gate disposition

| Gate | Executed evidence | Status for hosted certification |
| --- | --- | --- |
| 1. Captured failures and adjudication | Original seven cases, source evidence, all five captured outputs each, prior assistant review and required correction/block frozen in versioned fixtures with hash tests. Actual local Worker rejects all seven with HTTP 423, including spoofed PASS input. | **PENDING** — zero human sign-offs |
| 2. Final-payload approval | Actual local Worker plus unit tests: final destination/portal, associations/type, all task properties, due date and correlation marker hashed before approval; stale, expired, cross-operation, A→B→A and post-read tamper attempts blocked. | **PENDING** — hosted identity and tenant untested |
| 3. Durable remote-effect recovery | Actual workerd/Durable Object SQLite, independent HTTP service with its own SQLite, four runtime restarts; created task/response lost, visibility delay, in-flight interruption, absent task and unavailable lookup tested. Never a second create for the same operation. | **PENDING** — no real HubSpot task IDs or hosted durability proof |
| 4. Fresh model/output validation | 31 fresh synthetic Responses API calls with frozen v0.2 settings; 31/31 automated decision checks pass. ST04 repeats its evidence/deadline failure; EN12 again adds an assessment option requiring scope review. Both new captures retained. | **FAIL** — assistant-observed unresolved semantic issue; human verdicts pending |

The statuses above do not turn local passes into hosted certification. Machine
results, assistant observations and human decisions remain separate in `gates.json`.
All 31 fresh outputs have pending human fields in `human-review.json`; no item is
human-approved. See the compact [human-review checklist](human-review.md).

## What actually ran

- **76 deterministic tests** (including all 60 prior tests): immutable capture
  integrity, source-anchored identity, independent needs, timing/completeness/scope
  guards, grant expiry/revision, post-read payload tampering, concurrent attempts,
  zero/multiple/mismatched/unavailable reconciliation and deduplicated outcomes.
- **Local workerd integration:** staging entrypoint, Durable Object SQLite, signed
  ephemeral RS256 test identities and a separate durable HTTP fixture. Missing,
  expired and forged identity and Viewer role escalation are rejected. These
  synthetic identities are not human sign-offs or a hosted Access certification.
- **Fresh model evaluation:** 31/31 valid outputs, 12 findings; classification,
  opportunity type, review requirement, count and evidence-isolation checks each
  31/31. False positives 0/21; false negatives 0/10. Automatic safety detectors
  flag zero failures; full semantic safety is **not established**. ST04’s omitted
  invoice qualifier and historical “today” remain visible despite this score.
  EN12’s additional assessment option is a concern requiring human scope judgment.
- **Usage:** 31 new calls; 27,407 input and 2,332 output tokens as returned by the
  provider. Only `EVAL_OPENAI_API_KEY` and `api.openai.com/v1/responses` were used.
  This is one fresh run, not a new five-run stability study. Prior 155 executions
  and all earlier evidence remain unchanged.
- **Fresh identity replay:** reconcile the prior 155 outputs and fresh 31 outputs
  in one reference registry: 12/12 opportunity slots reuse their durable identity,
  with 12 distinct opportunities. Raw model keys remain visible. This offline
  replay grants no semantic approval and executes no effects.
- **Legacy offline diagnostic:** 19/31 decisions, FP 6/21, FN 2/10; exit 1 remains
  an explicit known failure. These keyword rules are not the model and were not
  repaired or relabeled as passing. `npm test` is the full deterministic harness.
- Both the normal Worker and separate staging Worker dry-run builds pass. Nothing
  was deployed. `checks.json` records commands and exit status, including the
  deliberate review-required model runner exit 1 and failed legacy diagnostic.

## Final payload and approval protocol

`src/staging/worker.js` is the actual certification Worker entrypoint, with its own
Wrangler config, migration and per-portal Durable Object namespace. The production
entrypoint does not acquire a staging bypass. Test writes default to disabled.
Only four authored `CONTROL*` fixture scenarios may prepare tasks; arbitrary
contacts, model output or reviewed-case payloads cannot be submitted through this
route. There is no customer/profile, general task, notes, deals or pipeline API.
This is a constrained fixture certification path, not a finished general inference
→ approval → writeback integration. Fresh live CRM-note re-evaluation remains
unimplemented and is a promotion blocker for general writeback.

The extracted `CorrectionLedger` uses injected transactions; Node SQLite and
Durable Object SQLite exercise the same identity/invalidation code. Existing
sandbox-only methods are not exposed through Worker routes. Complete histories
and frozen captures are not bundled into the Worker; it stores synthetic control
anchors and minimal operation/approval/outcome metadata for this certification.

Contract **`hubspot-final-payload-v1`** canonicalizes the full final request envelope
(method, fixed HubSpot URL, portal ID and exact body). Its body includes every task
property, explicit operator-provided due date, complete contact association/type
and a preallocated correlation marker. `payloadHash` is SHA-256 of that envelope;
`final-action-v1:…` additionally binds the reviewed material semantics. A monotonic
revision prevents approval resurrection on A→B→A. Grants record operation/finding,
exact hash, revision, verified subject, identity kind and a maximum 24-hour TTL.
Due date is not the approval TTL and is not inferred as “now + 24h.”

Immediately before POST, after read-token/write-token tenant identity and contact isolation reads, the Worker rechecks
the stored hash, complete final target, material integrity, source/candidate hash,
revision, expiry and deadline, then persists `SENDING` + correlation/hash before
submitting those exact immutable body bytes. Any changed prepared payload/material/
source/candidate revokes approval or blocks submission; already-submitted operations
cannot be re-prepared. Both credentials must separately prove the designated portal through read-only
account identity checks; a write token from another portal or insufficient existing
identity-read permission blocks POST without expanding scopes. No new owner, association, due date, body text or marker is
appended after approval. Unit tests edit the stored payload during isolation reads
and prove zero POSTs. The local fixture verifies submitted bodies equal the
approved final bodies, not only that the calls succeeded.

Local test JWTs use ephemeral in-memory keys and a fixed invalid-domain issuer.
Hosted mode rejects those keys and requires external Cloudflare Access RS256 issuer,
audience and an explicit subject→Viewer/Approver/Admin mapping. It has not been
validated with a real identity provider. No user-management system was added.

## Persisted outbox and recovery evidence

`local-worker-evidence.json` contains final payload hashes/versions, request bodies,
correlation references, fixture task IDs and ordered recovery traces. Every ID
prefixed `fixture-task-` belongs to the local HTTP service, **not HubSpot**.
`realHubSpotTaskIds` is empty. In the successful execution:

- Created + response lost + hidden task: `UNKNOWN` after restart, one create;
  read-only reconciliation confirms the same task when visibility returns.
- Connection lost before creation: `UNKNOWN` after restart; zero tasks, one
  attempted POST. No proven match does not establish safe retry.
- Worker interrupted while HTTP response is held after persisted creation:
  startup reads `SENDING`, records `RESTART_RECOVERED_UNCERTAIN_NO_CREATE`, then
  reconciles the existing task; one create.
- Changed due date: different final hash; old grant rejected before any create;
  only a newly approved exact version creates its single task.

A task counts as reconciled only with one proven match on correlation, all expected
properties (including due timestamp) and exact contact associations. Missing,
multiple, mismatched or unavailable results stay blocked. The read-only scan is
bounded to 1,000 tasks; absence at that limit is never permission to create. There
is intentionally no automatic UNKNOWN→PREPARED transition or blind retry. Manual
resolution is a future audited workflow, not an override endpoint in this code.

The fixture and Worker use different durable databases, so effect creation and the
local receipt cannot share a transaction. Restart disposes/restarts workerd with
the same persistence directory while the separate service continues running. This
is stronger than the prior single-transaction sandbox, but does not simulate every
OS/power failure or certify Cloudflare storage, HubSpot consistency, scopes, API
formats, pagination, metadata visibility, API timeouts or hosted Access behavior.
Audit retention/backup/restore and general deployment operations remain unverified;
12-month configurable retention is still a requirement, not a deployed feature.

## Estimates, tasks and outcomes

Four control operations have illustrative USD estimates; three fixture tasks are
confirmed; those facts create **zero** verified outcome records. Only an independently
read fixture outcome can create one deduplicated record. Five repeated attribution
attempts plus a restart retain one synthetic USD 250.00 outcome. Amount/currency
conflicts and unverified events are rejected. There is no automatic financial
amount from a task and no currency aggregation across outcome records.

All these amounts are fictional, explicitly labeled test estimates/outcomes.
`revenueRescued` remains null. The remote outcome verification adapter refuses to
operate; there is no business revenue evidence or causal attribution certification.
HubSpot remains the system of record, and task creation is only a follow-up artifact.

## Reproduction and remaining hosted work

Pinned runtime tools are in `package-lock.json`; Node 24.19.0 was used. Commands:

```sh
npm ci
npm test
npm run certification:local
npm run certification:replay
WRANGLER_SEND_METRICS=false npm run check
npm run certification:check
npm run regression:offline # expected failure of unchanged legacy diagnostic
npm run certification:evidence
# Separate opt-in paid synthetic model run, non-production key only:
npm run regression:findings -- --live --non-production
```

Model runner output goes to ignored `reports/`; this cycle's immutable capture is
`fresh-model-v0.2.json`. Do not overwrite old captures when regenerating results.
Prior baseline/correction/validation evidence and production prompt/schema snapshots
are checked byte-for-byte against base commit `438d6d3` in `manifest.json`.
Captured failures have separate SHA-256 files and tests. They are append-only by
repository convention and integrity checks, not a claim of WORM storage. Record
future human verdicts in separately attributable review receipts bound to capture
hashes; preserve the original pending-review snapshots.

**Not executed / required before hosted certification:** provision a separate
Cloudflare Worker/namespace and isolated non-production HubSpot portal; identify
one designated contact whose `firstname` is `AI_MAIN_CERTIFICATION_ONLY`; configure
separate read/write test secrets, external Access issuer/audience/role mapping,
production portal exclusion and reviewed isolation flag; allowlist those API hosts.
Use existing scopes only and stop if insufficient. Stage config has no public route
and `ENABLE_TEST_TASK_WRITES=false`, so these steps cannot silently deploy or write.
Run the hosted, authenticated final-payload and interrupted-write scenarios, obtain
real task IDs/readbacks and storage recovery traces, and obtain human semantic
sign-offs. No such tests are claimed by the local fixture evidence.

Highest-priority next action: **human adjudication of the blocked semantic cases,
especially ST04 completeness/deadline and EN12 scope**, before changing the output
contract or unblocking execution. Then use isolated hosted access to validate actual
HubSpot recovery. Production promotion remains stopped for review.
