# Hosted staging setup guide

> **2026-11-03 update:** The account is API-verified and the separate staging
> Worker and SQLite namespace are deployed. See the [verified bootstrap receipt](deployments/2026-11-03-bootstrap.md).
> The inventory below records the earlier setup state; do not repeat initial
> provisioning. The [subsequent recheck](deployments/2026-11-03-secret-sync-resolved.md)
> verifies all three secret names on the active version. Credential validity,
> tenant settings, Access and read-only preflight remain outstanding. All routes/previews and write/release flags stay
> disabled; opening a protected route is a separate, reviewed step.

Supported description: **controlled prototype with tested local safeguards**.
Setting up infrastructure/access is neither semantic sign-off nor production
certification. All task writes stay disabled throughout these setup instructions.
No deployment, HubSpot request or account change has been performed by this guide.

## What exists and exactly what is missing

The production script is `ai-and-main-revenue-opportunity-agent` at
`https://ai-and-main-revenue-opportunity-agent.ruddy4learning.workers.dev/`.
The user supplied Cloudflare account ID `cda2ab71dd8127c8031c945a738b86e2`;
it is recorded but not API-verified. A read-only production health
request was attempted; network access failed. Its deployed writeback state remains
unknown, separately recorded in `../integration/production-state.json`.

The user confirmed portal **247646122** is a non-production portal containing only
synthetic data. This is an isolation declaration, not API verification or approval of any finding. The user designated synthetic
contact **582095692487**; its marker and associations still need read-only verification. Do not assign this ID as a production portal.
Do not use a production portal if a non-production portal cannot be verified.

Prepared files:

- `../../wrangler.staging.jsonc`: separate script name, Durable Object SQLite binding
  and migration, no public or version-preview route, all write/release flags false. Its namespace is
  created for this script only; no production storage ID is reused.
- `settings.example.json`: ordinary settings template. Known portal/contact IDs are filled; no token values belong here.
- `../../scripts/staging/configure.js`: validates filled ordinary settings and
  generates an ignored local config, hard-coding write/release flags false.
- Authenticated `POST /certification/preflight`: read-only checks of both token
  portal identities, designated contact marker, notes, task-read ability and the
  authenticated Access identity. It cannot create a task even with write credentials.

Still missing:

| Item | Current state |
| --- | --- |
| Cloudflare account | ID cda2ab71dd8127c8031c945a738b86e2 supplied; deployment access not configured |
| Separate staging Worker and its SQLite namespace | Prepared in source; not provisioned |
| Designated synthetic contact | ID 582095692487 supplied; marker, portal association and notes unverified |
| Verified distinct production HubSpot portal ID for exclusion | Not supplied; never use a fabricated placeholder |
| Staging read token and separate staging write token | Not configured |
| Evaluation project key in staging Worker | Not configured; Codex's evaluation key does not automatically transfer to Cloudflare |
| Access team issuer, app audience and subject→role mapping | Not supplied |
| Network access | Cloudflare API, HubSpot API, Access issuer and Worker hostnames unavailable from this environment |
| Human decisions on seven flagged cases | Pending; infrastructure setup cannot supply them |

If there is no production HubSpot portal at all, document that with the security
owner before changing the exclusion policy. Do not put `none`, a random number or
247646122 into `productionPortalId` to make validation pass.

## Account steps, in order

1. **Verify the supplied Cloudflare account ID.** It is
   `cda2ab71dd8127c8031c945a738b86e2`. Open the account containing the production
   Worker. In Workers & Pages / account overview, confirm the **Account ID** (32 hex
   characters). Keep the production Worker unchanged. Prefer a separate staging
   Cloudflare account where available; at minimum use the separate script and
   newly created namespace below. Never bind production storage or secrets.
2. **Verify the HubSpot account switcher shows the isolated portal.** Confirm
   247646122 contains fictional records only. If it does not, stop and create a
   developer test account from HubSpot's developer account → Test accounts (or the
   developer platform's Testing section). Do not copy production data into it.
3. **Verify the designated contact 582095692487 in HubSpot.** Its portal must be
   247646122 and its data fictional only. Set
   `firstname` exactly to `AI_MAIN_CERTIFICATION_ONLY`; use a plainly synthetic
   surname such as `STAGING TEST — NO CUSTOMER COMMUNICATION`. Use no real phone
   number or deliverable customer email. Copy the contact ID from that contact's
   URL, not the all-contacts view URL. Add clearly labeled fictional service notes
   for the approved test scenarios. Creating these fixtures manually does not
   require granting the agent contact/note-write permission.
