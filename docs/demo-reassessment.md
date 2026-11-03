# Existing demo reassessment

Read-only inspection and write-disable containment on 2026-11-03 (15:48–15:53 EST).
Controlling scope: both Cloudflare and HubSpot are demo/proof-of-concept resources,
not connected to a real business, as the user explicitly confirmed. There is no
separate production HubSpot portal. Pause new staging and Access setup. Do not
provision anything, request another Access identifier, delete either Worker or
expand permissions. Older files using “production” describe a deployment target
or a conservative assumption; they are not evidence of customer operations.

## Actual observations

- The original `ai-and-main-revenue-opportunity-agent` Worker is reachable. Its
  health mode is `read-only deployment practicum` and its release is v0.8.
- **Writes were actually enabled at first inspection.** Cloudflare had
  `CRM_WRITEBACK_ENABLED=true`, health reported true, and deployed source dispatched
  `/writeback-task` into the legacy approval/create function. The checked-in branch
  unconditionally disables that route despite using the same release label. Do
  not equate matching release strings with matching executable behavior.
- To honor the instruction to keep writes disabled, only that binding was changed
  to `false` using the existing Cloudflare permission. Health and settings confirm
  false. The settings update created version `00d91f64-3bcc-4c51-9a9c-e9602b6dfe7c`.
  No new code was deployed. Follow-up version comparison confirms the executable
  ETag, handlers, runtime settings and all other bindings are unchanged. Routes,
  previews, credentials and the other Worker are unchanged.
- Cloudflare dropped an old `workers/message` version annotation during the
  settings update. Consequently an initial broad metadata equality check failed;
  it was not silently reported as passing. Specific follow-up comparisons above
  establish the actual boundary of the change. Raw multipart download hashes are
  unstable and are not used to assert that code changed.
- With writes confirmed false, GET `/hubspot-test` returned **six contacts**,
  including designated ID **582095692487**, with firstname exactly
  **AI_MAIN_CERTIFICATION_ONLY**. One known fictional case name matched. No raw
  contact data, email, phone or note history was saved. The Worker performed its
  existing read-only CRM diagnostic; no model call or CRM write occurred.
- This supports demo usage but does **not** independently prove credential portal
  identity **247646122**, the writer credential's identity/scopes, or that every
  record is synthetic. The diagnostic returns no portal ID. It is a first-100
  contact read, not a paginated all-record inventory or data classification audit.
  The user's demo-only attestation is preserved separately from technical proof.
- Original Worker secrets are configured for HubSpot read/write, OpenAI and lab
  approval. No values were extracted. No direct HubSpot credential is available in
  Codex. An ordinary setting named `EVAL_OPENAI_API_KEY` is present on the original
  Worker; its value was not inspected or logged. If it holds a real API key, its
  storage belongs in Secrets, not ordinary Text, in the next authorized cleanup.
- The original Worker has **no durable resource binding**. Corrected model,
  evidence/review, approval and recovery modules exist on the branch, but this
  does not establish their hosted deployment on the original Worker.

## Shortest supported route

1. Reuse the existing original demo Worker, test portal, existing read/write
   credentials and designated synthetic record. The next small code change should
   add a bounded demo preflight to the existing Worker, guarded by the existing
   operator control, using its stored credentials to read each credential's
   account-info and the designated contact marker. No key extraction or new
   credential is needed. Verify both credentials' account
   identity using the existing read-only account-info ability; do not invent a
   production exclusion ID or add permissions if that ability fails. A confirmed
   demo mode should positively allowlist the actual test portal/contact rather
   than requiring a nonexistent separate production portal.
2. Connect the existing corrected reasoning and review/projection modules to a
   narrow demo route/console. Start with complete note retrieval, findings,
   evidence and exact final-payload preview. Keep writeback false. Preserve old
   outputs and make fresh model checks if output generation changes. Show
   historical deadline, omitted restriction, deferred work and unrequested
   scheduling cases as explicit blocked/corrected examples.
3. Use a single named demo operator and explicit approval through the existing
   lab control. Bind approval to the exact final HubSpot payload/hash/version,
   finding/source revision and expiry; a shared lab token alone is insufficient
   without that binding. A lab identity must be labeled as such and is not SSO or
   a human semantic sign-off. No user-management system is needed.
4. Before any real test task, verify a durable operation ledger and correlation
   reference are committed before submission. Investigate reuse of the already
   provisioned store; do not assume that binding it into the original Worker is
   already implemented or simply interchangeable. If reuse needs new resources,
   stop under the current instruction. Preserve/re-run local crash/retry proofs
   while this hosted integration is unresolved.
5. Only after a separate bounded task-write authorization, demonstrate one approved
   task, retry without a duplicate, material change invalidating approval, and a
   lost-response/restart reconciliation against **real test HubSpot**. Unknown,
   missing, multiple or mismatched remote matches stay blocked; no second create.
   Keep opportunity estimates, created tasks and verified outcomes separate.

The read-only diagnostic already works. Estimated implementation effort for a
corrected read-only finding/approval-preview demo is **2–4 engineering hours** once
existing-credential account verification is available. A bounded hosted approved-
task/recovery proof is **1–2 engineering days total**, conditional on reuse of
existing storage and unchanged credential abilities. These are effort estimates,
not promises of remote correctness or human availability. If storage reuse or
HubSpot reconciliation cannot be verified, stop and report the blocker within
that cycle; do not turn it into a new infrastructure project.

## Necessary now versus later

| Necessary for controlled demo correctness | Can wait until a customer deployment |
| --- | --- |
| Complete source notes/quotes, relevant restrictions and chronology; block incomplete source | Enterprise IT/security review package and formal retention administration |
| Resolve deadlines from source timestamp/timezone; never renew old “today”; require fresh evidence for deferred completion | Enterprise SSO/Access onboarding and managed Viewer/Approver/Admin rollout |
| Scope fidelity: pricing is not scheduling, assessment or permission to perform work | Separate customer accounts/environments and customer-specific production exclusion |
| Exact final-payload approval, fresh-source check, revision/expiry invalidation before a test write | Multi-client isolation architecture and customer-facing release certification |
| Durable pre-submit state/correlation, uncertain-write blocking and reconciliation before live retry | Enterprise operations/monitoring polish; broader revenue-attribution reporting |
| Synthetic allowlisted records, separate existing read/write credentials, secrets protected, bounded operator access/model spending | General CRM functionality does not belong in either phase |
| Minimal decision/operation receipts and outcome deduplication; no claimed revenue rescued from a task | |

The corrected v0.3.2 capture has 31/31 original decision checks and 16/16 unseen
case actionability checks; the seven human decisions remain pending. Existing
101-test and local workerd/crash/retry evidence is preserved. Those numbers do not
certify evidence semantics exhaustively or real HubSpot remote-write recovery.
No new tests/model runs were needed for this inspection; no application source,
checked-in configuration, fixtures or historical evidence were modified. The sole
remote configuration change was disabling the demo write flag, documented above. No Access identifier is requested.
The earlier staging network draft remains unapplied and is not required for this
narrowed recommendation.

Machine-readable evidence: [demo-reassessment.json](demo-reassessment.json).
