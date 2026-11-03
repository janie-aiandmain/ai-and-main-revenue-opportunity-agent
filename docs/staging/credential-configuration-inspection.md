# Existing credentials: staging configuration inspection

This inspection supersedes earlier checklist wording that called staging secrets
“not configured.” Their deployed Cloudflare state is **unverified**, not known
absent. The user already created separate HubSpot test read/write credentials.
Reuse those existing test credentials if tenant/permission checks pass; do not
create or rotate keys just because they are unavailable to Codex.

## Verified locations and access limits

| Location | What was actually verified |
| --- | --- |
| Repository staging code | Reads `STAGING_HUBSPOT_READ_TOKEN`, `STAGING_HUBSPOT_WRITE_TOKEN`, `EVAL_OPENAI_API_KEY` |
| Legacy lab code | Reads `HUBSPOT_ACCESS_TOKEN` and `HUBSPOT_WRITE_TOKEN`; these are different configuration names, not proof of different underlying credentials |
| Current Codex runtime | `EVAL_OPENAI_API_KEY` is reported ready; HubSpot and Cloudflare authentication variables are unavailable in this process |
| Local files | No `.dev.vars`, `.dev.vars.staging`, `.dev.vars.certification`, `.env`, `.env.local`, generated `.staging` settings/config, or Wrangler OAuth file at the inspected default locations |
| Deployed staging Worker Variables and Secrets | Cannot inspect: Cloudflare API host is not allowed and no Cloudflare metadata authentication is available here. No conclusion about presence/absence or validity |
| Deployed staging Bindings | Cannot inspect. Source declares the resource; deployment/namespace existence is unverified |
| Cloudflare Access application/settings | Cannot inspect. Local template has placeholders; deployed settings may already exist |

Only names, presence and configuration references were inspected. No secret value
was displayed, extracted, copied between Workers, recreated or rotated. No deployed
configuration was changed and no HubSpot API request was made by this inspection.

## Configure existing test credentials, if needed

In Cloudflare, select account `cda2ab71dd8127c8031c945a738b86e2`, then:

**Workers & Pages → ai-and-main-revenue-opportunity-staging → Settings → Variables and Secrets**

First inspect the names already listed. For each missing or incorrectly named
entry, use **Add → Secret** (the type may be shown as Secret), enter the exact name,
and enter the existing test credential through that secure field:

| Staging Secret name | Existing credential to use |
| --- | --- |
| `STAGING_HUBSPOT_READ_TOKEN` | Existing HubSpot read credential for isolated test portal 247646122 |
| `STAGING_HUBSPOT_WRITE_TOKEN` | Separate existing HubSpot write credential for that same test portal |
| `EVAL_OPENAI_API_KEY` | Existing non-production OpenAI evaluation-project credential |

A secret stored under a legacy name is not automatically available under the
staging name. The code does not alias legacy names. Adding the expected secret
entry configures a credential; it does not create a new upstream API key. Existing
Cloudflare secret values cannot be recovered by listing names. Use the original
secure credential store or existing test app credential screen to enter the value;
do not expose it in chat, logs, ordinary variables or source. Do not copy a
production credential based solely on a matching name.

Codex's evaluation credential does not automatically appear in the staging Worker.
Conversely, Worker credentials need not be copied into Codex for Worker preflight:
the authenticated Worker can use its own stored secrets internally.

## Access settings: ordinary configuration, not resource bindings

Their deployed state is unverified. Inspect before adding duplicates.

| Requirement | Dashboard location |
| --- | --- |
| Access application covering the complete staging hostname and explicit reviewer Allow policy | Cloudflare Zero Trust → Access → Applications → staging application |
| `ACCESS_ISSUER` = team issuer `https://TEAM.cloudflareaccess.com` | Enter as an ordinary variable under staging Worker → Settings → Variables and Secrets |
| `ACCESS_AUDIENCE` = staging application's AUD | Obtain Application Audience (AUD) from the staging Access application's configuration; enter as an ordinary Worker variable |
| `APPROVER_SUBJECTS_JSON` = verified JWT subjects mapped to Viewer / Approver / Admin | Enter as an ordinary Worker variable in the same section; obtain subjects through the Access/security administrator. Never share JWTs |

The existing local settings example still contains placeholders for issuer,
audience and subject mapping. That does not establish whether dashboard variables
are missing. A credential-free read of a protected endpoint is not an identity
verification. Deployment authentication and Access operator authentication are also
different things; neither replaces a HubSpot credential or semantic approval.

## Resource binding: separate Bindings tab

**Workers & Pages → ai-and-main-revenue-opportunity-staging → Bindings**

Expected resource:

- Binding name: `CERTIFICATION_LEDGER`
- Type: Durable Object
- Exported class: `CertificationLedger`
- Storage: the staging Worker's own SQLite Durable Object namespace, created by
  the prepared `certification-v1` migration

Verify the namespace belongs to this staging Worker. Do not select a production
namespace. API tokens and ordinary variables belong in Variables and Secrets,
not this resource binding. A name in Wrangler source proves the intended binding,
not that Cloudflare has provisioned it. If deployment has not happened, use the
prepared staging migration through the existing authorized deployment process;
do not silently attach another Worker's namespace.

## Read-only preflight and prerequisites

Once staging URL, Access identity, resource and ordinary settings are configured,
POST `{}` to the Access-protected staging `/certification/preflight`. This endpoint
performs only HubSpot GET requests and does not call the model or create tasks.
It verifies:

1. Reader account identity is portal **247646122**.
2. Separate writer account identity is also portal **247646122**, using a read-only
   identity check, not a task-create probe.
3. Contact **582095692487** is readable in that portal and its `firstname` is
   exactly **AI_MAIN_CERTIFICATION_ONLY**.
4. Note/association and task readback permissions work.

The current code also requires the configured production-portal exclusion and
staging isolation declaration. The local example's exclusion value remains a
placeholder; its deployed value is unknown. Never invent an exclusion ID or use
247646122 as the production ID to make validation pass.

Keep these ordinary Worker settings as the text `false` throughout setup:
`CRM_WRITEBACK_ENABLED`, `ENABLE_TEST_TASK_WRITES`, `ENABLE_GENERAL_EXECUTION`,
`GENERAL_RELEASE_APPROVED`. Source defaults are verified false; deployed values
have not been inspected. Use existing permissions; report insufficient permission
instead of expanding scopes.

Preflight is currently **not executed against hosted staging**: no authenticated
staging URL/Access session or Cloudflare metadata access is available here. The
Codex network currently allows only api.openai.com as a custom destination. The
production hostname is saved in a draft but not active. Calling Worker preflight
requires access to the protected staging hostname; it does not require raw HubSpot
credentials or direct HubSpot API access inside Codex. Cloudflare Worker egress is
separate from this executor's allowlist.

Human approvals remain pending. Configuring credentials, passing Access login or
passing read-only preflight is not semantic sign-off or production certification.
