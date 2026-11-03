# Hosted demo recovery — executed evidence

Executed 2026-11-03, approximately 16:24–16:25 EST. Independent closure check at
16:26 EST. Source commit `bf7f36751251868317e0816639a60872167dae6f`. Original demo Worker:
`ai-and-main-revenue-opportunity-agent`. Portal **247646122**, contact
**582095692487**. Both existing credentials' portal identities, the exact
`AI_MAIN_CERTIFICATION_ONLY` marker and task-read ability passed before execution.

| Actually executed scenario | Actual HubSpot task ID | Application create attempts | Result |
| --- | --- | --- | --- |
| Normal approved creation, then repeated submission | `415102198520` | 1 | Same task; exact readback confirmed twice |
| Successful create response deliberately discarded, hosted restart/redeployment, reconcile and repeat | `415333966522` | 1 | Same task; no second create |
| Changed priority after approval | none | 0 | Old approval rejected with HTTP 409 |

Exactly **two** labeled synthetic tasks were observed, each with one matching
correlation candidate, within the maximum authorization of three tasks. The
application's durable attempt counter is two; this is not an independent count of
network packets or HubSpot internal audit events. Earlier failed/preflight runs
created zero tasks. No cleanup deleted or modified either created HubSpot task.

## Exact approved hashes and action versions

Normal operation: `demo-op-e898d287-0ef3-4830-aba6-018727436b29`.

- Approved final-request hash: `sha256:90ba4e84560b2a4e1dacaec09eddcd8b9df0e253d64dbcc9e5e6222ca933308c`
- Action version: `demo-final-action-v1:sha256:8de6d3fd2c52d7599881c5c7e5334e6260984b27c9e929dd3fc8165e7c896509`
- Correlation: `ai-main-demo-a3e9b28d-4b43-4ce9-9929-b057ab883b9b`

Loss/recovery operation: `demo-op-e92dc018-2e9d-4441-8a76-62127f6313c5`.

- Approved final-request hash: `sha256:8b328b41f66e584d2f536b7ec8e4ebd1438426368db183a1e1e38c9a92178bad`
- Action version: `demo-final-action-v1:sha256:9cf2e28e8d5ed67736ba45c7364298fe32715ca823c193095bb15a0291857cb9`
- Correlation: `ai-main-demo-c8a90ef1-7f0b-403a-86f2-0f613b9331db`

Changed-payload operation: `demo-op-8c80f86e-de3c-46d6-82e7-e24d515f64d1`.

- Previously approved hash: `sha256:ac839582963d710325bacd0ea9dc1b3cbd83ec193ccd83a32aa67b9ea55467d4`
- Changed hash: `sha256:33c42e703ffd148250409d02a571a44de3e8f00da4e48af451b7be3bbff4049e`
- Revision: 1 → 2; prior grant rejected; zero submissions.

The complete approved requests, including every task property, due time,
association, URL, portal, correlation and contract, are in
[hosted-success.json](hosted-success.json), along with approval events/IDs,
source hash and every recorded durable trace. The controls are deterministic
synthetic cases, not findings from the seven pending semantic cases. Approval
kind is explicitly USER_AUTHORIZED_SYNTHETIC_CONTROL, not human semantic sign-off.

## Durable remote recovery proof

The LOSS trace shows operation/correlation/payload persistence, exact approval and
`SUBMISSION_INTENT_DURABLY_PERSISTED` before POST. After successful HubSpot create,
the controller intentionally discarded the response without reading/persisting a
task ID or recording success. The captured pre-restart ledger is SENDING, remote
ID null, one attempt. This was **injected application-layer response loss**, not
a real network outage or a claim of transport-failure certification.

The run's hosted Durable Object was explicitly aborted through the operator-only
fault control, and the original Worker was redeployed. The boot ID changed from
`5f7b7f34-a10a-4d33-a030-4978cede55d6` to `93c5ade7-8a63-462b-ad35-a952818c097a`.
After restart, the same durable operation was UNKNOWN with
`RESTART_RECOVERED_UNCERTAIN_NO_CREATE`. Task execution and fault injection were
already disabled while the read-only reconciliation ran.

Readback scanned correlation candidates, retrieved each candidate's requested
properties and contact associations, and required one exact match. It confirmed
task `415333966522` with the same approved payload hash. Repeated submission
again performed read-only reconciliation. The attempt count stayed one. Complete
per-event timestamps, boot IDs, task IDs and match-proof hashes are in the receipt.

## Existing storage and cleanup verified

The supported cross-Worker binding resolved on the hosted original Worker to
SQLite namespace **16dca25759494a33813d2800f3f1a850**, class `CertificationLedger`,
owner `ai-and-main-revenue-opportunity-staging`. The caller needed no migration;
the owner's existing migration remains **certification-v1**. Namespace IDs before
and after are identical: no namespace was added, transferred or deleted. No
Access setup or permission expansion occurred. The owner's public URLs stayed off.

The durable run is closed. All four general write/release flags and all three
demo control/execution/fault flags are false. The temporary operator capability
was removed. An independent GET check of active version
`50ddf101-5484-413a-975a-12865e35e14d` at 100% confirmed all seven false, no capability,
and the same namespace binding. The disabled demo-control probe returned HTTP 503
`demo_control_disabled`; health reports general CRM writes disabled.
See [independent-final-verification.json](independent-final-verification.json).

## Limits and retained failures

- 110/110 local tests pass, including nine new tests and a native workerd fetch
  regression. Original and owner Worker dry-run builds passed.
- Live absent, ambiguous and mismatched recovery outcomes were not deliberately
  produced in HubSpot; their fail-closed behavior was tested locally. No automatic
  second-create code path exists for an attempted operation. Genuine network
  outages, arbitrary reasoning correctness and customer readiness remain untested.
- No model calls occurred. All previous fixtures/baselines/captured failures are
  preserved. Seven semantic decisions remain pending; these controls do not
  bypass or satisfy those reviews.
- No opportunity amount or verified revenue outcome was recorded. Revenue rescued
  remains null; a created task is not evidence of business revenue.
- The initial operator-readiness failure and subsequent native-fetch failure are
  retained verbatim in separate receipts. The latter was reproduced in workerd:
  `redirect: "error"` is unsupported. The adapter now uses `manual` and rejects
  non-success statuses; runtime control settings are explicitly activated.

[manifest.json](manifest.json) provides hashes for all immutable receipts. The
per-run three-attempt cap does not grant another three tasks on an unrelated new
run. This authorized demonstration is complete and closed; do not rerun the live
harness under the old task budget. Further task writes require an explicit scope.
