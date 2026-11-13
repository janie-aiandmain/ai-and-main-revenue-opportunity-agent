# AI & MAIN Revenue Opportunity Agent

Latest validation: [32 fresh proposal-v2.5 evaluations and task-scoped usage accounting](docs/review/proposal-hash-validation/README.md).
The user reopened necessary non-production evaluation; the old 242 cumulative
cap remains historical rather than blocking this task. All 32 automated checks
pass, with no false proposal-version drift for identical authoritative inputs.
EN31/RQ02 subject variation and UV11 evidence-selection variation remain visible;
fresh semantic review and release acceptance are pending. No deployment or delivery.

Current source correction: [proposal hash stability and approval migration evidence](docs/review/proposal-hash-correction/README.md).
Proposal v2.5 excludes explanatory prose while binding the complete task draft and
authoritative decision material. Offline replay removes all ten identical-payload
false-churn groups; EN11/EN31 subject differences still change versions. Revised
contracts and outputs remain pending human review. Its original replay evidence
predates the freshly authorized validation linked above; it remains unchanged.

Preserved v0.3.9 fresh validation: [32/32 automated passes and remaining stability limits](docs/review/current-v0.3.9/model-validation/RESULTS.md).
Decisions, evidence, scope and local durable identity were stable; raw keys and
proposal action versions still vary. These fresh outputs await separate human
review. The additional 32-call allowance is fully used: 242 cumulative calls.
No runtime generator change, deployment, CRM write or email send was performed.

Preserved semantic review: [one consolidated v0.3.9 / proposal v2.4 packet](docs/review/current-v0.3.9/REVIEW.md)
contains nine findings and five UV11 variants. The user has now
[semantically approved all fourteen exact drafts](docs/review/current-v0.3.9/adjudication/README.md),
including their presented UV11 priorities. The original packet remains an immutable
PENDING snapshot; the append-only ledger records current status. Model allowance,
email activation, deployment and final execution approval remain separate.

Email sender follow-up: [selected From / Reply-To and remaining setup](docs/review/email-sender/README.md).
The disabled demo template uses alerts@aiandmain.ai, with replies and alerts going
to janie@aiandmain.ai. Domain verification is user-reported and the sending Secret
is confirmed on the owner Worker; provider validity and delivery remain untested.

Previous source cycle: [supported multi-finding gate and operator email alerts](docs/review/workflow-email/README.md).
`regression:offline` now exercises the supported finding workflow; the limited
rules commands remain separately available with their original failures visible.
HIGH or Immediate Review alerts have a durable, browser-independent email outbox.
Delivery is disabled pending sender/secret setup and hosted validation. No new
model calls, CRM calls, tasks or deployment are included in this source cycle.

Previous source refinement: [immediate review for in-progress scope requests](docs/review/in-progress-scope/README.md)
adds a prominent flag, first-card ordering and HIGH default priority, with dated
onsite/job context kept separate from HubSpot task status. It is locally validated
and not deployed; task execution and fresh model validation remain pending.

An intelligence and orchestration layer that finds missed revenue and retention
signals in CRM service activity. HubSpot remains the system of record. The agent
supports evidence-backed reasoning, bounded recommendations, human approval and
CRM-native follow-up; it does not replace the CRM.

Previous source-only checkpoint: [semantic review and diagnostic evidence](docs/review/semantic-diagnostic-cycle/README.md).
The rules diagnostic's classification/review checks improved from 19/31 to 31/31;
its command still fails because a single summary cannot cover EN11/EN12's two
independent findings. Frozen v0.2 remains reproducible. The user selected
Cross-sell for UV11; materializer v0.3.8 applies that narrow policy with internal
current-interest verification. Fresh model validation of this changed generator
is pending; the 210-call budget is exhausted. Revised human semantic verdicts and
final execution approvals remain pending. No deployment, CRM/model call, task or
configuration change occurred. All tracked write/test/fault/release flags remain
false. Earlier sections preserve historical evidence and are not new certification.

## Practicum phases

1. Read-only CRM connection
2. Opportunity detection in shadow mode
3. Human review
4. Limited CRM write-back
5. Revenue impact tracking

