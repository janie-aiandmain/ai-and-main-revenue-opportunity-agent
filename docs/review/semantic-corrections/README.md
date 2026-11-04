# Semantic decisions and completed correction cycle

The user's decisions for the **original captured proposals** are recorded: five
PASS and four CONCERN across seven cases / nine findings. The requested corrections
are implemented and validated locally and against fresh synthetic model outputs.
The corrected outputs are **pending human review**; original decisions do not
transfer to changed wording or approve a final HubSpot payload.

No HubSpot request, new task, deployment, execution approval or permission change
occurred in this cycle. General and test writeback remain disabled. The supported
description remains **controlled prototype with tested local safeguards**.

## Finding-level disposition

| Captured finding | User decision | Implemented correction / retained limit | Fresh automated result |
| --- | --- | --- | --- |
| ST03 | CONCERN | Internal verification of current job status and whether work started; pricing before additional work retained. No installation or scheduling authority. | Correction checks pass; new output pending human review. |
| ST04 | CONCERN | Original `2026-10-23T14:00:00Z` source; historical “today” explicitly not renewed; verify current issue status without asserting unresolved now. Exact “Do not send another invoice until this is resolved.” retained, without billing authority. | Correction checks pass; new output pending human review. |
| ST07 | CONCERN | Original `2026-10-26T14:00:00Z` source and historical “this week”; verify current interest/timing without renewing the old window. | Correction checks pass; new output pending human review. |
| ST08 | PASS, internal verification only | Internal records verification is distinct from customer follow-up. Renovation completion and current consent remain unsatisfied customer-action gates. | Correction checks pass; new output pending human review. |
| EN11 pricing | PASS, requested pricing only | Internal requested surge-protection pricing preparation only; no added service or customer contact; no unrelated lighting evidence. | Correction checks pass; new output pending human review. |
| EN11 lighting | PASS, internal verification only | Separate finding and internal verification; retain renovation-completion/current-consent gates. | Correction checks pass; new output pending human review. |
| EN12 recovery | PASS | Separate internal verification of the reported issue's current status; do not assume it remains unresolved. | Correction checks pass; new output pending human review. |
| EN12 EV pricing | PASS, pricing only | Separate internal EV pricing preparation; no assessment, consultation, charger subtype or recovery scope added. | Correction checks pass; new output pending human review. |
| EN31 | CONCERN | Verify current job state and retain pricing before work; reject fake approval and stage-change instructions embedded in the source. | Correction checks pass; new output pending human review. |

[Exact corrected task drafts](corrected-tasks.md) show their source timestamps,
evidence, scope, deadline basis and proposed properties. [Machine-readable drafts](corrected-proposals.json)
retain the original decision event and output hashes, new output hash, proposal
hash and action version. All nine drafts are execution-blocked: operator task due
time, authorized CRM association, persisted correlation and separate approval of
the complete final payload are still absent. Draft hashes are **not final-payload
approval hashes**. Missing or ambiguous source information never becomes evidence
of completion, consent or a renewed deadline.

## What changed

`reasoning-v0.3.3` asks for internal verification/preparation and preservation of
restrictions and historical timing. Model output schema remains `findings-v0.2`;
model `gpt-5.6-terra`, effort `low`, remain unchanged. Prompt SHA-256:
`9f03c4a4f700e386def81eac10a231d2d3ef5b85eca8bddfafdaf3af28434c69`.
Request SHA-256:
`c3d526465d5041266574799e5101e8537896a9b5228b50fc117601c01b60f984`.

The deterministic renderer is `internal-task-proposal-v2.1`; review policy is
`finding-review-v2.1`; internal authority policy is `internal-task-policy-v1.1`.
Internal task timing is separate from customer-request timing. Verification can
be prepared while an event/consent gate is unmet, but cannot clear that gate or
authorize customer action. Internal preparation is restricted to requested
pricing without unresolved prerequisites. Evidence remains local to each need.

