# Closed diagnostic deployment evidence

On November 17, only the existing synthetic demo gateway and private ledger owner
were updated to source `bef3d71276b94c7d398225487c2ecbc36f35bd71` on
`enterprise-hardening`. No main merge, customer rollout, credentials, permissions,
routes, Access policy, namespace or migration changed. No HubSpot/model/mail API
was called. No previous approval/task/recovery operation was reset or reopened.

1. Explicitly fetched the hardening ref (the checkout's default fetch refspec
   updates main only); actual remote/local baseline was identical at b351e37.
   Pushed the tested source commit before uploading it.
2. Read current Cloudflare metadata in account
   `cda2ab71dd8127c8031c945a738b86e2`. Verified the exact prior closed versions,
   nine false controls, original tenant, private owner/public protected gateway,
   preview state, namespace/class and Secret names. [Before](before-deployment.json).
   Temporary configs merged only ordinary existing settings plus the new source
   tag; no Secret values were read or placed in a file or command.
3. `wrangler versions upload` succeeded for both Workers. The uploaded candidate's
   ordinary settings, disabled controls, Secret names and namespace bindings were
   compared against the immutable prior active version before activation. Existing
   version/deployment APIs activated each version at 100%; no scope expansion or
   trigger deployment was needed.
4. Downloaded actual active JS modules and compared their byte hashes against the
   corresponding upload bundle. Verified current hostname/preview state and all
   preserved settings/bindings. [Owner](deployment-owner.json),
   [gateway](deployment-gateway.json).
5. Unauthenticated HTTP checks all returned 302 to the existing Access issuer.
   No protected handler or CRM endpoint was reached. [Access](access-check.json).

## Failed checks retained honestly

The initial read-only helper compared an explicitly undefined optional
`scriptName` field with an omitted JSON field. It stopped before preparing or
mutating any deployment. Corrected the verifier to compare required namespace
identity fields; the actual namespace/class had not changed.

After the successful owner activation POST, an immediate deployment GET briefly
returned the prior version. That assertion command exited 1. A subsequent read
showed the new version active at 100%. No second activation POST was made for the
owner. Verification then downloaded the new active module and proved an exact
match. The gateway activation/readback also completed successfully. This was a
Cloudflare metadata consistency delay, not a HubSpot fault or recovery exercise.

The default restricted test attempt also failed to run some local/native test
processes. Repeating the unchanged full suite with authorized local execution
permissions passed all 233 tests; both dry-run builds passed. The separate local
Worker matrix passed 38/38 and survived a runtime restart. No fixture expectation
was weakened to obtain these results.

## Rollback and closure

The previous immutable closed versions are recorded in before-deployment.json:
owner `d2c840a5-de7b-4c53-bacc-10869241f651`, gateway
`66e3caac-21f7-4b8a-933c-b9d8abb10357`. A rollback can activate those versions using
the existing deployment API, then read back code/bindings/controls/Access. Do not
rollback to an open test-window version or delete durable data. No rollback was
performed here. Existing task execution remains disabled on the new versions.

Actual authenticated hosted fixture execution remains **PENDING**. It requires
the signed-in operator's one console action. Passing the local matrix, uploaded
byte comparison or Access redirects does not substitute for that receipt or for
final demo release acceptance. No financial outcome has been established.

## Subsequent hosted completion

The operator has now supplied the successful 38/38 hosted synthetic report for
run negative-a8ab07ac-cc01-4836-867d-202e167e7db8, from the exact expected owner
version/source. See hosted/operator-receipt.json and hosted/receipt-check.json.
The original bytes are preserved, including their omitted opening object brace;
the parsed copy repairs only that delimiter. This is attributed operator evidence,
not an independently downloaded or signed receipt. A later independent read-only
Cloudflare check confirms the same closed active versions and unchanged settings,
bindings, Secret names and Access boundary: hosted/final-config.json. No new
deployment, model call, CRM operation or email delivery occurred in recording it.
Final human acceptance of the controlled demo remains pending.
