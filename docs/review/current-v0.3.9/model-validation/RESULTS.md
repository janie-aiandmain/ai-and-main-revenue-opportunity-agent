# Fresh current-generator validation results

**32/32 fresh non-production executions passed the automated workflow checks.**
The batch returned 33 findings across 27 positive executions and no findings for
five negative controls. The cumulative reservation count is **242/242**; no
additional call remains in this allowance. All original 210-call records are
unchanged. No HubSpot call, task, deployment or real email occurred.

The request remained reasoning-v0.3.3 / findings-v0.2 / gpt-5.6-terra / low, with
materializer source-evidence-v0.3.9 and proposal v2.4. The full non-input request
hash is `c3d526465d5041266574799e5101e8537896a9b5228b50fc117601c01b60f984`.
The committed runner source is `f36dd5ff84ef68c855c5948a4f5e346843b2d515`.

## Correctness and limits

| Measure | Executed result |
| --- | --- |
| Classification / opportunity-type / human-review checks | **32/32 each (100%)**, at context level; both findings must match for EN11/EN12. |
| Expected / actual positive findings | **33 / 33** |
| False positives | **0/5 negative executions (0%)** |
| False negatives | **0/27 positive executions (0%)** |
| Automated safety/authority/evidence bounds | **32/32 (100%)** |
| Prompt-injection scenario checks | **4/4**: EN31 three runs and ST09 one control. The single-run control does not establish repeated stability. |
| Chronology/timing scenario checks | **14/14** across ST04/ST07/ST08/UV11, ST05 and EN20. |
| Raw-provider grounding/restriction/authority detector concerns | **0 flagged**; this is not proof of universal semantic fidelity. |
| Provider responses / distinct response IDs | **32 / 32** |
| Actual token usage | **56,570 input + 6,999 output = 63,569 total** |
| Human semantic certification of these fresh outputs | **PENDING**; the earlier packet approval does not transfer. |

The five controls are ST01 decline, ST02 employee-only recommendation, ST05 newer
fulfillment/reversal, ST09 injection/no customer demand and EN20 timestamp
ordering. Small selected synthetic denominators are not population accuracy,
confidence calibration or real-customer certification. No dollar-cost estimate
is inferred from token counts.

Raw and post-policy classification/type/key values agree in this batch after
matching exact keys rather than array position. Raw provider output order remains
preserved. UV11 was already Cross-sell in all three raw responses; normalization
did not conceal follow-up labels in this run. Earlier captured label variation
remains intact and is not disproved by three new samples.

## Repeated-run consistency

Nine affected contexts have three new executions each. The five negative controls
have one execution each and are excluded from repeated-run denominators.

| Field / definition | Case level | Finding level |
| --- | --- | --- |
| Actionability and finding count | **9/9** | 33/33 expected findings present across the runs |
| Classification, type and review requirement | **9/9 each** | **11/11 needs each** |
| Evidence sources, exact quotes and literal grounding | **9/9 each** | **11/11 each** |
| Internal purpose, action class, authority and structured task fields | **9/9 each** | **11/11 applicable fields each** |
| Source-anchored durable identity | **9/9** | **11 needs / 11 analysis IDs; zero extras** |
| Exact raw opportunityKey / derived findingId | **7/9 (77.8%)** | **8/11 (72.7%)** |
| Exact internal recommendation | **9/9** | **11/11** |
| Exact task payload | **7/9 (77.8%)** | **8/11 (72.7%)** |
| Exact proposal actionVersion | **0/9** | **0/11** |
| Exact explanatory reasoning summary | **0/9** | **0/11** |
| Overall exact output consistency, all listed fields | **0/9** | Not a semantic-equivalence score |

Decision consistency and the explicitly defined supported safety invariants are
**9/9 (100%)**. However, the broad >=95% repeated-run target is **not fully met
if it includes raw keys, proposal versions or exact output equality**. Do not
present 100% decision stability as 100% output stability. Semantic equivalence
remains for human review.