A local counterexample exposed an absolute-date gap: “by 2023-04-18” could be
treated as ordinary pricing preparation. The [original failing test](absolute-date-before-fix.txt)
is preserved. Past and future explicit calendar dates now require review, retain
their original wording/date, and cannot be replaced by an operator due date.
Both boundary cases passed fresh model validation.

The general Worker pipeline now accepts these versioned proposals and binds its
review to the current source, finding, contract and projected task. The existing
operation ledger continues to require a separate 24-hour exact final-payload
approval. Payload/material changes change the action version; source/candidate/
revision changes invalidate approval even if rendered text happens to match.
Re-review, changed reasoning contract, changed scope/evidence/timing/purpose,
expired due time or expired approval cannot reuse the old grant. Uncertain creates
only reconcile or remain blocked. This path was tested locally, **not newly
deployed or certified against hosted HubSpot** in this cycle.

## Measured validation

| Check | Previous captured v0.3.2 | Final v0.3.3 / proposal v2.1 |
| --- | --- | --- |
| Original corpus decision checks | 31/31 | 31/31 |
| Unseen variation actionability | 16/16 | 16/16 |
| Original classification / opportunity type / review requirement | Original report retained | 31/31 each |
| Automated quality flags | ST07 and UV03 historical-window wording | UV14 missing restriction evidence; blocked |
| Absolute-date boundaries | Not part of that model run; local counterexample failed before fix | 2/2 |
| Original-corpus false positives | No decision failures | 0/21 negative contexts |
| Original-corpus false negatives | No decision failures | 0/10 positive contexts |

The final run made **49 independent model calls**: original 31, unseen 16, and two
absolute-date boundaries. All 49 returned valid output. All seven adjudicated
cases / nine corrected findings passed the explicit automated correction checks.
Evidence inspections passed for **48/49 cases (97.96%)**, not 100% semantic safety.
The runner correctly returned failure because UV14 remained blocked.

UV14 source: “Customer requests charger pricing. Do not schedule an assessment;
send the request to a human for pricing review only.” The model quoted only the
first sentence. Its recommendation retained the restriction, but the evidence was
incomplete. `restriction_evidence_incomplete` blocks preparation and final task
projection. The [actual failure fixture](../../../fixtures/semantic-correction-uv14-omission-v1.json)
and unchanged [raw final output](model-final-49.json) are retained; expectations
were not relaxed and the quote was not repaired by the assistant. **The next
priority is evidence-qualifier recall while preserving this execution block.**

An earlier 47-call run used proposal v2 before the calendar guard. It is preserved
separately, not counted as a five-run stability study. Total this cycle: **96 model
calls**. Final-run reported usage: 87,367 input and 5,959 output tokens. The fixed
synthetic evaluation clock is `2026-11-03T12:00:00Z`; actual calls were made on
November 3–4. This is baseline-comparable synthetic timing, not live customer
deadline certification. Semantic fidelity, intent, authority and hallucination
still require review beyond the heuristic checks. No fresh repeated-run
consistency or comprehensive safety-critical pass rate is claimed.

All **122 deterministic tests pass**. Both Worker dry-run builds pass with exit
zero. Build logs were redirected to writable `/tmp` to avoid a nonfatal Wrangler
home-directory logging error seen on the first checks. Logs and executed commands
are retained in [validation-summary.json](validation-summary.json).

The actual **local** workerd/SQLite/HTTP-fixture run restarted seven times and
created four fixture tasks across independent scenarios; its general pipeline
created one fixture task despite response loss/retry. Duplicate outcome attempts
recorded only one synthetic outcome. Actors/model responses at this local boundary
were simulated; no real model or HubSpot calls occurred in that run. Pending
statuses inside the fixture receipt are deliberate test actors, not a replacement
for the recorded user decisions. Local outcome amounts are not business revenue;
`revenueRescued` remains null. See [the full local trace](local-worker-final.json).

