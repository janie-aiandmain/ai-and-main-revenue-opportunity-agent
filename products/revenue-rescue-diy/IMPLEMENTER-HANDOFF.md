# Technical preparation — separate from the owner's guide

The new entry point is `src/diy/hubspot-worker.js`. It reuses the existing
CertificationLedger class and reasoning/review implementation; no model prompt,
schema, inference settings, evidence/recommendation/action generator or existing
Worker configuration is changed. It supports only synthetic shadow evaluation
in a different approved HubSpot account. No live customer connector is certified.

Prepare a non-secret JSON object with: cloudflareAccountId, unique workerName,
portalId, contactId, accessIssuer, accessAudience, roles (verified subject to
Viewer/Approver/Admin), nonProductionPortalConfirmed and tenantReviewed. Do not
put credentials, JWTs or customer data in this file. The generator rejects unknown
fields and both vendor demo IDs. No default grants a tenant review.

```sh
node scripts/diy/prepare-hubspot.js /secure/nonsecret-input.json /tmp/customer-preview.jsonc
```

The generated file is relative to the repository root and contains a separate
single-tenant Worker/class binding/migration plan, workers_dev false, previews
false, keep_vars true, synthetic records only, mail/voice/task/fault/release flags
false. This prepares source; it neither provisions a namespace nor deploys it.
Do not apply it to either existing demo Worker or namespace.

For actual preparation of an authorized customer test installation, copy the
generated config to a temporary root-relative config or set its `main` to the
absolute path before a Wrangler dry run. A separate Cloudflare account/namespace
and existing Access configuration must be confirmed before deployment, which is
not performed by this handoff.

Existing internal secret names remain STAGING_HUBSPOT_READ_TOKEN,
STAGING_HUBSPOT_WRITE_TOKEN and EVAL_OPENAI_API_KEY for compatibility; the namespace
and credentials must belong to the new isolated installation, not AI & MAIN's
demo. Both CRM credentials are checked against the configured portal, with the
writer used only for its account-identity GET in this read-only profile. No write
permission is presumed needed for this preview; verify each credential type's
actual account/contacts/notes/task-read abilities and stop rather than expand
scopes. Check the synthetic marker AI_MAIN_CERTIFICATION_ONLY on the test contact.

The profile has no public action-approval, execute, voice, legacy or fault route.
Its ledger class is reused privately; closed flags and the public route allowlist
prevent broadening. Its simple console displays findings/source quotes/timestamps,
with no misleading task-create controls. A live connector needs its own released
entry point and authority review before adding writes or voice.

External identity is signature/issuer/audience/expiry verified by the existing
gateway. A setup plan or JSON subject map is not identity verification. Deploy
dark first; configure Access for all paths, verify anonymous denial/redirect,
then expose only the protected host under separate deployment authority. Read
preflight and exact target tests precede evaluation. Model access and charges
remain account-specific; test doubles are not proof of provider access.

This technical preview is a step toward removing the fixed-demo limitation.
It is not the no-code connection/provisioning experience required for a DIY sale.