The first milestone uses a HubSpot developer test account and a Cloudflare Worker. Credentials must be stored as Cloudflare secrets and must never be committed to GitHub.

## Historical application endpoints

These are routes of `src/index.js`, not routes enabled by the current main demo
gateway. The configured demo rejects legacy diagnostics; the staging-owner source
still has an authenticated read-only fallback to this application, requiring its
legacy reader binding. [Reachability and limits](docs/review/semantic-diagnostic-cycle/README.md)
distinguish that source path from fresh verification of a deployed hostname.

- `/health` — confirms the Worker is running
- `/hubspot-test` — will test read-only HubSpot access once the secret and scopes are configured
- `/hubspot-notes-test` — retrieve contact and note context
- `/shadow-evaluate` — deterministic read-only evaluation
- `/ai-shadow-evaluate` — structured model evaluation
- `/ai-stress-test` — nine embedded synthetic model cases
- `/writeback-preview` — proposed tasks without CRM writes
- `/writeback-test` — lab approval interface
- `/writeback-task` — disabled in source during staging certification

The legacy write path is closed unconditionally in source. The latest read-only
demo deployment observation is in the current correction package; all seven
general/test/fault flags were false. The shared approval token is a historical lab
mechanism. The separate certification path and its limits are documented below.
This is not enterprise or production readiness.

## Local development

Node 24.19.0/npm 11.9.0 were validated; CI uses Node 24. Runtime/test tools are
pinned in `package-lock.json`.

```sh
npm ci
WRANGLER_SEND_METRICS=false npm run check
WRANGLER_SEND_METRICS=false npm run dev -- --local --ip 127.0.0.1 --port 8787
```

Verify `/health` returns 200 with `status: ready`. Without secrets, HubSpot
evaluation endpoints return 503 `not_configured`; POST `/writeback-task` returns
403 `writeback_disabled`. A dry-run build does not deploy. The offline harness is available through `npm test`; model-backed checks are
separate and explicitly opt-in. Keep generated `node_modules/` and `.wrangler/`
outputs out of commits.

Live reads require `HUBSPOT_ACCESS_TOKEN`; AI routes also require `OPENAI_API_KEY`.
The historical lab write credentials do not reopen the disabled route. Isolated
certification uses separate staging-only bindings. Store production credentials
as Cloudflare secrets, never in Git. Do not enable writes or deploy as part of
routine validation.

## Hardening direction

See [engineering instructions](AGENTS.md), the
[enterprise hardening plan](docs/enterprise-hardening-plan.md), and
[implementation kickoff](docs/codex-kickoff.md). The operator console should show
findings, evidence, decisions, authorized actions and outcomes, with links to
HubSpot for deeper context. Generic customer, contact, pipeline, note and task
management are outside this product's scope.


## Enterprise hardening baseline

The initial approved baseline scope was Phases 1–3. See the [approved policies](docs/approved-hardening-policies.md),
[architecture and risks](docs/architecture-baseline.md), and
[regression methodology](docs/regression-methodology.md). Synthetic fixtures are
versioned under `fixtures/`; production reasoning request settings are unchanged.

```sh
npm test
npm run regression:offline
# Limited diagnostic: exit 1 remains explicit for independent coverage:
npm run regression:diagnostic
# Requires a separately approved allowance and non-production credential:
npm run regression:model -- --live --non-production
# Regrade captured outputs without additional API calls:
npm run regression:replay -- reports/model-baseline.json
```

The primary offline workflow gate and the limited diagnostic are separate.
The diagnostic exits nonzero for its independent-finding coverage limitation;
frozen v0.2 remains at 19/31 under `regression:offline:legacy`. Model baseline
availability and measured results are recorded in `docs/baselines/`; fresh
inference is blocked by the exhausted 210-call allowance.
These checks do not authorize deployment, new CRM permissions, or task writes.

## Independent findings

