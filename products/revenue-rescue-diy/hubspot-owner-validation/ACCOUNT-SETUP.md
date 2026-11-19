# Remaining account steps — no MCP and no replacement service keys

The user confirmed only the existing Read Only Lab / Writeback Lab service keys
exist. Codex read-only metadata inspection verified the secret names on both
existing Workers, without values: the demo gateway has the existing read/write/
model/mail secrets; the private owner has the two staging HubSpot secrets, model
secret and mail secret. Neither inspected Worker has OAuth-named bindings or
ordinary OAuth settings. Other locations were not inspected. No secret was rotated.

## HubSpot app step

The app now exists: AI & MAIN Revenue Rescue, app 62702118, vendor account
247646072, project `ai-main-revenue-rescue`, registered build 2. See
[registration evidence](cli-project/README.md). Do not create another app or key.
Open its existing developer project to inspect the actual settings controls;
do not assume a Legacy Apps screen. A service key or MCP service does not provide
owner consent. The current registered callback is development-only localhost.

Required settings, once that screen is available:

- A non-secret OAuth client ID, with the client secret retained privately.
- A registered **exact** HTTPS redirect URI:
  `https://<protected-installation-host>/hubspot/oauth/callback`.
  No new installation hostname is deployed yet. Do not register a guessed callback
  against the original demo or enable a public hostname without Access coverage.
- Authorization-code flow with S256 PKCE. The published stable v1 token API
  explicitly accepts `code_verifier`; actual app/authorization-screen behavior
  still requires the live flow. App availability/distribution/plan restrictions
  are not inferred from the service-key account.
- Read-only permissions. This app's actual registered read set is `oauth` and
  `crm.objects.contacts.read`. HubSpot rejected `crm.objects.notes.read` as
  unavailable during the first registration. The corrected build removes it;
  the prepared connector already accepts this two-scope configuration. The
  configured request must match the app's reviewed read set. It never requests
  CRM write, task, deal, billing or contact-edit scopes. Actual notes API capability
  remains unverified until owner consent/read-only testing. Do not add broad writes
  to fix a 403 or claim registration proves note access.

The app's actual read-only scope configuration must be reviewed before enabling
the Connect button. Token responses with a scope list must match the approved
read set. If the provider omits scope metadata, status explicitly reports
APP_CONFIGURATION_REVIEW_REQUIRED_NO_TOKEN_SCOPE_CLAIM. Successful reads prove
those capabilities, not the absence of all other provider grants.

## Secret fields versus ordinary settings

On the **new customer installation only**, Cloudflare → Workers & Pages → the
specific customer Worker → Settings → Variables and Secrets:

| Name | Type | Secure entry/source |
| --- | --- | --- |
| HUBSPOT_OAUTH_CLIENT_SECRET | Secret | Copy from the OAuth app's secure settings directly into the Secret field; never chat/Git/command arguments |
| HUBSPOT_TOKEN_ENCRYPTION_KEY | Secret | Unique cryptographically random 32-byte key, base64 encoded; generate/configure through the secure implementation path, never ask the owner to send it |
| EVAL_OPENAI_API_KEY | Secret | Existing appropriate non-production project for synthetic validation; do not generate a replacement merely because a binding is unavailable locally |
| HUBSPOT_OAUTH_CLIENT_ID | Ordinary variable | Non-secret OAuth app ID |
| HUBSPOT_OAUTH_SCOPES | Ordinary variable | Exactly the reviewed read-only scopes |
| HUBSPOT_OAUTH_APP_READ_ONLY_CONFIRMED | Ordinary variable | True only after actual app configuration review |
| HUBSPOT_PUBLIC_ORIGIN | Ordinary variable | Exact protected HTTPS installation origin |
| HUBSPOT_INSTALLATION_ID / HUBSPOT_EXPECTED_PORTAL_ID | Ordinary variables | Fixed reviewed installation/account identifiers |
| HUBSPOT_OWNER_EMAIL | Ordinary variable | Fixed owner identity supplied by the verified Access provider |
| ACCESS_ISSUER / ACCESS_AUDIENCE | Ordinary variables | Actual Access application issuer/AUD covering this installation |
| HUBSPOT_TENANT_REVIEWED | Ordinary variable | True only for the reviewed installation/portal |
| HUBSPOT_SYNTHETIC_RECORDS_ONLY | Ordinary variable | True for current validation |

Cloudflare → Worker → **Bindings** separately holds HUBSPOT_CUSTOMER_LEDGER,
pointing to that installation's HubSpotCustomerLedger Durable Object namespace.
The new namespace/migration is a prepared deployment plan, not an existing resource.
Do not repoint either existing demo binding or copy a real customer's credentials.

The deployment identity needs account-restricted Workers Scripts edit capability
for the chosen isolated installation and its migration; no KV, D1 or DNS/route
expansion is needed for the dark workers.dev template. Cloudflare account tokens
may affect multiple Workers, so the script name itself is not a credential boundary.
Customer owners never receive that deployment token or administer infrastructure.

## Hosted sequence after app configuration

1. Prepare the separate installation using `prepare-hubspot-owner.js`; verify all
   effects and public/preview URLs off. Add its secrets securely; preserve the old
   Workers and their routine demo behavior.
2. Configure All traffic Access for the exact host and every path. Confirm issuer,
   audience and restrictive owner identity policy. Enable only that protected
   host after verification; disable immediately if anonymous access is effective.
3. The actual owner signs in and connects the designated non-production portal.
   Verify account identity and read permissions through OAuth, not service-key fallback.
4. Permit at least two labeled synthetic records. Demonstrate separate finding
   sets and independent needs, original dates/restrictions, repeated identity,
   permission removal and disconnect. Keep every CRM mutation disabled.
5. Review source/version-bound evidence and make a genuine release decision for
   the tested scope. A read-only release does not enable task/voice writes or
   certify the full paid product, commercial terms or automated provisioning.

An app/client ID, namespace, connected badge, local PASS or a paid checkout cannot
substitute for the actual hosted evidence. No keys, JWTs, cookies or tokens should
be sent to chat to complete these steps.