4. **Inspect existing staging credentials and available scopes.** Use separate
   test-account read and write credentials. The required abilities and scope
   limitations are below. Do not reuse production credentials, select additional
   scopes automatically, or substitute contact/deal write privileges just to pass
   a test. Missing abilities are a blocker for the account/security owner.
5. **Bootstrap a dark staging Worker if it does not exist, then prepare Access.**
   If the built-in Workers Access setup needs an existing script, your authorized
   deployment operator can first provision only the closed staging template:

   ```sh
   CLOUDFLARE_ACCOUNT_ID=cda2ab71dd8127c8031c945a738b86e2 npx wrangler deploy --config wrangler.staging.jsonc
   ```

   This is a future manual account step, not an action executed here. The template
   has no public/preview route, no secrets, no CRM configuration, and all write
   flags false. It cannot evaluate or create tasks. This avoids needing an Access
   AUD before the staging script exists. Do not use the production config.
   Then use Cloudflare Zero Trust → Access →
   Applications → Add application → Self-hosted (or the Workers dashboard's
   built-in Access protection for the staging `workers.dev` hostname). Cover the
   whole staging hostname and all paths. Use your existing IdP, or email one-time
   PIN for the synthetic pilot if your security owner permits it. Create an
   explicit Allow policy for named reviewers or an approved group. Do not use an
   Everyone/Bypass policy. Record team issuer `https://TEAM.cloudflareaccess.com`
   and the application's **AUD**. This must be the staging app, not production.
6. **Map external identities.** Obtain each reviewer's Access JWT `sub` through
   your Access/security administrator or inspect it locally; never paste the JWT
   into chat. Map those opaque subjects to `Viewer`, `Approver`, or `Admin` in the
   settings file. Viewer can inspect/preflight; Approver and Admin can evaluate,
   review and approve findings. There is no user database. A JWT claim saying
   `Admin` does not grant a role; the configured subject map controls roles.
7. **Fill the ordinary settings locally.** Copy `settings.example.json` to
   `.staging/settings.json` (ignored by Git), replace every placeholder, then run:

   ```sh
   node scripts/staging/configure.js .staging/settings.json .staging/wrangler.generated.jsonc
   npx wrangler deploy --dry-run --config .staging/wrangler.generated.jsonc
   ```

   This only creates a local config and builds. The generator fixes the script
   name to `ai-and-main-revenue-opportunity-staging`, refuses the production portal,
   and keeps the public route and all writes off. Generated config paths are local.
8. **Provision the dark staging Worker when account setup is reviewed.** Using
   your existing authorized Cloudflare identity, deploy only the generated staging
   config. This is a later manual/account step, not an action already executed:

   ```sh
   npx wrangler deploy --config .staging/wrangler.generated.jsonc
   ```

   On the first deployment, the migration creates a new SQLite Durable Object namespace for
   `CertificationLedger` and binds `CERTIFICATION_LEDGER` in this staging script.
   No KV, D1, production namespace or CRM storage is needed. Confirm the script
   name and account before running. Never run bare `npm run deploy` here.
9. **Enter secrets securely in the staging Worker.** In Cloudflare Workers & Pages
   → `ai-and-main-revenue-opportunity-staging` → Settings → Variables and Secrets,
   add each credential with type **Secret**. Alternatively use the masked
   interactive prompt, one at a time:

   ```sh
   npx wrangler secret put EVAL_OPENAI_API_KEY --config .staging/wrangler.generated.jsonc
   npx wrangler secret put STAGING_HUBSPOT_READ_TOKEN --config .staging/wrangler.generated.jsonc
   npx wrangler secret put STAGING_HUBSPOT_WRITE_TOKEN --config .staging/wrangler.generated.jsonc
   ```

   Paste values only into that secure secret field/prompt. Never put values in
   commands, source, ordinary settings, screenshots, reports, chat or shell
   history. Do not send me the values. Deploy credentials belong to the deployment
   machine/environment, never the Worker. Changing secret bindings may create a
   new staging version; check the staging script name each time.
10. **Protect and publish only the staging route.** Once the Access application
    and Worker JWT settings are configured, use the staging Worker's Domains &
    Routes settings to enable its own `workers.dev` hostname with Access protection,
    or attach a dedicated Access-protected staging hostname. Do not alter the
    production hostname. The checked-in/generated config defaults `workers_dev`
    to false; future deployment resets it closed unless a reviewed protected route
    configuration is deliberately maintained. JWT validation still fails closed
    at the Worker if edge protection is misconfigured.