The read-only AI shadow response now uses `findings-v0.2`: zero, one or multiple
independent findings per context, with stable IDs, source quotes and exact
versioned action proposals. See [the contract and scope](docs/multi-finding-remediation.md).
The legacy writeback lab is disabled and cannot approve v0.2 finding proposals.
Use `npm run regression:findings -- --live --non-production` for the separate
synthetic comparison. Prior v0.1 baseline artifacts are retained unchanged.

## Historical staging certification evidence

See the [gate evidence package](docs/certification/README.md) and
[pending human-review checklist](docs/certification/human-review.md). The separate
staging Worker has complete final-payload approval and Durable Object SQLite
recovery safeguards tested with actual local workerd and a separate durable HTTP
fixture. This path accepts designated synthetic control fixtures only; general
model-to-writeback integration remains blocked.

All 76 deterministic tests and both dry-run builds pass. The fresh 31-case model
run passes automated decision checks, but ST04 repeats an evidence/deadline failure
and EN12 still requires scope review. All human sign-offs remain pending. Hosted
Cloudflare/HubSpot certification is blocked by missing isolated access and network
configuration. No HubSpot request, production deployment or verified business
revenue claim was made. Production promotion remains stopped for review.

## Historical integration and hosted setup evidence

See the [current correction/integration evidence](docs/integration/README.md),
[seven cases awaiting human decisions](docs/integration/seven-case-review.md), and
[hosted staging account guide](docs/staging/SETUP.md). The general staging path
connects designated notes, independent findings, external operator review, exact
final-payload approval and durable task recovery. Production source and configuration
remain separate. Setup, model scores and simulated actors do not grant human sign-off.
The supported description is **controlled prototype with tested local safeguards**.

For existing test credentials, see the [configuration inspection](docs/staging/credential-configuration-inspection.md).
The earlier inspection records pre-deployment limits. The deployed staging
Worker now has all three required secret names API-verified on its active version;
credential validity and tenant isolation still await read-only preflight.

The separate hosted staging Worker is now deployed with its own SQLite namespace,
closed endpoints and disabled write/release flags. See the
[verified deployment receipt](docs/staging/deployments/2026-11-03-bootstrap.md).
The [resolved secret/configuration sync inspection](docs/staging/deployments/2026-11-03-secret-sync-resolved.md)
records the active version and matching ordinary settings. The source declares required secret
names only; Wrangler preserves existing secrets separately from ordinary variables.
The [Access values sync](docs/staging/deployments/2026-11-03-access-values-sync.md)
confirms the issuer/audience and all ordinary settings match. Verified subject
mapping, tenant settings and authenticated read-only preflight remain pending.

The user has authorized opening only the Access-protected staging hostname.
The [protected-hostname gate](docs/staging/deployments/2026-11-03-protected-hostname-blocked.md)
is blocked before enabling by the current network allowlist and unresolved
Access application lookup; the deployed hostname remains closed.

## Current demo scope

The user confirmed both Cloudflare and HubSpot are proof-of-concept demo resources,
with no separate production HubSpot portal. New staging/Access setup is paused.
See the [existing demo reassessment](docs/demo-reassessment.md) for actual deployed
observations, the verified write-disable change, limits of portal verification and
the bounded route to demonstrating the existing safeguards. Deployment labels do
not establish live customer operations. Do not add infrastructure or permissions.

The [bounded hosted recovery demonstration](docs/demo-recovery-evidence/README.md)
now verifies two actual synthetic HubSpot tasks, including injected response loss
followed by hosted restart/reconciliation with no duplicate create, and stale
approval rejection. Both credential portal identities and the designated marker
passed. All test/fault/general execution is now disabled. The user's subsequent
semantic decisions are recorded in the current correction package; new corrected
outputs remain pending review. This does not establish recovery from a genuine
network outage.

The [seven-case human review packet](docs/review/seven-cases/README.md) provides a
compact table, original verbatim task bodies, explicit timing/scope blockers,
separate finding recommendations and the recorded human-verdict ledger. Its
[GitHub evidence index](docs/review/seven-cases/evidence-index.md) links each hosted,
local and model result to its recording and implementation commits. No semantic
PASS is inferred from recovery controls; general writeback remains disabled.
