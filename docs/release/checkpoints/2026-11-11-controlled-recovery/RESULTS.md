# Hosted synthetic recovery — results for review

**One synthetic HubSpot task was confirmed after interruption, restart and
redeployment, using read-only reconciliation.** A repeat reconciliation returned
the same operation and task. The test window is closed; all execution/fault
flags are false. This is a controlled prototype result, not customer-release or
independent certification.

## Exact effect and approval

| Field | Recorded value |
| --- | --- |
| Portal / designated synthetic contact | `247646122` / `582095692487` |
| Source note | `420030479039`, `2026-11-11T20:35:43.354Z` |
| Durable finding | `op_902d4bd6-5675-4612-b3eb-71e7612bfd5e` |
| Operation | `operation_20a11253-37c0-4c7c-b045-e73e457d37ce` |
| Correlation | `ai-main-23c10cff-db09-4a4a-b992-7768d56a44d5` |
| Confirmed HubSpot task | **`420072115944`** |
| Application reserved create attempts | **1** |
| Matched task count for this correlation | **1**, required by the deployed exact-match reconciler |
| Complete payload hash | `sha256:3e47aa2d7a4cf8a8a4d9d247d8b8719a73cf755b99c7fd42241da41a396f78b6` |
| Action version | `final-action-v1:sha256:aaa3acc1739959c702f2b24f95ccdcd316a4819c5333c28914cec9d4784f184b` |
| Internal task due | November 12, 2026, **3:41 p.m. Eastern**; no customer deadline |
| Existing selected approval | `approval_24149546-c59e-4594-9f21-2e22674f3e42` |
| Approval validity | November 11 **3:51:04 p.m. Eastern** to November 12 **3:51:04 p.m. Eastern** |

The complete request was [prepared and independently rehashed](../2026-11-11-hosted-finding/prepared-request-check.json).
The operator supplied the signed-in approval/resumption receipt; source, payload,
review, identity domain and original expiry were revalidated without issuing a
new grant. The task is internal pricing preparation only, clearly labelled
synthetic, with the original quantity and restrictions. No communication,
scheduling, billing, work, contact/note/deal/pipeline mutation was authorized.

## Gate-by-gate evidence

| Gate | Result | Executed evidence and limitation |
| --- | --- | --- |
| Captured failures and semantic review | PASS preservation; PENDING revised human verdicts | Original seven-case/nine-finding captures and five PASS/four CONCERN decisions remain hash-bound. Revised drafts and UV11 remain pending. The new missing-marker failure is also preserved as an immutable fixture. |
| Complete final-payload approval | PASS for this task | Operator-supplied exact preview/approval; offline payload rehash; same-actor/source/payload resumption. Mandatory fresh model/source validation passed before the reserved POST. Changed/expired approvals have local regression coverage; a changed-payload replay was not newly performed against this hosted operation. |
| Durable intent and recovery | PASS for this operation | Intent and attempt persisted before submission; restart into UNKNOWN; execution closed; hosted redeployment; exact read-only match to task `420072115944`; repeat reconciliation returns the same task. No second create was used. |
| Explicit injected-discard audit marker | CONCERN in executed source; correction local-tested/deployed | The control was armed, but the post-create discard event is absent from the original trace. Actual workerd reproduced unflushed-write rollback on immediate reset. The flush correction is tested and deployed closed; a new hosted post-create exercise of that correction has not been run. No natural network outage is claimed. |
| Model correctness | PASS bounded positive control; population/semantic limits remain | One designated synthetic note, first evaluation plus mandatory pre-submit evaluation. First displayed output preserves evidence/scope; pre-submit validation retains the approved material snapshot. No new prompt/schema/model change occurred. |
| Financial/outcome separation | PASS bounded task-result separation; no revenue established | One [deduplicated task result](deduplicated-results.json), no verified financial attribution. Task existence is not revenue rescued. Remote financial-ledger contents were not queried for this package. |

## Restart and reconciliation trace

1. Durable operation persisted: **20:42:23.350Z**.
2. Three approval clicks for the same payload: **20:49:49.117Z**,
   **20:50:00.701Z**, **20:51:04.537Z**. These are three approval events, not
   three task creations. The off-screen UI feedback defect was corrected.
3. Synthetic loss control armed: **21:21:38.071Z**.
4. Attempt reservation and POST intent persisted: **21:21:43.448Z**.
5. Restart recovered uncertain state without creation: **21:21:44.127Z**.
6. Test execution closed on both Workers and code/configuration verified.
7. Read-only reconciliation started: **21:35:38.095Z**; exact existing task
   confirmed with no create: **21:35:39.224Z**.
