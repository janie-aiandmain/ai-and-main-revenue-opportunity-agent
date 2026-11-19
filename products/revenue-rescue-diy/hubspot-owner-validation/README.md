# HubSpot owner connection and permitted-record processing

**Scope approved:** the user selected HubSpot first and asked to tackle secure
guided setup, processing beyond one record, and live account validation/release.
The user confirmed there is no OAuth app yet: only the two existing service keys.
MCP is not needed. No old service key is changed, extracted or substituted.

| Goal | Implemented and executed | Remaining gate |
| --- | --- | --- |
| 1. Guided owner connection | Authenticated owner screen; HubSpot OAuth authorization with S256 PKCE, one-use state, browser and actor binding; encrypted token storage/refresh/disconnect; local Worker and browser tests | Register/configure the read-only OAuth app; deploy a protected installation; execute actual owner consent |
| 2. Multiple permitted records | Owner permits contacts using their existing HubSpot links; account/record/marker validation; separate durable contexts and finding IDs; multiple independent needs; revoke/disconnect checks during reads/inference; local two-record/three-finding demonstration | Read and evaluate designated synthetic records through the actual OAuth connection |
| 3. Live account validation/release | Executable adapter, safe config generator, deterministic tests and gate checklist prepared | **BLOCKED: OAuth app absent; live OAuth credentials/redirect/host not configured. No customer release has been accepted.** |

This is a working local implementation, not another static worksheet. It is
separate from the earlier single-record shadow entry point. The deployed vendor
demo, routine synthetic voice workflow, existing credentials and production/site
configuration are untouched. No customer Worker/storage was provisioned here.

## Ordinary owner workflow

The owner signs in through the configured external Access provider. The fixed,
verified owner email maps to Admin only after the token's signature, issuer,
audience and expiry are checked. Other users retain explicit Viewer/Approver/Admin
subject mappings. No passwords or new user-management system are introduced.

1. Click **Connect HubSpot** and authorize on HubSpot's own screen.
2. The server verifies the returned account against the installation's approved
   portal. A wrong account fails; credentials are never substituted.
3. Paste links to the contact records this installation may process. Only the
   approved portal and supported contact type are accepted. During validation each
   contact must have the exact synthetic marker. This is a narrow processing
   permission list, not contact search, profiles or CRM administration.
4. Evaluate one record or the finite permitted list. The default maximum is 25
   (administrator configurable 1–100). Each explicit evaluation invokes the
   existing model; Refresh reads stored findings without invoking the model.
5. Inspect finding-specific evidence, dates, restrictions, recommendation and
   pending review state. Separate needs and separate records cannot share one
   finding as a shortcut. No note, task, alert or customer action can execute.

Initial infrastructure/Access/app configuration remains an implementation step.
The owner-facing application requires no terminal, tokens, SQL or Cloudflare
editing, but **automatic paid provisioning of a new customer's installation has
not been built**. Do not market that bootstrap as completed DIY self-installation.
Each installation uses its own Worker/environment, ledger namespace, encrypted
grant and encryption key. There is no shared customer CRM database.

## Connection and authority safeguards

- Fixed callback derived from the trusted installation origin; no caller-supplied
  redirect or arbitrary target. OAuth state lasts ten minutes, is stored hashed,
  bound to the verified actor and an HttpOnly/Secure/SameSite=Lax browser cookie,
  and consumed/flushed before a token request. PKCE verifiers are encrypted.
- Access/refresh tokens are encrypted with AES-256-GCM and installation-bound
  additional data using a separate Cloudflare Secret. Tokens, client secrets,
  authorization codes and PKCE verifiers are not returned to the UI or audit log.
  API tokens are sent in headers/form bodies, never token-info URLs.
- Refresh is durably single-flight, verifies the portal and blocks on uncertainty.
  Cold restart during refresh requires reconnect rather than blind refresh replay.
- A changed installation/portal/origin/OAuth client/owner/Access realm/scopes/test
  data policy invalidates the connection binding. Permission versions and
  connection generations guard every source read and model result, including
  changes during awaited I/O. Old results are not silently reused after regrant.
- Disconnection erases local tokens and permissions immediately. **Provider-side
  grant revocation is separate:** the owner removes the app in HubSpot. No claim
  is made that local disconnect uninstalls/revokes the provider grant remotely.
- All CRM write, note, task, email, test/fault and general-release flags are false
  in the new profile. Its public router has no action-approval/execute/voice path.
  Allowing a record, OAuth consent or semantic acceptance is never execution approval.

The shared prompt `reasoning-v0.3.3`, schema `findings-v0.2`, materializer
`source-evidence-v0.3.12`, provider model/settings and proposal/final-action hashes
are unchanged. The only shared adapter edit adds an optional trusted server-side
read transport to the existing note reader; normalization, dates and evidence are
unchanged. Existing service-key callers retain their required key and behavior.
No fresh provider inference is claimed or required to test that transport change.

## Executed evidence and limits

[local-owner-workflow.json](local-owner-workflow.json) is an executed workerd/
SQLite and actual Chromium flow with **synthetic outbound provider services**.
It demonstrates state/PKCE, token refresh, two permitted contacts, three independent
findings, stable repeat identity, restart persistence, browser processing and
revocation/disconnection. All review states remain PENDING; zero human approvals,
live HubSpot calls, real model calls or CRM effects occurred. The fixture edge
supplies a fixture-signed Access assertion; it is not a real user/HubSpot consent.

[local-owner-workflow-attempt1.json](local-owner-workflow-attempt1.json) preserves
the first harness failure: automatic redirect following produced 200 where the
check expected 303. The harness now inspects the redirect manually. It was not a
live outage or a CRM failure. See `validation.json` for command results and hashes.

No evidence here certifies live OAuth, account-specific API/plan capabilities,
provider retention arrangements, automatic provisioning, routine customer note/
task writes, Jobber, GoHighLevel or production release. Those remain explicit.
