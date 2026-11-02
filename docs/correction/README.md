# Focused correction before live writeback

Status: implemented reusable policy + local durable sandbox reference adapter;
not deployed or wired into the production Worker. No HubSpot/model API calls,
CRM writes, credential/scope changes or production configuration updates occurred.
No customer profiles, CRM note/deal/pipeline records or generic task manager were
created. Records here are agent opportunity, review/effect and attribution metadata.

## What was corrected and how it was verified

| Concern | Before | Focused correction evidence |
| --- | --- | --- |
| Identity depends on model slug | 10/12 positive slots stable in five runs | Source-anchor reconciliation preserved 12/12 across all 155 captured executions |
| Same-need synonyms | ST03 and EN12 each had three IDs | Model keys remain aliases; one durable opportunity ID survives those exact inputs |
| Distinct needs | Must not merge EN11/EN12 or locations | Disjoint evidence stays separate, even for the same service/model label; bridges require review |
| Version churn from prose | All 12 slots had exact version drift | Canonical reviewed intent/payload excludes raw prose; equivalence and material-change counterexamples are tested |
| Approval replay | Unbound contact approval in legacy lab | Sandbox grants bind opportunity, exact version, monotonic revision, source snapshot and expiry |
| Repeated task create | No durable protection in legacy lab | One local task across processing/retry/restart; four competing processes create one task |
| Revenue duplication | No attribution ledger | One external outcome counted once, including concurrent processing; conflicts/cross-opportunity reuse rejected |

The 155-output replay is **stateful offline reprocessing**, not five newly generated
model runs. Existing prompts, contracts, fixtures, expectations and baseline data
remain unchanged. `reprocessing.json` preserves every raw model alias alongside
the stable opportunity IDs. Canonical reference contracts were authored from
source for a simulation, not autonomously inferred or human-approved. Their 12/12
version invariance is a reference-policy check, not a new model-quality metric.

## Stable identity: source anchoring, not synonym normalization

`src/correction-policy.js` finds unambiguous source occurrences. The sandbox
registry keeps an opaque durable opportunity ID, a context reference, source
hashes/span offsets and relevant quote snippets, aliases and version metadata.
It does not keep full CRM histories or customer profiles.

A repeated candidate can reuse an existing ID only with a unique substantive
source-span overlap on the same unchanged note (at least 16 overlapping characters
and two non-generic terms). Model key, classification and prose are not identity
keys. Separate source occurrences/locations remain separate. Ambiguous quotations,
bridges between needs, edited source anchors and unrecognized new evidence block
processing for identity review; they never silently merge needs or allocate a
potential duplicate. A genuinely new need in a known context requires an explicit
new-need review bound to the current source/evidence. The provided review receipts
are clearly labeled sandbox simulations, not an authentication mechanism.

This is deliberately conservative. It does not claim general semantic entity
resolution across new note IDs, rewritten source records or changed business
scope. Those require trusted reconciliation before execution. Deleting the durable
registry loses its opaque IDs; production requires reliable state/backup semantics.

## Exact action version and approval invalidation

Policy version: `source-anchored-task-policy-v1`. The model contract remains
`reasoning-v0.2` / `findings-v0.2`; no prompt/schema/model/settings change was needed.

The candidate's free-text recommendation is not executed. A separately reviewed
contract selects one bounded intent (quote follow-up, scope-change estimate,
deferred follow-up or service recovery) and creates an exact deterministic task
proposal. Its version hashes the full material projection **and exact payload**.
Unknown prose changes suspend execution until bound semantic review determines
whether the canonical contract truly remains equivalent. No regex or model score
can silently supply that review approval.

| Change / condition | Action version | Approval effect |
| --- | --- | --- |
| Canonical classification/type, intent, scope/location/quantity, target, priority | Changes | Revoke old grants; new review/approval |
| Reviewed complete evidence set/content/timestamps | Changes | Revoke old grants |
| Timing, due date, event evidence, timezone/day, customer decision window | Changes | Revoke old grants |
| Customer constraints, authority requirement, policy or exact payload | Changes | Revoke old grants |
| Slug rename, reasoning-summary wording or confidence not used in policy | Unchanged | No authority gained; unknown semantic changes are still suspended |
| Raw classification/type/review-requirement changes | Accepted version waits for review | Revoke immediately, even if the raw output later changes back |
| Raw evidence/recommendation changes of unknown materiality | Not guessed | Suspend; a review bound to candidate + source must resolve it |
| Source snapshot changes | May remain same if canonical action is unchanged | Revoke anyway; fresh context review required |
| Opportunity missing/reappears | Version can be the same | Revoke and increment revision; old grant never resurrects |
| Ambiguous or failed evaluation | Not guessed | Suspend; old review receipt alone cannot clear it. A fresh valid evaluation is required, and a changed candidate also needs bound semantic review |
| TTL elapsed, deadline expired/unresolved, event gate unmet | Does not auto-renew | Block |
| Material A→B→A | Content hash can return to A | Monotonic revision prevents old approval resurrection |
| Existing task and a materially changed approved action | New version | Manual reconciliation; never create a second task automatically |

