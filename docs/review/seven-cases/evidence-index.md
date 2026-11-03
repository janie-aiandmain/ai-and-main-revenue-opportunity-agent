# Evidence index — GitHub links and associated commits

These artifacts are on `enterprise-hardening`. Pinned links identify the exact
recording commit; branch links are provided for the current review. No new hosted
or model demonstration was run to prepare this table. A read-only active-version
check confirmed all general/demo execution and fault flags false and the temporary
capability absent; see [writeback-state.json](writeback-state.json).

| Result | Where actually executed | Fault/failure provenance | Status / concrete result | GitHub artifact and associated commit |
| --- | --- | --- | --- | --- |
| Normal task creation and repeated submission | Original hosted Worker + real synthetic HubSpot portal | No injected fault | PASS: task `415102198520`, one application create attempt; repeat matched same task | [Hosted receipt](https://github.com/janie-aiandmain/ai-and-main-revenue-opportunity-agent/blob/418272fc04639e7f084ff107366d405b2aa2eca0/docs/demo-recovery-evidence/hosted-success.json); evidence `418272f`, deployed implementation `bf7f367` |
| Successful creation, response discarded, hosted DO restart and original Worker redeployment, read-only reconciliation | Original hosted Worker + existing remote SQLite namespace + real synthetic HubSpot task | **Injected application-layer response discard** and deliberate operator restart; **not** a naturally occurring network outage | PASS for this controlled scenario: task `415333966522`, one create attempt, no task ID/success in pre-restart ledger; changed boot ID; same task reconciled | [Full trace and hashes](https://github.com/janie-aiandmain/ai-and-main-revenue-opportunity-agent/blob/418272fc04639e7f084ff107366d405b2aa2eca0/docs/demo-recovery-evidence/hosted-success.json); evidence `418272f`, implementation `bf7f367` |
| Changed payload rejects prior approval | Hosted controller and remote durable ledger | Deliberate priority change, not a naturally occurring failure | PASS: HTTP 409, zero create attempts for changed case | [Hosted receipt](https://github.com/janie-aiandmain/ai-and-main-revenue-opportunity-agent/blob/418272fc04639e7f084ff107366d405b2aa2eca0/docs/demo-recovery-evidence/hosted-success.json); evidence `418272f`, implementation `bf7f367` |
| First operator-readiness gate failure | Hosted deployment/control harness, before HubSpot tasks | **Naturally encountered setup/runtime-readiness failure**, not the injected recovery scenario | Failed/stopped; zero tasks; subsequent fix explicitly activates control-settings versions | [Immutable attempt 1](https://github.com/janie-aiandmain/ai-and-main-revenue-opportunity-agent/blob/418272fc04639e7f084ff107366d405b2aa2eca0/docs/demo-recovery-evidence/attempt-1-operator-gate.json); capture `418272f`, correction `bf7f367` |
| Unsupported `redirect: "error"` during hosted preflight | Hosted original Worker; separately reproduced in local workerd | **Naturally encountered runtime compatibility defect**, not a network outage | Failed/stopped before tasks; changed to `manual` with non-success rejection; native regression passed | [Immutable attempt 2](https://github.com/janie-aiandmain/ai-and-main-revenue-opportunity-agent/blob/418272fc04639e7f084ff107366d405b2aa2eca0/docs/demo-recovery-evidence/attempt-2-native-fetch-preflight.json); capture `418272f`, correction/test `bf7f367` |
| 110 automated tests, including native workerd preflight and absent/ambiguous/mismatched readback blocking | Local Node/SQLite and workerd fixtures | Synthetic responses / deliberately constructed negative states | PASS locally; not hosted HubSpot negative-scenario certification | [Manifest recording test results](https://github.com/janie-aiandmain/ai-and-main-revenue-opportunity-agent/blob/418272fc04639e7f084ff107366d405b2aa2eca0/docs/demo-recovery-evidence/manifest.json); results `418272f`, [test source](https://github.com/janie-aiandmain/ai-and-main-revenue-opportunity-agent/blob/bf7f36751251868317e0816639a60872167dae6f/tests/demo-recovery.test.js) `bf7f367` |
| Earlier general note→finding→review→approved-task and interrupted-write checks | Local workerd + separate SQLite HTTP fixture | **Simulated remote effects/failures** and synthetic actors | Local proof only; fixture task IDs are not HubSpot task IDs and synthetic actors are not human verdicts | [Local receipt](https://github.com/janie-aiandmain/ai-and-main-revenue-opportunity-agent/blob/c1603282adea6ddcbfb4bd94efcf3b41cf41fc71/docs/integration/worker-validated.json); `c160328` |
| Corrected v0.3.2 model output on 31 original + 16 unseen cases | Non-production model API with synthetic corpus; not the hosted control task flow | Model outputs; prior captured semantic concerns preserved | 31/31 original decision checks, 16/16 unseen actionability checks; semantic judgments remain pending | [Model capture](https://github.com/janie-aiandmain/ai-and-main-revenue-opportunity-agent/blob/c1603282adea6ddcbfb4bd94efcf3b41cf41fc71/docs/integration/model-v0.3.2-run1.json); [result summary](https://github.com/janie-aiandmain/ai-and-main-revenue-opportunity-agent/blob/c1603282adea6ddcbfb4bd94efcf3b41cf41fc71/docs/integration/results.json); `c160328` |
| Final active deployed flags and capability cleanup after hosted run | Read-only Cloudflare metadata + closed-control/health probes | No injected fault | Active version `50ddf101-5484-413a-975a-12865e35e14d` at 100%; seven flags false; capability absent; existing namespace unchanged | [Independent final verification](https://github.com/janie-aiandmain/ai-and-main-revenue-opportunity-agent/blob/418272fc04639e7f084ff107366d405b2aa2eca0/docs/demo-recovery-evidence/independent-final-verification.json); `418272f` |

**Not demonstrated:** a naturally occurring network outage, live zero/multiple/
mismatched recovery matches, arbitrary live-note semantic safety, or verified
business revenue. No revenue rescued is claimed. The seven pending cases did not
create the two hosted control tasks and were not semantically approved by them.

Current branch links:

- [Hosted evidence package](https://github.com/janie-aiandmain/ai-and-main-revenue-opportunity-agent/tree/enterprise-hardening/docs/demo-recovery-evidence)
- [Hosted report](https://github.com/janie-aiandmain/ai-and-main-revenue-opportunity-agent/blob/enterprise-hardening/docs/demo-recovery-evidence/README.md)
- [This seven-case review packet](https://github.com/janie-aiandmain/ai-and-main-revenue-opportunity-agent/blob/enterprise-hardening/docs/review/seven-cases/README.md)
- [Pending human-verdict ledger](https://github.com/janie-aiandmain/ai-and-main-revenue-opportunity-agent/blob/enterprise-hardening/docs/review/seven-cases/human-verdicts.json)

Use the pinned recording commit for reproducing a result. Deployed implementation
commits and evidence-recording commits are separate above. New human decisions
will receive their own Git commit after the user provides them; this packet does
not invent that future commit, verdict or reviewer identity.
