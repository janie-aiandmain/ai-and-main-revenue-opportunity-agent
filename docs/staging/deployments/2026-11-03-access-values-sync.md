# Staging Access ordinary values synced

Verified 2026-11-03 at 15:17 EST through read-only Cloudflare management GETs.
Account: `cda2ab71dd8127c8031c945a738b86e2`.
Worker: `ai-and-main-revenue-opportunity-staging`.

The source `wrangler.staging.jsonc` now contains the two ordinary values supplied
from the staging Worker's Application values panel:

| Setting | Value |
| --- | --- |
| `ACCESS_ISSUER` | `https://falling-cell-9501.cloudflareaccess.com` |
| `ACCESS_AUDIENCE` | `f3d28533ee59378b47a60ea0747a3e9ee6743f6c338ea859b21f371b6c1d0548` |

These are public configuration identifiers, not JWTs or secret values. All eight
ordinary settings now match the deployed Worker: no missing, extra or mismatched
values. All three required secret names are still present as secrets; their values
were neither requested nor copied. `keep_vars: false` remains unchanged. Existing
staging settings generation carries these fields forward and validates/overrides
them from the complete ordinary-settings input when that later step is ready.

All four write/release flags remain `false`. workers.dev and previews remain off;
there are no custom domains. `CERTIFICATION_LEDGER` retains the dedicated SQLite
namespace. No remote redeployment, production change, HubSpot request, model call
or CRM write occurred. Worker Access policy was shown as applied in the user's
dashboard screenshot; this check does not certify the edge policy or identity
through an authenticated request. Public JWKS retrieval was not performed here.

Validation: staging dry-run passed and 101/101 local tests passed. Application
source, production configuration, fixtures and existing captured evidence are
unchanged.

Still pending: obtain and verify the operator's external subject before adding
`APPROVER_SUBJECTS_JSON`; finish tenant settings for synthetic portal `247646122`
and contact `582095692487`; ask whether a separate production HubSpot portal exists
before filling its exclusion ID. Do not invent an ID. Access/tenant setup and
subsequent read-only preflight do not provide human semantic sign-off.

Safe evidence: [2026-11-03-access-values-sync.json](2026-11-03-access-values-sync.json).
