# Staging runtime secret names — mismatch resolved

Rechecked 2026-11-03 at 14:56 EST using Cloudflare management GETs only in
account `cda2ab71dd8127c8031c945a738b86e2`, Worker
`ai-and-main-revenue-opportunity-staging`.

Cloudflare now lists exactly these three entries as secret bindings in settings,
the secret-name endpoint and the active version:

- `STAGING_HUBSPOT_READ_TOKEN`
- `STAGING_HUBSPOT_WRITE_TOKEN`
- `EVAL_OPENAI_API_KEY`

Active version: `1364b57a-90c4-403f-b641-d96c38caf89e`, deployed at 100%.
The newly listed versions show the dashboard additions after the earlier
inspection. This resolves the earlier observed mismatch; the original receipt is
preserved as point-in-time evidence.

All six ordinary settings match `wrangler.staging.jsonc` exactly: no missing,
extra or changed ordinary values. Compatibility date/flags match. All four
write/release flags remain the string `false`. workers.dev and previews remain
disabled, with no custom domains. `CERTIFICATION_LEDGER` retains its own namespace
`16dca25759494a33813d2800f3f1a850` and class `CertificationLedger`.

No source configuration update or redeployment was needed in this recheck.
The source's names-only `secrets.required` declaration matches all three remote
names. Pinned Wrangler preserves existing secrets independently of `keep_vars`;
`keep_vars: false` continues to make ordinary settings source-controlled. No
secret values were requested, printed, copied or stored. This was not a live
redeployment retention test. Earlier 101/101 tests and dry-run validation remain
applicable; only documentation/evidence changes were made here.

Next setup is external Access and ordinary tenant settings. In **Zero Trust →
Access → Applications**, prepare a dedicated staging application and policy; obtain
the team issuer, application audience and verified subject-to-role mapping. Leave
all routes/previews and write/release flags disabled during setup. Required
ordinary fields are `ACCESS_ISSUER`, `ACCESS_AUDIENCE`, `APPROVER_SUBJECTS_JSON`,
`STAGING_PORTAL_ID`, `STAGING_CONTACT_ID`, `PRODUCTION_PORTAL_ID` and
`STAGING_ISOLATION_APPROVED`. The known synthetic portal/contact are `247646122` /
`582095692487`; the production exclusion still requires an actual verified distinct
portal ID or an explicit policy decision if none exists. Do not fabricate one.
Use the reviewed ordinary-settings generator rather than dashboard-only settings
that a later bare-bootstrap deployment would remove.

No Access/tenant settings were changed in this recheck. No HubSpot/model calls,
CRM writes, production changes or human semantic approvals occurred. Credential
validity, portal/contact isolation and hosted identity enforcement remain untested
until the prerequisites permit the separate read-only preflight. Secret presence
is not credential certification or semantic approval.

Safe machine evidence:
[2026-11-03-secret-sync-resolved.json](2026-11-03-secret-sync-resolved.json).
