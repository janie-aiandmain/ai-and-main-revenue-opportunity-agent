# Approved label correction — actual closed demo deployment

The user directed “great, let's get this done” after all three reviewed cards
(both runs, six exact outputs) received semantic PASS. The existing bounded demo
authorization permits this closed deployment; no new task approval is inferred.

The private owner `ai-and-main-revenue-opportunity-staging` now runs reviewed
source `70c09ab49fc668f2ccb5afa6fcde8febf14a1ca9`, materializer v0.3.12 and evidence
policy v1.3. Active version: `99679b73-7a80-4ec1-933b-b1d9ea21495e`, 100% traffic.
Actual deployed module hashes match the local build. The source review-integrity
check passes all six human PASS bindings; the prior 229-test/207-workflow/two-call
validation is preserved rather than rerun without a generator change.

The account-scoped metadata confirms account cda2ab71dd8127c8031c945a738b86e2.
All four owner Secret names, ordinary identity/tenant/notification settings and
the existing CertificationLedger namespace are preserved. No Secret values were
read. The owner hostname and previews remain disabled. The gateway remains at
version e6c3b663-decb-4f3c-8186-5807d5bc57b3 with unchanged code, settings, Access,
Secret names, storage binding and public hostname. All nine general/legacy/test/
fault/release execution flags are false on both Workers. Operator email remains
enabled on the private owner as previously authorized and inbox-verified.

Unauthenticated console, identity, findings, execution and legacy writeback probes
all receive 302 redirects to the existing Access issuer. No HubSpot, model or
email-provider call was performed by this deployment/readback cycle. No task was
created or task approval granted. Storage identity is verified; live ledger task
contents still require the signed-in operator receipt. Existing EV operation/task
must not be reset or recreated.

## Failed CLI follow-up and verified deployment

Wrangler's upload completed, then its newer `getWorkerSubdomain` follow-up request
to `/workers/workers/<owner>` failed with Cloudflare code 9106 and the command
exited 1. This failure is retained in [owner-deployment.txt](owner-deployment.txt);
it is not reported as a passing CLI run. Direct supported account-scoped settings,
deployments, deployed-module and subdomain reads subsequently verified the exact
active code and every required safeguard. See
[deployment-verification.json](deployment-verification.json) and
[deployment-command-result.json](deployment-command-result.json).

No deployment retry, key replacement or permission expansion was performed. The
CLI's generic suggestions for User Details/Memberships permissions are not
evidence that those permissions are needed for this bounded deployment. The
precise cause of the newer endpoint's credential rejection remains unverified.
The separate dry-run command passed. An initial local comparison treated absent
optional owner scriptName metadata differently from undefined; normalizing its
JSON representation resolved that comparison without changing any resource.

## Next authenticated gates — pending

1. Operator read-only preflight must verify role, both portal credentials, test
   contact marker and three source notes against the new owner version/source.
2. One fresh hosted evaluation must clear the synthetic-label quality failures
   and preserve the three durable finding IDs, quantities and restrictions. The
   before-work/current-job customer-action gate should remain; it is not a quality
   failure and internal verification does not satisfy it. Changed evidence/quality
   may legitimately send updated operator alerts for the new material revision.
3. The operator must prepare/review the garage task with HIGH priority, an explicit
   future internal due time and internal-verification purpose, then separately
   approve the complete final payload. No other task is requested.
4. Only after the exact approval is inspected may the existing one-create demo
   window be opened for the authorized response-loss/restart/reconciliation test.
   General writeback/release stay off. No automatic second create is allowed.

Nothing in this deployment proves the new hosted output, task approval, new
remote recovery or financial outcome. Those results remain pending.
