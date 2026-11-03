# Create the separate staging Worker

The user confirmed that `ai-and-main-revenue-opportunity-staging` has **not been
created**. The existing `ai-and-main-revenue-opportunity-agent` Worker at
`https://ai-and-main-revenue-opportunity-agent.ruddy4learning.workers.dev/` is the
production deployment boundary. Do not change its secrets, bindings or routes for
certification. A synthetic HubSpot tenant does not make that Worker staging.

## What exists versus what is prepared

| Item | Current evidence |
| --- | --- |
| Existing production Worker | User-confirmed; this cycle did not inspect or change its Cloudflare configuration |
| Separate staging Worker | Not created, per user; no deployment performed here |
| `wrangler.staging.jsonc` | Checked in and verified with a successful dry-run build |
| `CERTIFICATION_LEDGER` / `CertificationLedger` | Declared in staging config with a new SQLite class migration; no hosted namespace provisioned by this work |
| Separate HubSpot test read/write credentials | User-confirmed created; storage location and staging availability remain unverified |
| Reported existing secret names | `HUBSPONT_ACCESS_TOKEN` and `HUBSPOT_WRITE_TOKEN`; the read-name spelling is unverified and differs from legacy code's `HUBSPOT_ACCESS_TOKEN` |
| OpenAI evaluation credential | Ready in Codex; not automatically attached to the future staging Worker |

## Exact deployment blockers here

- **blocked_network_access:** `api.cloudflare.com` is outside this Codex runtime's
  enforced allowlist. No deployment request was attempted.
- **Deployment authentication unavailable in the observed session:** no Cloudflare
  token binding, outbound identity, or OAuth file in the inspected Wrangler
  locations. This is not a conclusion that your account has no credentials.
- No credential was rejected and no API permission denial was observed; those
  checks were not reached. No new keys, rotations or scope expansions were made.

To deploy from Codex later, allow `api.cloudflare.com` in the environment's custom
network hostname list, preserve existing domains, refresh, and make an existing
approved Cloudflare deployment identity available securely. Do not paste a token
into chat. An existing authorized terminal is an alternative and needs no new
HubSpot or OpenAI credential for this initial resource creation.

## Commands from an already authorized terminal

Use a checkout of this repository with Node 24 and an existing Cloudflare identity
authorized for account `cda2ab71dd8127c8031c945a738b86e2` and staging Worker
management. Existing deployment authority must cover Worker scripts and the
Durable Object migration. No additional HubSpot permission is involved.

```sh
git fetch origin
git switch enterprise-hardening
npm ci
npx wrangler whoami
```

If `whoami` is not authorized for that account, stop and use your existing approved
Cloudflare login/deployment identity. Do not automatically request broader roles
or create a replacement API key to proceed.

Build the exact checked-in staging target:

```sh
CLOUDFLARE_ACCOUNT_ID=cda2ab71dd8127c8031c945a738b86e2 WRANGLER_SEND_METRICS=false npx wrangler deploy --dry-run --config wrangler.staging.jsonc
```

Then create the isolated resources with the same target:

```sh
CLOUDFLARE_ACCOUNT_ID=cda2ab71dd8127c8031c945a738b86e2 WRANGLER_SEND_METRICS=false npx wrangler deploy --config wrangler.staging.jsonc
```

The second command is an actual deployment for your authorized terminal; it was
**not executed here**. Do not substitute the default production config or run a
bare deploy command. The selected config fixes:

- Worker name: `ai-and-main-revenue-opportunity-staging`.
- Entry point: `src/staging/worker.js`.
- Resource binding: `CERTIFICATION_LEDGER`, class `CertificationLedger`.
- Migration: `certification-v1`, `new_sqlite_classes: ["CertificationLedger"]`.
- No reference to another script or existing namespace. Cloudflare creates the
  staging Worker's own namespace through this migration.
- `workers_dev: false`, `preview_urls: false`, no public route.
- `CRM_WRITEBACK_ENABLED`, `ENABLE_TEST_TASK_WRITES`, `ENABLE_GENERAL_EXECUTION`,
  `GENERAL_RELEASE_APPROVED`: all the text `false`.

This initial deployment needs no HubSpot/OpenAI secrets or Access application.
It creates a closed Worker and storage only. It does not evaluate CRM data, create
a task, approve a finding, or certify live writeback. If migration fails, stop;
do not replace SQLite with non-durable storage or attach production storage.

## Verify in Cloudflare, then configure existing test credentials

In account `cda2ab71dd8127c8031c945a738b86e2`:

1. **Workers & Pages:** confirm `ai-and-main-revenue-opportunity-staging` now exists
   separately from the production Worker.
2. **Staging Worker → Bindings:** confirm `CERTIFICATION_LEDGER` references its
   `CertificationLedger` Durable Object namespace. This section is for resources.
3. **Staging Worker → Settings → Variables and Secrets:** confirm all four write/
   release flags are `false`. Add existing test values as **Secret** entries named
   `STAGING_HUBSPOT_READ_TOKEN`, `STAGING_HUBSPOT_WRITE_TOKEN`, and
   `EVAL_OPENAI_API_KEY`. Do not change, rename, delete or extract secrets from
   the production Worker. Use the existing test credential source/secure store.
4. Configure ordinary tenant/contact and Access variables using the setup guide.
   The portal is `247646122`, contact is `582095692487`, with exact marker
   `firstname = AI_MAIN_CERTIFICATION_ONLY`. Resolve the production exclusion
   setting; do not put in a fabricated value. No CRM request is needed for bootstrap.
5. **Zero Trust → Access → Applications:** inspect or create the dedicated staging
   application/Allow policy, then configure `ACCESS_ISSUER`, `ACCESS_AUDIENCE`,
   `APPROVER_SUBJECTS_JSON` as ordinary Worker variables. Provision only the
   staging hostname with Access protection; keep the production route untouched.

Secrets are Worker-specific; existing test keys are reusable credentials, but
legacy variable names are not staging aliases. The suspected `HUBSPONT` spelling
must not be silently corrected on the production Worker. Enter the existing
verified test read value under `STAGING_HUBSPOT_READ_TOKEN` in staging.

Keep ordinary settings in the generated staging config for later deployments:
`keep_vars: false` deliberately does not preserve dashboard-only ordinary variable
changes when deploying the bare bootstrap template again. Secrets are separate.

After protected staging URL, identity, binding and ordinary settings are verified,
read-only `POST /certification/preflight` uses the Worker's stored credentials to
check both portal identities and the designated synthetic record. It creates no
tasks and does not call OpenAI. Human semantic decisions and any write release
remain pending regardless of successful resource or access setup.