11. **Allowlist only the necessary hosts in the Codex environment settings.**
    Add `api.cloudflare.com`, `api.hubapi.com`, your exact Access team hostname,
    exact staging hostname and the supplied production Worker hostname. Keep
    `api.openai.com` for non-production evaluations. Publish environment settings
    through the normal reviewed setup workflow; do not paste credentials here or
    bypass the network proxy. This executor's allowlist does not configure
    Cloudflare Worker egress; both runtime contexts must be checked separately.
12. **Run authenticated read-only preflight, with writes still false.** Log in via
    the staging Access app. An authorized operator can POST `{}` to
    `/certification/preflight` through the protected hostname. Access forwards
    `Cf-Access-Jwt-Assertion`; the Worker validates its signature, issuer, audience,
    expiry and mapped role. API clients may use an Access JWT as Bearer, stored
    securely; do not log or paste the token. Conflicting identity headers are
    rejected. Save only the safe JSON receipt. Confirm both token portal IDs,
    designated contact, note/task reads and external identity. A forged, expired,
    wrong-audience or unmapped identity must fail. Keep these flags false:
    `CRM_WRITEBACK_ENABLED`, `ENABLE_TEST_TASK_WRITES`, `ENABLE_GENERAL_EXECUTION`,
    `GENERAL_RELEASE_APPROVED`.

Stop here for review. Passing preflight establishes only those isolated read and
identity checks. A separately reviewed synthetic hosted-write certification plan,
human semantic decisions and an explicit release decision are still required
before any task-create test. These steps do not enable production writeback.

## Secrets versus ordinary settings

| Name | Type / where | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Deployment secret only, or use existing Wrangler login | Staging provisioning; never a Worker binding |
| `EVAL_OPENAI_API_KEY` | Worker Secret; separate Codex secure binding for evaluations | Non-production OpenAI project only |
| `STAGING_HUBSPOT_READ_TOKEN` | Worker Secret | Designated contact/notes, task readback and reconciliation |
| `STAGING_HUBSPOT_WRITE_TOKEN` | Different Worker Secret | Bounded task creation later; read-only account identity preflight now |
| `account_id` | Ordinary generated config | Exact Cloudflare account |
| `STAGING_PORTAL_ID` | Ordinary config | 247646122, user-attested; must pass API verification |
| `PRODUCTION_PORTAL_ID` | Ordinary config | Verified distinct exclusion ID |
| `STAGING_CONTACT_ID` | Ordinary config | Designated synthetic contact only |
| `ACCESS_ISSUER`, `ACCESS_AUDIENCE` | Ordinary config | External JWT verification; not secret tokens |
| `APPROVER_SUBJECTS_JSON` | Ordinary config with limited access | Opaque subject→Viewer/Approver/Admin mapping; avoid personal data in Git |
| `DEPLOYMENT_ENVIRONMENT`, `CERTIFICATION_MODE` | Fixed ordinary config | `staging`, `remote-staging` |
| `STAGING_ISOLATION_APPROVED` | Ordinary isolation declaration | True only after account/record selection; API checks still required |
| Four write/release flags above | Fixed ordinary config | All false during setup |
| `LOCAL_*`, `ENABLE_LOCAL_GENERAL_TEST_EXECUTION` | Local tests only | Must not be set in hosted staging |

The generator preserves ordinary settings in the generated config, not remote
`keep_vars`. It always resets unsafe write flags to false. Secrets remain separate
Cloudflare secret bindings; never serialize them into this JSON.

## Minimum credential abilities and scope caveats

No permission is expanded by this repository. Inspect the credentials you already
have. If an account does not support an ability with acceptable least privilege,
stop and have its security owner resolve it; do not broaden to contacts, deals,
notes, pipeline, email or appointment writes as a workaround.

| Credential | Minimum ability needed by this implementation | Scope / permission names to verify |
| --- | --- | --- |
| OpenAI evaluation key | Responses API inference for `gpt-5.6-terra` in non-production project | Restricted key permitting Responses inference; no org administration, files or production project access needed |
| HubSpot staging reader | Read account identity, designated contact, contact→note associations, note bodies/timestamps, task list/details/contact associations | Fine-grained inventory includes `crm.objects.contacts.read`, `crm.objects.notes.read`, `crm.objects.tasks.read`; account-details spec declares `oauth` |
| HubSpot staging writer | Create a task with designated contact association; read its own account identity for isolation | Fine-grained inventory includes `crm.objects.tasks.write`; account-details spec declares `oauth`. No contact, deal, pipeline, note, email or meeting write is intentionally used |
| Cloudflare staging deploy identity | Manage the separate staging script and its Durable Object migration/binding | Account **Workers Scripts: Edit**; no KV/D1 permission or Zone DNS/Routes edit needed for the supplied dark `workers.dev` setup |
| Cloudflare production verifier, if API verification is later needed | Read production script/settings only | Separate **Workers Scripts: Read** identity; never use a production write credential merely to inspect state |
| Access administrator (account UI) | Create staging Access app/Allow policy and assign existing IdP | Existing Access administration role; no Access API token is stored in the Worker. Runtime fetches public signing keys only |

