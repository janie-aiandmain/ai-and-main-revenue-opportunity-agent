# Hosted identity-review console correction

The operator reported `identity_review_required`, followed by enabled email with
an empty delivery outbox. The existing ledger deliberately requires an attributable
identity decision for unmatched new evidence after a context already contains a
finding. The captured evaluation is persisted for review; accepting that evaluation
and observing its email fingerprints has not completed. This block is not a
Resend rejection and does not call for regenerating credentials or running the
model again. The exact hosted candidates have not yet been supplied.

The missing console path is now exposed by **Show pending identity review**.
`operator-identity-review-ui-v1` displays each raw candidate, dated evidence, key,
recommendation and full pending receipt. Each mapping starts blank; the operator
must explicitly choose the same existing need or a genuinely separate NEW need
and attest to reviewing every mapping. Duplicate existing selections and missing
choices/attestation are rejected. Viewers may inspect but cannot confirm.
The existing authenticated server endpoint rechecks generation, current source,
role, independent evidence and duplicate identity constraints. Nothing bypasses
its checks or automatically marks an output semantically accepted.

The existing confirmed EV operation/task is displayed in the choices. The new
backend regression demonstrates preserving a confirmed operation's ID, payload
hash and remote task while a new separate note is reviewed; incorrect NEW
allocation for the old need is rejected. Resolving identities grants neither
semantic acceptance nor exact task approval. With the already-authorized email
setting active, successful acceptance can queue eligible operator alerts. It
creates no task and does not enable general writeback.

Only console presentation changed. Prompt, schema, model/settings, materializer,
proposal/action/approval contracts and identity rules are unchanged. No model
validation is needed for this UI-only change; none was run. Prior semantic
decisions remain bound to their prior exact outputs.

## Executed local validation

- Full suite: **224/224 passed**, including confirmed-operation preservation.
- Supported retained-capture workflow: **207/207 passed**.
- Actual local Chromium with mocked APIs: **PASS**; blank initial mappings,
  explicit attestation/complete decisions, duplicate rejection, exact source/
  generation bindings, Viewer restrictions and no evaluation/approval/execution
  calls. This is local browser validation, not hosted human review.
- Gateway and private-owner Worker dry-run builds: **PASS**.
- No HubSpot, model or email-provider test calls.

An initial restricted-sandbox browser run could not bind its local HTTP listener;
the same local browser test passed in the permitted execution context. The first
new backend test used an invalid fixture enum, which was corrected to the existing
`scope change` enum; the complete suite then passed. These preliminary failures
are not presented as passing runs.

## Hosted status and next operator step

Gateway-only deployment and readback are recorded separately after execution.
The private owner, stored capture, namespace and delivery settings must remain
unchanged, with all CRM/test/fault/release flags disabled. No migrations, new
infrastructure, credentials or permission changes are required.

After deployment, refresh the signed-in console and select **Show pending identity
review**. Inspect/share the **Pending candidate receipt** before confirming any
uncertain mapping. Preserve the EV need as its existing finding; label other needs
NEW only if the actual captured evidence establishes they are independent.
Overlapping/merged/incomplete evidence remains blocked for correction. Do not
Evaluate again, prepare/approve/submit tasks or reset the existing operation.
Actual identity decisions, provider delivery IDs and inbox receipt remain PENDING.