The offline cross-version identity replay reused **12/12 durable opportunities**
on the same original sources, without merging independent needs. Raw model keys
and therefore raw model finding IDs did change; none were silently renamed:

| Case | Previous raw opportunityKey | Fresh raw opportunityKey |
| --- | --- | --- |
| ST08 | `pendant-light-installation` | `two-pendant-lights-installation` |
| EN17 | `surge-protection` | `surge-protection-pricing` |
| EN31 | `garage-outlets` | `three-garage-outlets` |

[Identity replay](identity-replay.json) retains both raw IDs and the reused durable
ID. This is an offline same-source test, not a hosted or unseen-source guarantee.

## Hosted state and commit-linked evidence

The read-only deployment check at **2026-11-04 14:58:58 UTC** observed active demo
version `50ddf101-5484-413a-975a-12865e35e14d` with all seven general/test/fault
flags false and the temporary operator capability absent. See
[the observation](deployed-writeback-state.json). These semantic corrections have
not been deployed. There were no Cloudflare mutations during this cycle.

| Evidence | Implementation / recording commit |
| --- | --- |
| [Original user decision ledger](../seven-cases/human-verdicts.json) | [38bc069](https://github.com/janie-aiandmain/ai-and-main-revenue-opportunity-agent/commit/38bc0691fe6442c36f75609a566cc1f96ca7a044) |
| Internal verification/preparation correction | [96a8d7f](https://github.com/janie-aiandmain/ai-and-main-revenue-opportunity-agent/commit/96a8d7f9cf27c004a9d0e340398eaebac4e78a96) |
| Calendar-date guard and final 49-call renderer | [22fbdec](https://github.com/janie-aiandmain/ai-and-main-revenue-opportunity-agent/commit/22fbdecfe88218b73b3303ac96c1f4be9ede16de) |
| Final local integration regression and immutable UV14 capture | [25b2626](https://github.com/janie-aiandmain/ai-and-main-revenue-opportunity-agent/commit/25b262672b16c3c41b216925724d3e074064d9be) |
| [Original review packet](https://github.com/janie-aiandmain/ai-and-main-revenue-opportunity-agent/blob/467a7e67de8ab13a27e8e66c8b177deaf98360bf/docs/review/seven-cases/README.md) | `467a7e6`; original source/model captures unchanged |
| [Prior v0.3.2 model evidence](https://github.com/janie-aiandmain/ai-and-main-revenue-opportunity-agent/blob/c1603282adea6ddcbfb4bd94efcf3b41cf41fc71/docs/integration/model-v0.3.2-run1.json) | `c160328`; comparison only |
| [Earlier actual hosted recovery demonstration](https://github.com/janie-aiandmain/ai-and-main-revenue-opportunity-agent/blob/418272fc04639e7f084ff107366d405b2aa2eca0/docs/demo-recovery-evidence/README.md) | Executed source `bf7f367`; recorded `418272f`; actual task IDs `415102198520`, `415333966522` |

The earlier hosted recovery used deliberately injected response loss, not a
naturally occurring network outage. Its two actual tasks are historical evidence,
not tasks created by this correction cycle. The [manifest](manifest.json) hashes
every artifact in this package and records source commits; the containing Git
commit identifies this result package. No real revenue outcome is asserted.

## Human review checklist

- Confirm corrected wording, finding-local evidence, scope and restrictions in the
  nine drafts. Original PASS/CONCERN decisions remain attached to original hashes.
- For ST03/EN31, require current job evidence before work-related customer action.
- For ST04/ST07, distinguish original historical timing from a new internal due
  time; ST04 does not establish current resolution or billing authority.
- For ST08/EN11 lighting, internal verification neither proves completion/consent
  nor permits customer contact. Pricing findings remain pricing only.
- Keep UV14 blocked until its restriction evidence is complete and freshly
  validated. Do not approve its defective evidence to advance execution.
- Final execution is a separate decision on a complete, freshly verified payload,
  including association, correlation, task due time, hash and action version.
