# Authorized protected staging hostname — blocked before enabling

Checked 2026-11-03 at 15:41 EST. The user explicitly authorized enabling only
`ai-and-main-revenue-opportunity-staging.ruddy4learning.workers.dev`, under the
configured All traffic Access policy, with previews and all write/release flags
still disabled. Production changes and task creation remain unauthorized.

## Actual checks and blockers

Cloudflare management GETs confirm the staging Worker remains disabled at
workers.dev, previews remain disabled, and all four flags are the text `false`.
No remote mutation occurred. The supplied dashboard screenshots show the staging
Worker as the Access destination covering its production and preview URLs, and
All traffic with account-members Allow. Those screenshots do not replace the
requested independent edge check.

The account-scoped Access application-list GET succeeded but returned **zero
applications**. There is no returned application matching the configured AUD tag.
This is an unresolved application lookup, not proof that the dashboard policy is
absent, that a credential was rejected, or that new/expanded permissions are needed.
The non-secret application UUID from the Access application's dashboard URL or
Details section is needed for a direct lookup. No token was rotated or broadened.

The Codex enforced network list also lacks the exact staging hostname and issuer.
A network-only environment draft was saved successfully, preserving all three
existing custom hosts and adding:

- `ai-and-main-revenue-opportunity-staging.ruddy4learning.workers.dev`
- `falling-cell-9501.cloudflareaccess.com`

The tool returned `requires_publish: true`. Review/save these network changes in
Codex environment settings and publish the environment; draft persistence does
not apply the network policy. This changes Codex access only, not Cloudflare's
Worker egress, Access policy or secret scopes.

## Prepared work and deliberately unexecuted checks

An ignored local candidate `.staging/wrangler.access-pending.jsonc` pins the
approved Cloudflare account and proposes `workers_dev: true`, with previews false
and all four flags false. Its Worker dry-run build passed. The candidate was
**not deployed**. `wrangler.staging.jsonc` remains false, matching the actual closed
hostname until protection can be established; do not deploy the pending candidate
blindly after a refresh. The minimal intended configuration diff is shown below.
The ordinary-settings generator also still closes workers.dev; update its behavior
alongside the source configuration only when the protected-hostname gate succeeds.

```diff
--- a/wrangler.staging.jsonc
+++ b/wrangler.staging.jsonc
@@
-  "workers_dev": false,
+  "workers_dev": true,
   "preview_urls": false,
```

Unauthenticated URL probes were not executed and are not passing evidence. A
network-policy rejection must never be counted as Access protection. Once access
is available, first confirm the app's Worker-wide destination and policy, then
enable staging only and probe `/`, `/health`, `/operator`, certification and nested
paths with no cookies/Authorization, without following redirects. Confirm an
Access redirect to the expected issuer/audience or a verified Access denial;
application errors and generic proxy denials do not establish edge coverage.
Finite probes supplement the policy-scope check; they do not prove all possible
paths individually. If protection is ineffective or cannot be established after
enabling, disable that hostname and previews immediately and verify the rollback.

Authenticated `POST /certification/preflight` is also **not executed**. A verified
operator subject/mapping, authenticated session and tenant configuration remain
missing. Test portal/contact stay `247646122` / `582095692487`; the separate
production-portal existence/ID question remains pending. Never invent an exclusion
ID. No HubSpot/model call, CRM write, production change or human approval occurred.

Safe evidence:
[2026-11-03-protected-hostname-blocked.json](2026-11-03-protected-hostname-blocked.json).