**HubSpot compatibility limitation:** the official exported v3 task/note endpoint
specifications have empty per-operation security arrays and a broad scope inventory;
they do not prove a minimum scope union for every legacy/private-app token type.
They list granular task/note scopes as user-app scopes, not universally available
portal-app scopes. Treat the names above as the least-privilege capabilities to
verify, not a promise that a legacy private app can select them. The account-details
endpoint explicitly uses `oauth`; adding `account-info.security.read` is not a
substitute demonstrated by this code. A failed account identity/read preflight
blocks setup. Do not select `crm.objects.contacts.write` merely because an older
engagement API tutorial suggests it. No broader legacy permission is approved here.
Read-only preflight cannot prove task-create scope; that remains part of the later
isolated, explicitly authorized write test.

The official specification source, commit and exact inspected paths are recorded
in `permissions-evidence.json`. Account UI names and scope availability can vary
by HubSpot platform/app type; confirm with the account/security owner.

Cloudflare account-scoped Workers edit tokens can affect more than one script in
that account. Prefer a separate staging account or existing carefully supervised
deployment identity. A script name alone does not scope an account API token.

## Review and production state stay separate

The seven corrected/blocked cases are presented in `../integration/seven-case-review.md`.
Their human verdicts remain pending. Codex can provide attributable assistant
analysis, not a human signature. Infrastructure approval, an Access login, and a
simulation's `attestHumanReview` flag do not supply those human verdicts.

Production verification is a separate read-only task: once its hostname is allowed,
GET the production `/health` and record the reported writeback flag/release. With
appropriate read-only Cloudflare access, compare deployed script/settings too.
Do not send a task POST to production to test its disabled state. The local source
guard, staging flag and successful staging preflight do not prove production is off.

## Exact verification blockers

The endpoint returns safe `blocker` metadata with a code, check, setup step/action,
optional HTTP status/required scope names, and `permissionsExpanded:false`.
No raw upstream message, bearer value, request headers or secret content is logged.

| Code | Evidence / meaning | Specific action |
| --- | --- | --- |
| `missing_credential` | Required secure binding or Access assertion is absent; nothing was rejected by an API | Step 9: enter the named test credential securely; for Access, step 5: log in through the correct app |
| `rejected_credential` | API HTTP 401, or invalid/expired/wrong-issuer/audience/signature identity | Step 9: replace the correct test binding; for Access, step 5: fix app settings/login. Never try production credentials |
| `insufficient_permission` | API HTTP 403 or a valid identity lacks a mapped role | Step 4: account owner inspects existing allowed abilities; Access role mapping is step 6. Stop if a broader scope would be required |
| `portal_mismatch` | Reader or writer account identity differs from the designated non-production portal | Steps 2/4: verify account switcher and replace the mismatched staging token. Never point the test at production |
| `contact_mismatch` | Designated ID/marker differs or contact lookup returns 404 | Step 3: verify contact 582095692487 in portal 247646122 and exact synthetic marker |
| `blocked_network_access` | Host is denied by the executor policy, or transport produces no HTTP response | Step 11: allowlist the exact host in the relevant runtime and refresh; inspect routing/TLS if already allowed. This does not establish a bad credential |

Missing ordinary identity settings are `missing_configuration`, not a rejected
secret. HTTP 5xx/rate limits and malformed upstream data are reported separately;
they are not misreported as permission failures. Unknown remote write results stay
blocked even after a credential/network problem is corrected; reconcile first.

Current exact production blocker: **`blocked_network_access`**, check
`environment_host_not_allowlisted`, for
`ai-and-main-revenue-opportunity-agent.ruddy4learning.workers.dev`. Perform step 11.
No credential, permission, portal or contact check was reached by that production
verification. After network setup, `npm run staging:verify-production` repeats only
a GET to the fixed production health URL and writes a safe receipt under `reports/`.
It exits 2 for unknown state, 1 if writeback is reported enabled, and 0 only when
health reports disabled. It never changes production configuration.
