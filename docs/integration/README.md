# Corrections and general staging integration

Status: **controlled prototype with tested local safeguards**. No hosted staging
certification, production deployment, HubSpot call, verified business revenue or
human semantic sign-off is claimed. See [account setup](../staging/SETUP.md),
[remaining prerequisites](../staging/readiness.json), and
[seven cases for human decisions](seven-case-review.md).

## Corrections and preserved failures

The production v0.2 reasoning module, request snapshots, original corpus,
baselines, 155 captured stability outputs and prior certification artifacts remain
unchanged. Original ST04/EN12 failures remain in immutable versioned fixtures.
This cycle uses a separate staging-only **reasoning-v0.3.2** contract with the same
**findings-v0.2** schema, model **gpt-5.6-terra**, reasoning effort **low**.

- ST04: retain the invoice qualifier as exact evidence, preserve its “until
  resolved” condition verbatim, and treat the note's “today” as historical. A
  future task deadline cannot renew the old instruction. No billing mutation is
  available. Current status/timing remains a human/source question.
- EN12: keep independent service recovery and EV-charger findings; pricing means
  pricing only. Do not add an assessment, consultation, booking or scheduling.
  The executed task projection uses bounded reviewed intent and source quotes;
  it never executes the model's free-text recommendation.

Fresh prompt iterations were measured, not silently substituted:

| Prompt | Original 31 decision checks | Unseen 16 actionability checks | Additional finding |
| --- | --- | --- | --- |
| v0.3 | 25/31 | 16/16 | Six explicit pricing signals incorrectly became follow-up classifications; captured as regressions |
| v0.3.1 | 31/31 | 16/16 | Assistant semantic inspection caught “until resolved” weakened to “until reviewed” in ST04; captured separately |
| v0.3.2 | 31/31 | 16/16 | ST04 condition preserved; EN12 pricing only. Literal-time detector flags ST07 and UV03 quoting historical customer wording; human adjudication pending |

These are **141 new model calls across three different prompts**, not a repeated-
run consistency study. Prompt/request/schema hashes and returned token usage are
in `results.json`. Latest original-corpus FP = 0/21, FN = 0/10; finding count/type/
classification/review/evidence-isolation automatic checks pass on all 31. All 47
outputs are schema-valid with verbatim grounded quotes. The two latest literal-
time flags remain in the raw report; they are not deleted or normalized away.
The source-aware assistant interpretation is quoted historical context with
current-intent confirmation, rather than an actionable renewed deadline. Neither
that interpretation nor automated scores are human semantic approval. Complete
attribution, chronology, omissions, scope and confidence calibration are not
certified by those numbers. New-prompt five-run consistency is unmeasured.

The unseen fixture set was authored before calls and is not embedded as prompt
examples. It covers old deadlines and reversals, omitted billing/consent/scope
restrictions, incomplete deferred events and unrequested assessments/scheduling,
including counterexamples with explicit customer scheduling requests. Additional
offline counterexamples cover absolute expired dates, same-day unresolved relative
dates, altered source, task deadline expiry and markup in untrusted evidence.
No fixture expectations were loosened. New captures are immutable; changing a
policy never edits an earlier output into a success.

## General note → finding → review → exact approved task

The isolated staging Worker now exposes the real general pipeline, not just four
authored CONTROL cases. It reads the **designated synthetic contact only**, verifies
read-token tenant and marker, follows contact→note associations, rejects incomplete
pagination/data, normalizes source text consistently and evaluates the notes through
the versioned model function. No contact profile, pipeline, CRM notes editor or
generic task manager is created. HubSpot owns those records.

Source-anchored opaque finding IDs survive synonymous model keys and output order.
Each finding keeps local evidence, decision/type/confidence, advisory recommendation
and pending review. Model keys/IDs remain visible as model metadata. A separate
source+candidate fingerprint and exact review receipt bind the authoritative
operator decision. Decline/defer does not mutate the CRM.

Edited source, unmatched new evidence or ambiguous identity suspends execution.
A verified operator must explicitly bind each pending candidate to an existing
finding or a genuinely new need, bound to the current source/generation. Duplicate
bindings, overlapping needs, wrong-context IDs and bridges fail closed. Identity
adjudication is recorded with subject/kind and creates no semantic or task approval.

