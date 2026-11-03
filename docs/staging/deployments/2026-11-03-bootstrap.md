# Hosted staging bootstrap — deployed and verified

Verified 2026-11-03 14:35 EST in account
`cda2ab71dd8127c8031c945a738b86e2`. Source commit:
`52ce5eecf62e0d522fce0594b36d794e5384bbd5`. Deployment used only `wrangler.staging.jsonc`;
Wrangler exited 0. Earlier documents recording “not created” are historical
pre-deployment evidence.

| Resource/check | Verified result |
| --- | --- |
| Worker | `ai-and-main-revenue-opportunity-staging` exists |
| Binding | `CERTIFICATION_LEDGER` |
| Durable Object class | `CertificationLedger` |
| Own namespace ID | `16dca25759494a33813d2800f3f1a850` |
| SQLite | true |
| workers.dev endpoint | disabled |
| Preview URLs | disabled |
| Custom domains | none |
| Zone routes | none configured; no zone permissions requested |
| Four write/release flags | all the text `false` |
| Runtime secret names | empty; verified via Cloudflare settings metadata |
| Production fingerprints | before/after settings, subdomain and custom-domain hashes match |

No production mutation was performed. The deployment credential was not uploaded
to the staging Worker. No secret values or raw settings are stored in this report.
Namespace ownership/class/SQLite type and binding ID were checked through Cloudflare
management GETs; this is stronger than a successful deploy exit alone. It does not
claim hosted application, model, HubSpot writeback or business-outcome certification.

Validation: 101/101 deterministic tests and staging dry-run passed. No live model
calls, HubSpot calls or CRM writes occurred in this deployment cycle. Human
semantic approvals remain pending.

Next: select **Workers & Pages → ai-and-main-revenue-opportunity-staging →
Settings → Variables and Secrets**, and securely configure the existing test
credentials under `STAGING_HUBSPOT_READ_TOKEN`, `STAGING_HUBSPOT_WRITE_TOKEN`, and
`EVAL_OPENAI_API_KEY`. Use the original secure test credential source; do not
extract or modify the production Worker's secrets or rotate upstream keys.

Then configure ordinary portal/contact settings for portal `247646122` and contact
`582095692487`, resolve the production-portal exclusion setting, and set up the
external Access issuer/audience/subject map. The resource is visible separately
under **Staging Worker → Bindings**. Leave routes/previews and all write/release
flags off. Read-only hosted preflight is still pending those prerequisites;
resource creation is not semantic sign-off.

Safe machine evidence: [2026-11-03-bootstrap.json](2026-11-03-bootstrap.json).
