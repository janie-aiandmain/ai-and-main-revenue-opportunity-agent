# AI & MAIN Revenue Opportunity Agent

An intelligence and orchestration layer that finds missed revenue and retention
signals in CRM service activity. HubSpot remains the system of record. The agent
supports evidence-backed reasoning, bounded recommendations, human approval and
CRM-native follow-up; it does not replace the CRM.

## Practicum phases

1. Read-only CRM connection
2. Opportunity detection in shadow mode
3. Human review
4. Limited CRM write-back
5. Revenue impact tracking

The first milestone uses a HubSpot developer test account and a Cloudflare Worker. Credentials must be stored as Cloudflare secrets and must never be committed to GitHub.

## Current lab endpoints

- `/health` — confirms the Worker is running
- `/hubspot-test` — will test read-only HubSpot access once the secret and scopes are configured
- `/hubspot-notes-test` — retrieve contact and note context
- `/shadow-evaluate` — deterministic read-only evaluation
- `/ai-shadow-evaluate` — structured model evaluation
- `/ai-stress-test` — nine embedded synthetic model cases
- `/writeback-preview` — proposed tasks without CRM writes
- `/writeback-test` — lab approval interface
- `/writeback-task` — disabled in source during staging certification

The legacy write path is now closed unconditionally in source. This has not been
deployed to production; deployed writeback state is unverified. The shared approval
token is a historical lab mechanism. The separate staging certification path and
its limits are documented below. This is not enterprise or production readiness.

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
# Requires the secure, non-production EVAL_OPENAI_API_KEY binding:
npm run regression:model -- --live --non-production
# Regrade captured outputs without additional API calls:
npm run regression:replay -- reports/model-baseline.json
```

The diagnostic baseline currently has known failures and exits nonzero. Model
baseline availability and measured results are recorded in `docs/baselines/`.
These checks do not authorize deployment, new CRM permissions, or task writes.

## Independent findings

The read-only AI shadow response now uses `findings-v0.2`: zero, one or multiple
independent findings per context, with stable IDs, source quotes and exact
versioned action proposals. See [the contract and scope](docs/multi-finding-remediation.md).
The legacy writeback lab is disabled and cannot approve v0.2 finding proposals.
Use `npm run regression:findings -- --live --non-production` for the separate
synthetic comparison. Prior v0.1 baseline artifacts are retained unchanged.

## Staging certification

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