8. The operator repeated reconciliation and received the same confirmed ID.

Times above are **November 11, 2026 UTC**. The create-intent time is 4:21:43 p.m.
Eastern. Boot IDs changed from `161ad1fd-9ad7-4304-991c-502b28a0f5fe` before
submission to `560155d1-7591-45c3-b283-12c773de8fdf` after the first restart,
then `b5c134aa-3d7b-40cd-ba0f-1087b2ba5d24` after the closed redeployment.

The [full confirmed receipt](operator-reconciled.json) retains revision 1, exact
request/hash/version and create-attempt count 1. The [repeat receipt](operator-repeat-reconcile.json)
contains the operation/state/task summary; it did not independently resupply the
counter/hash. The repeat route is read-only and returns the existing confirmed
operation. This run does not establish a new hosted repeated-POST test or
universal exactly-once behavior.

## Evidence provenance

- **Direct provider checks:** actual active code hashes, configuration, Secrets'
  names/types, identity mapping, namespace, disabled controls and Access redirects.
- **Operator-supplied hosted evidence:** authenticated preflight, finding,
  approval, operation and reconciliation JSON copied into this conversation.
  These are not direct Codex-authenticated CRM requests or independent attestations.
- **Local executed evidence:** Chromium/workerd/SQLite tests and fixtures. Their
  synthetic identities/tasks are not real human sign-off or HubSpot effects.
- **Fault evidence:** the deliberately selected control is recorded as armed.
  The original post-create discard marker was lost; this gap is retained. The
  [native flush regression](fault-marker-correction/README.md) proves the local
  cause/correction without rewriting the hosted history.

## Code, tests and current closed deployment

The task/recovery exercise executed source **203f48c96cb8e8c16ee4dc54fb4a7b9d92943240**.
The subsequent storage-only correction executes source
**34a7b4257c3c491c8a89f34e29ff0c01fbdd9ee8** and is
[code-verified with all controls false](fault-marker-correction/deployment/active-code-verification.json):

- Demo deployment: `91d1135c-054e-4614-aa45-74401ba060d0`.
- Owner deployment: `76c27653-bb40-45cb-8ef1-50883e6a0976`.
- Existing SQLite namespace/class unchanged:
  `16dca25759494a33813d2800f3f1a850` / `CertificationLedger`.
- All nine demo and six owner execution/fault flags false; owner hostname and
  all previews off; Access redirects verified; Secrets/Approver mapping preserved.
- **156 tests passed**, both builds passed. No added permissions, credentials,
  hosted resources, production release, environment publication or main merge.

The new `durable-discard-before-reset-v1` helper flushes the consumed control and
diagnostic event before intentional reset. It was exercised in actual local
workerd, not in another live post-create run. No additional CRM write was used
to validate it.

## Model use and remaining review

Tracked cycle use is **208/210**: 206 prior calls, one hosted initial evaluation,
one mandatory hosted pre-submit evaluation. Reconciliation, UI corrections and
storage probes made no paid model calls. Hosted token/provider-response telemetry
was not retained; call accounting follows the configured executed paths and
operator receipts.

Unchanged contracts: reasoning-v0.3.3, findings-v0.2, source-evidence-v0.3.6,
gpt-5.6-terra, low effort, hubspot-final-payload-v1. Prior retained final-policy
replay remains 205/205 automated passes over 59 cases, with **55/56 (98.21%)**
repeated decision-signature groups stable. This is not full human semantic review.

The highest-priority remaining model issue is **UV11's treatment of documented
renovation completion versus stale customer interest**. Its source dates are
February 2025 and its evaluations November 2026: the older deferral should not
silently remain unresolved, while the newer source word “now” must not be renewed.
Review the [exact variants and dates](../../UV11-REVIEW.md).

Human checklist, still pending:

- Review the [nine revised captured proposals](../../HUMAN-REVIEW.md); original
  verdicts bind their original hashes and are not inherited by revised text.
- Adjudicate UV11's internal next step with both chronology and source age visible.
- Accept or require further evidence for the documented fault-marker limitation;
  no second create may be made for this confirmed operation.
- Keep task approval, semantic review, financial evidence and customer-release
  acceptance separate. No amount is labelled revenue rescued.
- Complete customer-specific onboarding/IT review and final release acceptance
  before any real customer promotion. General writeback stays disabled.