A reviewed proposal permits only typed intent, priority, explicit task due time,
source-grounded timing and explicit review attestations. Scope/evidence derive
from exact source quotes; arbitrary payload fields and free-text constraints are
not accepted. Old or unresolved deadlines, missing restrictions, unrequested
steps and unverified event/job state block preparation. These conservative text
checks do not establish general natural-language correctness: unknown phrasing
still needs human review. Absolute task due time is operator-chosen, not an invented
24-hour deadline. Relative-date resolution is deliberately narrow; unsupported
expressions require new dated source evidence. Markup is encoded before versioning.

The full final HubSpot body includes exact properties, task due time, association
and preallocated correlation marker. Approval requires the exact review ID,
payload hash and action version, with the existing 24-hour maximum TTL/revision
controls. Generic certification routes cannot approve/execute a general operation.
A new review invalidates previous grants. Field changes require new preparation.

Immediately before a new create, the Worker freshly retrieves notes and re-runs
the model. Material or unknown candidate changes revoke approval; a failed fresh
evaluation also revokes it. Another source read after isolation checks catches
changes during evaluation. Both token portal identities and the synthetic contact
must match before POST. In-progress/outdated evaluations cannot overwrite newer
ones. Already submitted/uncertain operations reconcile only, never create again.

Raw prose differences of unknown semantic equivalence conservatively require
review; arbitrary synonym resolution across edited sources is not assumed. The
explicit identity workflow handles source changes instead of silently allocating
duplicates. No autonomous customer communications or other CRM mutation is allowed.

The authenticated `/operator` page is a narrow finding console: findings/evidence,
review/defer/decline, exact-payload preview, approval and gated submission, plus a
link back to HubSpot. It has no token entry or user management. Access supplies
identity. Signed Access assertions and Bearer assertions share verification;
conflicting identities and cross-origin POSTs are rejected. Content is rendered
with text nodes under a restrictive CSP. The local smoke test checks the Worker
response and inline-script syntax; no automated browser click/visual test was run.
The API workflow was executed end to end locally with explicit synthetic actors.

## Tests actually executed

`checks.json` records counts/exit codes. `worker-validated.json` is the final actual
workerd receipt, with Durable Object SQLite, separate durable HTTP effects and a
captured-model boundary fixture. It is **not live HubSpot** or a fresh model-quality
measurement. Real model quality is recorded separately in the three model captures.

The local Worker checks zero/two findings, stable independent IDs, precise role
and release blocks, preflight with test writes false, exact approval, material
change invalidation, A→B→A rejection, one general task, response loss, runtime restart
and reconciliation with no second create. Prior CONTROL recovery scenarios also
run. All fixture task IDs/hashes/traces are included; real HubSpot task IDs remain
empty. One synthetic outcome remains deduplicated; the general task adds no
estimated opportunity value and no outcome/revenue. `revenueRescued` remains null.

The prepared production-source, certification and hosted-staging configs are
verified with dry-run builds only. No deploy or new permission grant occurs.
Production configuration is unchanged. Its deployed state remains unknown:
`production-state-classified.json` reports **blocked_network_access** because its
exact hostname is absent from the executor allowlist. The requested single-host
addition was saved to the environment draft; it is not runtime publication.
After refresh, only the read-only production health verification is authorized.
No HubSpot/staging action is implied by that network setup.

## Reproduce locally without overwriting captures

```sh
npm ci
npm test
npm run integration:local # synthetic local service; writes receipt to ignored reports/
npm run integration:replay # offline 155 + corrected 31 identity replay
WRANGLER_SEND_METRICS=false npm run check
npm run certification:check
npm run staging:check
# Separate explicit non-production paid model opt-in; never HubSpot:
npm run regression:corrected -- --live --non-production
```

Keep each new model run as a distinct capture; do not overwrite earlier reports
under docs/ or fixtures/. Older certification artifacts are historical evidence.
Hosted setup does not change their human verdicts. The human decision sheet stays
pending; actual human receipts must name the reviewer, timestamp and precise
source/output hashes. Case adjudication and exact live task approval are separate.