The default maximum grant validity is exactly 24 hours from issuance. Grants are
not valid before issuance and expire at `now >= expiresAt`. Execution rechecks the
source snapshot, semantic state, revision, version, deadline and allowed action.
An equivalent review can resume an unexpired/non-revoked grant only when the
exact canonical payload and material state really are unchanged.

Absolute due timestamps and resolved source-day deadlines are part of the task
properties before versioning. Source-day conversion is tested across timezone and
DST boundaries. No default “now + 24 hours” task deadline is invented. The 24-hour
approval TTL is separate from the customer's deadline.

## Deadline, completeness and scope review

All 31 contexts / 155 outputs have a completed **assistant semantic review** in
`semantic-review.json`: 24 PASS, 1 FAIL, 6 CONCERN at case level. These are source-
based assistant judgments, not human approvals. Original human verdicts remain
PENDING, and this artifact also keeps human verdict/reviewer null.

- **ST04 FAIL:** runs 2–5 recommend a billing restriction without citing its invoice
  qualifier in the finding evidence. The policy now rejects that incomplete set.
  Its source-relative “today” belongs to the Oct 23 note, not Nov 2 processing;
  the business timezone/renewed instruction must be resolved. The agent cannot
  modify billing even though a human may need to address the request.
- **ST03, EN31 CONCERN:** price before added work; current job/event state must be
  confirmed. A task never authorizes performing the extra work.
- **ST07 CONCERN:** “decide this week” is a source-relative customer decision
  window, not an invented task due date. It remains blocked until reviewed with
  an explicit dated basis; no business-week/timezone assumption is silently made.
- **ST08, EN11 CONCERN:** follow-up is after renovation completion, with no
  completion evidence supplied. The event gate blocks approval/execution.
- **EN12 CONCERN:** one run adds a consultation option not expressly requested;
  adopting that new human step requires scope review.

All other case rationales and all per-run dimension verdicts are provided in the
review artifacts. EN16's known fixture actor annotation mismatch is called out;
source evidence controls, and the original fixture is not silently rewritten.

The exact old ST04 omission is a regression input, not just a new synthetic happy
path. Tests prove incomplete evidence is rejected; a completed proposal with an
unresolved timezone still cannot execute. Timing gates distinguish source day,
absolute deadline, before-work state, customer decision horizon and after-event
confirmation. No expired instruction is implicitly renewed.

## Durable sandbox effects and attribution

The Node SQLite adapter uses `BEGIN IMMEDIATE`, unique opportunity/task and
external-outcome constraints, and transactional local effects. Tests cover retries,
process reopen, competing child processes, stale grants, material A→B→A, lost
confirmed-effect receipts, source edits, ambiguous evaluation failures and default
24-hour expiry. Concurrent child processes receive no evaluation credentials.

`focused-scenario.js` records one opportunity / one task, blocks the old grant
after a priority change, refuses another create even under a new approval, and
counts a synthetic USD 250.00 outcome once across five attempts. The amount is
fictional test data, not reported business revenue or a claim of causation.
External outcome IDs are unique across opportunities/versions/metric types.
Amount, currency, attribution-type or evidence conflicts require review, and
amounts are never summed across currencies.

**Limit:** SQLite effects and their ledger share one transaction; real HubSpot
writes do not. These tests do not certify exactly-once remote CRM behavior. No
real CRM adapter was invoked. Live rollout still needs trusted external identity,
a concrete storage integration, complete final CRM payload binding, an outbox /
unknown-outcome reconciliation protocol, and human sign-off. The existing Worker
and lab writeback route remain unchanged and are not certified by these tests.

## Commands and artifacts

Node 24.19.0 with built-in `node:sqlite` was tested. No new dependency is needed.

```sh
npm test
npm run correction:replay
npm run correction:sandbox
WRANGLER_SEND_METRICS=false npm run check
```

Artifacts:

- `reprocessing.json`: 155 frozen-output reprocessing results; 12 stable identities.
- `reference-contracts.json`: explicit synthetic canonical semantics used to test
  projection invariance; not automatic semantic adjudication or human approval.
- `semantic-review.json` / `semantic-review.md`: completed assistant review of all
  cases, with human review pending and explicit deadline/completeness/scope issues.
- `sandbox-results.json`: one-opportunity/task/outcome scenario receipt.
- `checks.json` and `manifest.json`: validation results and integrity hashes.

No live-writeback readiness claim follows from this focused correction cycle.

Validation recorded in this cycle: **60/60 offline tests pass**, Worker dry-run
build passes, and all original model/fixture/production implementation hashes are
unchanged. No additional paid model executions were made.
