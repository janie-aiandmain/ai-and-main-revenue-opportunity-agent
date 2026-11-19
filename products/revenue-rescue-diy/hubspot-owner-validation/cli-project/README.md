# HubSpot vendor OAuth app registered — November 19, 2026

The published developer credential works. **AI & MAIN Revenue Rescue** now exists
as OAuth app **62702118** in vendor account **247646072**, project
`ai-main-revenue-rescue` (**318345877**), stable platform **2026.09**. Exact build
**2**, deployment **2**, succeeded. Independent official SDK readback confirms
the registered app, deployed build, required scopes and callback.

[Open existing developer project](https://app.hubspot.com/developer-projects/247646072/project/ai-main-revenue-rescue).
Do not create a second project/app or regenerate the existing CRM service keys.

## Actual configuration and remaining work

- Registered permissions: `oauth`, `crm.objects.contacts.read`. Optional and
  conditional permissions are empty. No CRM write permission was added.
- OAuth client ID (non-secret): `a3bc7d34-d746-4aaf-b3ee-bf2db1927747`.
  No client secret was retrieved, logged or configured in an installation.
- Registered callback: `http://localhost:3000`, the official development default.
  This is deliberately **not customer-ready**. The prepared connector requires
  an actual protected HTTPS origin with `/hubspot/oauth/callback`.
- Main Street Electric **247646122** is still the synthetic installation target,
  not the app-owner account. No app installation/owner consent occurred.
- A protected installation, secure client-secret/encryption-key configuration,
  actual OAuth consent and read-only API tests remain pending. App registration
  does not establish notes-read capability, PKCE behavior or a customer release.

This registration changes vendor app metadata only. There were **zero CRM calls,
CRM writes, real model calls, emails or Cloudflare deployments**. Both old Workers,
their service keys, existing demo settings and approved routine voice flow are
untouched. No Marketplace listing, customer release or website paywall was activated.

## Preserved failure and correction

| Stage | Actual result | Evidence |
| --- | --- | --- |
| Developer access | PASS; environment-only CLI auth for vendor account, initially zero projects | `developer-access-check.json` |
| Build 1 | Validator passed; upload/build succeeded; deployment explicitly skipped on upload | `validate-1795113375962.json`, `upload-1795113473363.json`, `build-readback.json` |
| Registration 1 | **FAILURE**: `crm.objects.notes.read` is unavailable to this app | `app-registration.json`, `app-registration-readback.json` |
| Correction | Remove unsupported notes scope; add no replacement permission | policy v2, `policy-v2.json`, current app descriptor |
| Build 2 | Validator passed with no errors/warnings; upload succeeded with automatic deployment skipped | v2 `validate-*.json`, v2 `upload-*.json` |
| Exact build 2 registration | PASS; explicit metadata deployment 2, independent SDK confirmation | `app-registration-build-2.json`, `registered-app-readback.json` |
| Provider settings readback | PASS; only two required read scopes, no optional/conditional scopes, localhost callback | `registered-scope-readback.json` |
| Offline tests | **333/333 PASS** using `node --test --test-isolation=none tests/*.test.js` | `validation-v2.json` |

The scope rejection happened during provider registration despite local validation
and build passing. We did not request broader permissions or contact support to
unlock the unavailable scope. The connector already accepts the two-scope read
configuration, but actual note/association reads remain a live-test gate.

Registration policy changed from `hubspot-vendor-oauth-registration-v1` to `v2`.
Exact manifest hashes:

- v1: `sha256:b629ddc793671be3b806023bf4a943adf7c562fc6e5406a84e1e95dd84325a93`
- v2: `sha256:e27c7b45db9f337cffe921e0ff74510439a5bc3942483d5e570b400152915ef2`

The original manifest review/failed build-1 registration are retained unchanged.
No reasoning prompt, findings schema, model/settings, generation or action
contract changed. No existing semantic or exact-action approval was transferred.

## Tooling failures and limits

The initial CLI template download failed; the descriptors were prepared from the
same official stable template via approved public GitHub/raw hosts. No SDK or
network-policy workaround was introduced. The CLI `lint` command rejected JSON
output, so the supported `project validate` command was used instead.

The post-upload project-list CLI returned the correct project metadata but exited
2; `info` failed because there was not yet a deployed build. Both receipts remain.
Direct SDK project/build/app readbacks establish the final status independently;
we did not conceal those CLI failures as passes.

The restricted process sandbox blocked a metadata request (`EPERM`), a validator
attempt exited 1 without a diagnostic, and Node aborted the first full test run
with an internal async-callback assertion. The same supported commands outside
that process sandbox passed with inherited network policy/TLS unchanged. This was
not a model/CRM failure or a natural network outage. The pre-registration app
metadata endpoint returned 404; after successful registration it returned 200.

All developer operations use the official CLI/SDK with environment-only auth.
Secrets never appear in command arguments, output evidence or credential config
files. Raw provider responses are filtered in memory before saving. Non-secret
app/project/client identifiers are intentionally recorded. Both uploads explicitly
skipped automatic deployment; the provider's project-default auto-deploy setting
was observed true and was not changed. Future uploads must keep the skip flag.

Human semantic review, exact CRM-action approval and final release acceptance
remain separate. No customer readiness verdict follows from this registration.
