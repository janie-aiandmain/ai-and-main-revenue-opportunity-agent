# Human semantic review and rules diagnostic correction

Baseline: **6b2560479de513f41f20fa9f52778ec0454f8a0f**, branch
`enterprise-hardening`. Completed source-only work on November 12, 2026.
No merge, deployment, Worker endpoint invocation, HubSpot/model call, task,
credential/permission change or production configuration change occurred.
Cloudflare metadata and active code were inspected read-only. All 9 demo and
6 owner execution/fault flags were verified false. The model-call total remains
**210/210**; no reservation file was reset.

## Genuine human review

[REVIEW.md](REVIEW.md) contains the compact review table, exact dated evidence,
classification, exact internal recommendation, restrictions/quantities/timing,
remaining uncertainties, full bound output/review hashes and verdict/notes fields.
[review-packet.json](review-packet.json) retains the complete machine-readable
source contexts, findings and task drafts.

There are nine findings plus five independently captured UV11 variants. Every
revised semantic verdict is **PENDING**. Original five PASS/four CONCERN decisions
remain unchanged and bound to their original hashes. No assistant recommendation,
automatic score, policy choice or semantic PASS creates final execution approval.

The assistant recommended follow-up for UV11 because it continues deferred demand;
the user explicitly chose **Cross-sell**. That policy-only decision is appended in
[human-decisions.json](human-decisions.json), with attributable wording, prior
review-packet hash and all five referenced output hashes. It does not approve
generated wording, suggested priority, customer action or a task.

Materializer **v0.3.8** applies the versioned, narrow completed-renovation pricing
classification policy. It retains the completion fact reported February 13, 2025,
requires internal current-interest/consent verification and does not renew old
“now.” It cannot rewrite retention/scope-change findings or clear an unconfirmed
renovation gate. Unsafe recommendations remain blocked before label correction.

The five retained provider outputs originally contained three cross-sell and two
follow-up labels. The current local policy renders all five cross-sell, without
editing raw captures, keys, evidence or recommendations. The two former follow-up
drafts inherit the existing cross-sell default **HIGH** priority instead of MEDIUM;
that material change and its changed action versions are exposed for review.
HIGH is not a renewed customer deadline or permission to act. See the
[exact comparison](UV11-label-policy-comparison.json).

**Fresh model validation of v0.3.8 is PENDING.** The prior two fresh API evaluations
tested v0.3.7 and are not relabelled as new validation. The provider prompt,
findings schema, model and effort remain unchanged. The exhausted budget prohibits
new inference calls in this cycle.

Future actual semantic verdicts must be append-only events with the exact reviewed
output/review hashes, user wording, attribution and recording time. A changed
output returns to PENDING; no old verdict is transferred. No new semantic verdict
was supplied in this cycle, so none is invented.

## Actual diagnostic role and reachability

**The rules are a supported offline diagnostic and a retained legacy runtime
path, not the general finding engine and not merely dead historical code.**

| Entry | Actual behavior / dependency | Evidence |
| --- | --- | --- |
| Main demo: `wrangler.jsonc` → `src/demo/worker.js` → operator gateway | Legacy diagnostic routes are rejected; a legacy reader binding does not bypass that rejection. | Active main bundle contains the legacy-block marker and no v0.2 diagnostic. Actual dispatcher local tests reject these routes without a fixture request. |
| Owner: `wrangler.staging.jsonc` → `src/staging/worker.js` | After external identity/role checks, non-certification GET routes fall back to `src/index.js`. `/shadow-evaluate` calls the diagnostic and requires **HUBSPOT_ACCESS_TOKEN**, not the STAGING token. | Active owner bundle contains the fallback and v0.2 rules. The active owner's binding names contain no legacy reader, so its current bindings cannot perform this legacy CRM read. No credential is copied or added. |
| General operator evaluation | Designated source → `src/release/reasoning.js` → structured findings; it never uses `evaluateRevenueOpportunity`. | Source call graph, current integration tests and retained-capture replay. |
| `npm run regression:offline` | Current pure diagnostic using dated `serviceHistory`; no network. | Corrected v0.3 report. |
| `npm run regression:offline:legacy` | Frozen v0.2 rules with the original flattened input; no network. | Exact original result rows reproduced. |

Read-only [active deployment metadata](active-deployment-readonly.json) and
[bounded excerpts/hashes from active modules](active-route-proof.json) identify:

- Main version `91d1135c-054e-4614-aa45-74401ba060d0`.
- Owner version `76c27653-bb40-45cb-8ef1-50883e6a0976`.
- Both still identify source `34a7b4257c3c491c8a89f34e29ff0c01fbdd9ee8`.

This proves active code and binding names, not successful human authentication or
HubSpot access. No deployed Worker URL was invoked. Local dispatcher tests use
synthetic signed identities, intercepted CRM responses and an import-only Durable
Object class shim; they do not instantiate a DO or establish hosted certification.

The legacy fallback retains the old broad contact/note reader if someone later
configures its legacy credential. No scope, route or credential is expanded here.
Migration to designated-context reading or retirement of that fallback is a
separate proposal, not an action silently performed to improve a score.

## Diagnostic failures and actual corrections

[DIAGNOSTIC-FAILURES.md](DIAGNOSTIC-FAILURES.md) shows all twelve original failures
with original source, expected/actual results, root cause, runtime/diagnostic risk
and corrected result. [Exact rows](diagnostic-failures.json) preserve both sides.

The old rules matched negated interest, lacked scope-change/service-recovery
branches, prioritized interest above deferral, omitted withdrawal/fulfillment
phrases and lost source chronology by flattening notes. v0.3:

- requires attributed customer requests rather than employee, third-party,
  hypothetical or instruction text;
