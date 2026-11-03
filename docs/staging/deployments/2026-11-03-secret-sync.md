# Staging secret names and deployment sync

Checked 2026-11-03 at 14:48 EST using Cloudflare management GET requests only.
Account `cda2ab71dd8127c8031c945a738b86e2` and Worker
`ai-and-main-revenue-opportunity-staging` were verified. No production changes,
remote deployment, HubSpot calls or model calls were made in this check.

## Observed mismatch

Cloudflare's secret-name endpoint, Worker settings and its only returned version
all contain **zero secret bindings**. The active version is
`e7ab9c6c-fb27-4d39-9d5b-924f77d74125`, created during the original bootstrap.
No undeployed version with the additions was returned. These required names are
not yet visible in this Worker's API metadata:

- `STAGING_HUBSPOT_READ_TOKEN`
- `STAGING_HUBSPOT_WRITE_TOKEN`
- `EVAL_OPENAI_API_KEY`

This does not inspect unsaved browser edits or infer that credentials are absent
from another Worker, Codex, or the user's secure store. Credential validity and
HubSpot portal/contact identity have not been tested.

The specific step is **Cloudflare account → Workers & Pages →
ai-and-main-revenue-opportunity-staging → Settings → Variables and Secrets**:
confirm the correct Worker and type **Secret**, then finish the dashboard's
Save/Deploy action for the existing test values. Do not rotate keys, copy values
from production, or paste values into chat/configuration/Git. Recheck names after
saving before Access/tenant setup. No secrets have been overwritten or deleted here.

## Ordinary settings match

All six deployed ordinary variables match `wrangler.staging.jsonc`; there are no
extra dashboard-only variables or missing/different values:

| Setting | Source and deployed value |
| --- | --- |
| `DEPLOYMENT_ENVIRONMENT` | `staging` |
| `CERTIFICATION_MODE` | `remote-staging` |
| `CRM_WRITEBACK_ENABLED` | `false` |
| `ENABLE_TEST_TASK_WRITES` | `false` |
| `ENABLE_GENERAL_EXECUTION` | `false` |
| `GENERAL_RELEASE_APPROVED` | `false` |

Compatibility date/flags match. `CERTIFICATION_LEDGER` still points to the staging
namespace `16dca25759494a33813d2800f3f1a850`, class `CertificationLedger`.
workers.dev and previews remain disabled; no custom domains are attached.
Resource bindings belong under **Bindings**, not Variables and Secrets.

## Preservation and smallest source update

The pinned Wrangler **4.156.2** deploy path sets `keepSecrets: true`; upload
metadata retains `secret_text` and `secret_key` bindings. Thus normal
`wrangler deploy --config wrangler.staging.jsonc` preserves existing Worker
secrets independently of `keep_vars`. No secret values belong in `vars`.
This is verified implementation behavior, not a performed redeployment test with
these credentials: they are not yet visible remotely.

The source now declares only the three names in `secrets.required`. The config
schema supports this field, and Wrangler creates `inherit` bindings for the names;
an existing Worker missing a required binding fails deployment rather than silently
shipping without it. This is a local source update; the Worker has not been
redeployed during this check. Existing staging config generation copies this
names-only declaration into its generated config.

`keep_vars: false` remains intentional: ordinary settings come from source, and
future deployments reset the four write/release flags to `false`. It does not
remove secrets. Do not add `--secrets-file`, replace a secret with a plaintext
variable of the same name, or delete/rotate secrets as part of routine deployments.

The account/tenant and Access settings are absent from both the current bare
bootstrap variable set and dashboard, so they are pending setup rather than a
source/dashboard mismatch. When authorized and verified, use the ordinary-settings
generator and deploy its complete generated config; later bare-bootstrap deploys
would remove dashboard-only ordinary settings. Do not set `keep_vars: true` as a
substitute for reconciling required ordinary settings into the deployment config.

## Validation and stop point

Staging dry-run with the new names-only declaration passed. All **101/101** local
tests passed with normal child-process access; an initial restricted run could
not complete the concurrent SQLite child-process test. No tests or assertions
were changed. Production source/configuration and runtime application code are
unchanged. No remote preservation test or credential/tenant preflight was run.

Remaining blocker: the three runtime secret bindings are not visible in the
inspected staging metadata. Stop here before Access and tenant setup; human
semantic decisions remain pending. Safe machine evidence:
[2026-11-03-secret-sync.json](2026-11-03-secret-sync.json).
