# AI & MAIN Revenue Rescue — HubSpot developer app

Vendor developer account: **AI & MAIN, 247646072**. Main Street Electric's
247646122 is the synthetic installation target, not the app-owner account.
CLI: official `@hubspot/cli` **8.19.0**, isolated under
`/workspace/.tools/ai-main-hubspot-cli`. This is not a dependency of the agent.

This app metadata uses the official OAuth marketplace template for stable
platform **2026.09**, with all CRM write scopes removed. It has no serverless
functions, CRM UI cards, workflows, MCP connector or additional features.
The Cloudflare agent remains the reasoning/orchestration runtime.

The required app scopes are `oauth` and `crm.objects.contacts.read`.
HubSpot rejected the first registration because `crm.objects.notes.read` is not
available to this app, despite the build/validator passing. Registration policy
v2 removes that scope; it adds no permissions. Actual notes API capability still
requires the later owner-authorized read-only installation test. A successful
app registration is not proof of live note reads.

**Development callback only:** `http://localhost:3000` is the official template's
local development default, not a registered customer hostname. It is deliberately
incompatible with the released connector's HTTPS origin requirement. Do not
install/authorize a customer until the actual protected installation callback
is added, reviewed and verified. No guessed demo route is registered.

`distribution: marketplace` selects the OAuth app distribution model; it does
not publish a Marketplace listing, activate the website paywall or establish
customer release. Uploads explicitly skip automatic deployment.

## Secure developer access

The HubSpot CLI uses `--use-env`, `HUBSPOT_ACCOUNT_ID=247646072` and the securely
configured `HUBSPOT_PERSONAL_ACCESS_KEY`, scoped to `api.hubapi.com`. Only Developer
Projects was selected. The existing CRM service keys are untouched and unused.
CLI tracking is disabled. No key is passed as a command argument, written into
this app, or included in saved evidence. Credential configuration/cache files
are excluded from Git.

Use `node scripts/diy/hs-vendor-project.js list|validate|info|upload` from the
repository root. The wrapper enforces the fixed vendor account, project name,
OAuth type and read-only scope set. It captures raw CLI output in memory and
persists only allowlisted metadata/sanitized errors. It has no install, deploy,
release or delete action. Upload is a developer-project build only.

## Provenance

The CLI's template download failed. The same official template was fetched via
the already approved GitHub/raw-content hosts, then its minimal descriptors
were prepared explicitly. No CLI library or network policy was modified.
The CLI project validator passed with zero errors/warnings before upload. Both
uploads skipped automatic deployment. Exact build 2 was then explicitly registered
using the official CLI; independent readback confirms deployment SUCCESS and app
62702118. Build 1's unavailable-scope failure remains preserved. The wrapper still
exposes no deployment action; the registration was a bounded, manifest-hash-checked
operation. No customer installation or Cloudflare deployment occurred.
Developer credential proof, exact manifest hashes and provider results are under
`products/revenue-rescue-diy/hubspot-owner-validation/cli-project/`.