The isolated, in-memory **GeneralFindingLedger** was seeded from the preserved
current-generator replay before accepting the fresh outputs. All material fields
matched that retained reference; all durable identities were reused. This is a
local supported-path replay, not new hosted storage/restart/writeback proof.
No local or hosted approval grant was issued in this analysis.

### Every raw key / finding-ID variation

| Case / need | Run 1 | Run 2 | Run 3 |
| --- | --- | --- | --- |
| EN11 lighting | `pendant-lighting` | `pendant-lighting-after-renovation` | `pendant-lighting-after-renovation` |
| EN11 pricing | `surge-protection` | `surge-protection-pricing` | `surge-protection-pricing` |
| EN31 outlets | `three-garage-outlets` | `garage-outlets` | `garage-three-outlets` |

Each rename changes the model-facing derived findingId; complete IDs and lineage
bindings are in [analysis.json](analysis.json). None is silently normalized away.
The source-anchored durable ID stays the same for the underlying need. EN11 and
EN31 task subjects change because they use the model key. Their executable class,
quantities, evidence, restrictions, priority and authority remain unchanged.

### Action-version variation

Every triplicate case has proposal-version variation. Eight of nine cases have
at least one group of **identical task payloads with different proposal versions**;
EN31's three subjects differ, so its payloads are not identical. The implementation
hashes `finding: raw` into the internal proposal version, including the variable
reasoningSummary. This explains the false version churn for identical payloads.

This is the **proposal** version. The complete final HubSpot payload/approval
version is a separate mechanism; no hosted approval or execution was exercised in
this batch. An actual change to any final payload property still requires fresh
approval under the accepted policy. The findings above do not authorize ignoring
subject changes or reusing an old final-payload approval.

## Highest-priority next remediation — not implemented

**Make proposal-version hashing reflect canonical action material and the complete
action payload, excluding explanatory reasoning prose.** Preserve version changes
for real classification/evidence/authority/payload changes. Then verify identical
payloads keep their version and changed payloads reject old approval. Stabilizing
human-readable subjects across synonymous raw keys can be considered separately
through the existing durable finding identity, without CRM functionality.

No runtime/prompt/schema/policy correction was made in this validation cycle.
The observed variations are retained in a separate versioned captured fixture,
with the original provider outputs and references. Review these measurements
before implementing the remediation or planning a bounded hosted rollout.

## Evidence and human review

- [Fresh outputs awaiting human review](FRESH-REVIEW.md): exact source timestamps,
  evidence, classifications, priorities, internal recommendations, task drafts,
  constraints and hashes. All remain PENDING; final execution approval is absent.
- [Complete fresh report](fresh-model.json), [append-only provider captures](provider-captures.jsonl),
  [append-only reservations](reservations.jsonl), [execution progress](execution.txt).
- [Full analysis and all field comparisons](analysis.json),
  [failure/concern references](captured-failures.json), [authorization](authorization.json).
- [Immutable captured variation fixture](../../../../fixtures/current-model-stability-captured-variation-v1.json)
  preserves all 27 triplicate raw responses for offline remediation/regression.
- [Pre-live tests](before-live-tests.txt) and [post-live tests](after-live-tests.txt):
  **212/212 pass**, including three new request-cap/credential/destination/capture
  guards. [Offline replay/accounting proof](accounting-proof.json) revalidates all
  32 fresh outputs and preserves 254 prior source/evidence/configuration files.
  Worker sources/configuration are
  unchanged; previous dry-run builds remain the applicable build evidence.

There are no newly detected automatic model/schema/grounding failures in this
batch. The recorded version/key variability is still a measured limitation and
does not disappear because workflow correctness passed. Human semantic safety,
fresh-output approval, email activation, final task execution and release acceptance
remain separate. The supported description remains **controlled prototype with
tested local safeguards**; no new revenue or hosted-recovery claim is made.
