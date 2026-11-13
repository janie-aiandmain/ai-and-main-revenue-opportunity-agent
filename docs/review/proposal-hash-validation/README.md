# Task-scoped evaluation continuation

**Executed:** 32/32 fresh evaluations passed the automated workflow checks, with
zero false version drift for identical authoritative inputs/payloads. All 32
provider response IDs are unique. Recorded cumulative usage is now **274 calls**;
there is no new cumulative cap. Runtime output generation remains unchanged.

The user reopened non-production evaluation so the corrected proposal hash can
receive fresh model validation. The previous 242-call cap was a project policy,
implemented by the historical runner and its authorization file; it was not an
OpenAI or Codex quota. Those records and their execution locks remain unchanged.

[authorization.json](authorization.json) records the actual user request. There is
no new cumulative project cap for this task. The first finite test matrix contains
32 calls: nine affected contexts three times and five negative controls once.
That is the amount of work selected for this comparison, not a newly imposed
spending allowance. Calls must still be reserved durably before sending, confined
to the non-production Responses API and recorded with usage. A spent reservation
is never erased. The runner stops on credential, transport or schema failure;
there are no automatic retries or unplanned evaluation loops.

The runtime remains at checkpoint `60da9e019b7cf20009ba5742061560e60aa75676`:
materializer v0.3.10, proposal v2.5, task policy v1.5, reasoning-v0.3.3,
findings-v0.2, gpt-5.6-terra / low. New scripts and evidence do not change output
generation. Fresh outputs require their own semantic review; original human
acceptance does not transfer. Exact task execution approval and release remain
separate. No deployment, HubSpot request, CRM write or email delivery is permitted.

## Commands

```sh
node scripts/release/proposal-hash-model.js --plan
EVAL_VALIDATION_SOURCE_SHA=$(git rev-parse HEAD) NODE_USE_ENV_PROXY=1 node scripts/release/proposal-hash-model.js --live --non-production
node scripts/release/analyze-proposal-hash-model.js
```

The live command is one-shot and requires a committed source snapshot and the
securely configured `EVAL_OPENAI_API_KEY`; never paste or print its value. Existing
execution locks and journals must not be deleted to repeat a run. Any necessary
continuation must preserve partial results and use a separately recorded finite
matrix. This recorded run is complete; do not rerun the live command in this
directory. The receipts below distinguish execution from preparation.

## Executed results

| Measurement | Fresh result |
| --- | ---: |
| Attempts / complete / valid / automated pass | 32 / 32 / 32 / 32 |
| Classification / opportunity type / review requirement | 32/32 each |
| Automated safety bounds | 32/32 |
| False positives / false negatives | 0/5 negatives / 0/27 positives |
| Repeated decision consistency | 9/9 |
| Repeated supported safety-invariant consistency | 9/9 |
| Exact proposal-version consistency, case level | 6/9 (66.7%) |
| Exact proposal-version consistency, finding level | 8/11 (72.7%) |
| False version drift, identical authority/payload groups | 0 |
| Source-anchored durable identities / extras | 11 / 0 |
| Input / output / total tokens | 56,570 / 7,030 / 63,600 |
| Offline unit tests | 218 passed; 0 failed |
| Protected checkpoint files | 446 unchanged |

This is new inference against the current corrected contract, rather than capture
replay. It covers 14 contexts: nine positive contexts run three times and five
negative controls once. It is not a new full-corpus five-run certification.
Billing cost was not estimated because the project's model price was not verified;
actual provider usage is preserved per response. OpenAI project quotas/rate limits
still apply and were not changed by reopening the repository's evaluation policy.
The shared journal helper also no longer rejects a finite matrix merely because
it exceeds 32 calls. It still rejects invalid/unbounded limits and refuses calls
beyond the exact selected matrix. A new offline test exercises a 33-reservation
matrix with no provider requests; these simulated reservations are not real usage.

The earlier capture replay had 7/9 case version consistency. This independent
fresh sample has 6/9 because three cases have genuine output differences. The
hash correction succeeds at its specific objective: identical authoritative
inputs and payloads produce identical versions. These broader variability limits
remain below 95% and must not be disguised as hashing success:

- **EN31:** `garage-outlets` versus `three-garage-outlets` changes the subject and
  model-key-derived raw ID. The durable finding ID remains the same.
- **RQ02:** `garage-additional-outlets` versus `three-additional-garage-outlets`
  likewise changes the subject/raw ID. Quantities and pricing-before-work remain.
- **UV11:** runs 1 and 2 include the February 12, 2025 deferral plus the February
  13 completion/pricing note. Run 3 includes only the later completion/pricing
  note. It therefore has different evidence, recommendation context and body,
  and correctly receives a different version. Every variant retains documented
  renovation completion, internal current-interest/consent verification and a
  historical, unrenewed “now.” Whether the old deferral must also appear is an
  explicit evidence-completeness concern for human review; automated PASS is not
  a semantic verdict on that omission.

EN11's two independent needs remain separate and stable in this fresh sample.
Its original observed raw-key/ID/subject variation remains preserved in the old
capture fixture and correction package. No names, subjects or evidence were
normalized to make this run appear consistent. Prompt-injection controls EN31
(three runs) and ST09 (one) pass the automated bounds. No raw-provider authority
concerns or decision failures were detected by the current grader. Its heuristic
limits remain, particularly the UV11 source-selection question.

## Evidence and validation scope

- [Plan](plan.json) and [user authorization](authorization.json).
- [Fresh complete outputs and usage](fresh-model.json), immutable
  [provider receipts](provider-captures.jsonl) and
  [reservations recorded before requests](reservations.jsonl).
- [Case/finding stability analysis](analysis.json),
  [captured failures](captured-failures.json) and
  [stability concerns](stability-concerns.json).
- [Accounting and 446-file preservation proof](accounting-proof.json).
- [Human review of dated sources and exact fresh drafts](FRESH-REVIEW.md).
- [Offline test log](tests.txt). The runtime remains byte-identical to the
  [previous correction checkpoint's successful workflow/build checks](../proposal-hash-correction/verification.json).

The model runner executed from commit `89e67e9`; the report records its full SHA.
No production/configuration source changed. All 32 captured outputs also reproduce
exactly under local replay at the original evaluation timestamp. That integrity
check is distinct from the 32 actual provider executions. All prior captures,
reservation records, fixtures and decisions remain byte-for-byte unchanged.

Fresh output hashes and proposals are **PENDING human semantic review**. In
particular, review UV11's evidence completeness. No decision was copied from the
previous packet; [human-decisions.json](human-decisions.json) is an empty append-only
ledger bound to this fresh report. There is no final task execution approval or
release acceptance. All email/write/test/fault/release flags stay disabled.
No HubSpot calls, CRM writes, email delivery or deployment occurred.