- handles negation, fulfillment and newer reversals;
- sorts valid source timestamps at both the CLI and legacy runtime caller;
- abstains on ambiguous same-time/undated contradictions or shared scope;
- distinguishes active-job changes, deferred needs and service recovery;
- keeps recommendations internal, retains complete evidence/restrictions, and
  never renews a customer deadline or grants execution authority.

The original five-field single-summary output is retained. This is not a new
finding registry, task system or approval flow. Input strengthening is explicit:
v0.2 flattened note text; v0.3 dated `serviceHistory`. The string compatibility
form cannot invent timestamps. No case IDs or expected answers are hardcoded in
the diagnostic. Counterexamples use additional services, reversed arrays,
third-party withdrawals, equal timestamps, duplicates, employee-only commentary,
hypotheticals, separate needs, deferred work and fake approvals.

The original function and helpers are frozen in
`src/diagnostics/legacy-rules-v0.2.js`; [source proof](frozen-source-proof.json) and
tests show the function body is verbatim and every original result row matches.
All original fixtures, provider captures, baselines and recorded human decisions
are byte-for-byte preserved; [100 checkpoint hashes](preserved-checkpoint-sha256.json)
are verified by tests.

| Measurement | Frozen v0.2 / before | v0.3 / after |
| --- | --- | --- |
| Classification + review checks | 19/31 | 31/31 |
| False positives | 6/21 (28.57%) | 0/21 |
| False negatives | 2/10 (20%) | 0/10 |
| Command exit | 1, original errors | **1**, explicit independent-finding coverage limitation |
| Release eligible | No | No |

**The diagnostic is deliberately still a failing gate.** EN11 and EN12 each require
two independent findings; a single summary cannot prove both needs, evidence
isolation, stable IDs or action-version binding. Their two-field checks passing
does not remove that limitation. The report exposes both `contractLimitedCases`
and `releaseEligible: false`; no original expectation is weakened or deleted.
CI configuration was not changed to hide the failing command.

## Executed validation and remaining gaps

| Command / check | Executed outcome |
| --- | --- |
| `npm test` | **182 passed, 0 failed**. Includes original-capture integrity, new diagnostic counterexamples, actual dispatcher checks with intercepted fixtures, exact approval invalidation against the 6b25604 contract, and existing local recovery tests. |
| `node scripts/review/replay-checkpoint.js` | **207/207 retained raw outputs passed bounded offline checks**, 59 cases. Only UV11 finding bodies change; all other finding bodies remain identical to 6b25604. |
| Original 31-case retained executions | 122/122 decision checks, FP 0/63 negatives, FN 0/59 positives. These are offline replays, not new model executions. |
| Same-source durable identity replay | 207 outputs → 37 needs / 37 IDs; zero extras, changes or identity-review errors. Local replay only. |
| `npm run regression:offline` | **Exit 1**. 31/31 classification/review checks; EN11/EN12 independent coverage unsupported. |
| `npm run regression:offline:legacy` | **Exit 1**. Reproduces the preserved 19/31 and original FP/FN. |
| `npm run check` | PASS, demo Worker dry-run build only. |
| `npm run staging:check` | PASS, owner Worker dry-run build only. |
| Cloudflare active metadata/code read | PASS outside the sandbox after the sandbox proxy failed. All execution/fault flags false; no provider mutation. |
| Fresh model validation of the changed generator | **PENDING**, budget 210/210; zero new model calls. |
| Revised human semantic / final execution / release acceptance | **PENDING**, kept separate. |

Logs: [tests](tests.txt), [replay](retained-capture-replay.txt),
[current diagnostic](diagnostic-after.txt), [frozen diagnostic](legacy-replay.txt),
[demo build](demo-build.txt), [owner build](owner-build.txt),
[dispatcher tests](reachability-tests.txt), [identity replay](identity-replay.json).

No new hosted recovery or revenue result is claimed. Earlier hosted task/recovery
evidence remains unchanged. No amount is called revenue rescued because a task or
opportunity exists. The diagnostic uses bounded regex/lexical rules; 31 checks and
counterexamples are not population accuracy or confidence calibration. Unknown
language and ambiguous service identity remain limitations.

## Versions, hashes and reproduction

| Contract | State |
| --- | --- |
| Rules diagnostic | v0.2 preserved; v0.3 supported correction |
| Materializer | source-evidence-v0.3.7 → source-evidence-v0.3.8 |
| New label policy | completed-renovation-pricing-classification-v1 |
| Prompt / schema | reasoning-v0.3.3 / findings-v0.2, unchanged |
| Model / effort | gpt-5.6-terra / low, unchanged |
| Task policy / proposal / review | v1.3 / v2.3 / v2.7, unchanged |
| Final payload | hubspot-final-payload-v1, unchanged |

[contracts.json](contracts.json) contains source/prompt/schema/request hashes,
unchanged configuration hashes and the changed approval-contract hash. Cached
v0.3.7 reviews cannot reuse approval under v0.3.8; tests reject and revoke the old
grant while preserving the durable finding ID. Current labels and HIGH draft
priorities do not grant customer-action or task-execution approval.

```sh
npm test
node scripts/review/replay-checkpoint.js
npm run regression:offline         # expected exit 1: independent coverage
npm run regression:offline:legacy  # expected exit 1: original 19/31
npm run check
npm run staging:check
```

The old completion replay command refuses to overwrite the historical v0.3.7
evidence directory when run against v0.3.8. Check out 6b25604 to reproduce that
historical generator; use the new replay command for this cycle.

Next: provide actual verdicts for the [exact review items](REVIEW.md). Fresh model
validation requires an explicitly revised call allowance in a later cycle; no
automatic increase is made. Resolve or explicitly constrain the diagnostic's
multi-finding limitation and separately decide legacy-route migration before
using it as a release gate. Stop before deployment or task execution.
