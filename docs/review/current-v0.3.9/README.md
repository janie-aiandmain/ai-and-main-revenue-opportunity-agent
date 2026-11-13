# Consolidated current semantic-review packet

[REVIEW.md](REVIEW.md) is the current review entry point. It contains the nine
revised findings and all five retained UV11 variants at materializer v0.3.9,
task policy v1.4, proposal v2.4 and review v2.7. Each item shows exact dated source,
finding-specific evidence, classification/type/confidence, exact internal
recommendation, task properties, restrictions, historical timing, uncertainty,
priority/routing, output/review hashes and a PENDING verdict field.

The original packets, raw captures, failures and verdicts remain unchanged.
ST03/EN31 match their separately published current previews. All other entries
now expose the current proposal/hash instead of the earlier v2.3 drafts.
This is consolidation and offline verification; no runtime generator changes.

## Decisions the user can make now

- Give **PASS / FAIL / CONCERN plus notes** for each review ID.
- UV11 uses the user's chosen **Cross-sell** classification. Its exact current
  draft is internal current-interest/consent verification, retaining documented
  February 13, 2025 renovation completion and historical “now.”
- Decide whether UV11's **HIGH** priority is appropriate. That default follows
  Cross-sell and would trigger operator email after later activation. The
  assistant recommends CONCERN until that priority is explicitly reviewed; no
  priority or classification is silently changed here.
- If one verdict covers all five UV11 captures, explicitly identify
  **UV11-1 through UV11-5**. Similar wording is not automatic transfer of approval.

The [decision ledger](human-decisions.json) has no new semantic events yet. Future
events must append the user's attributable wording, recording time, packet hash,
review ID, review-item hash and output hash. They must not edit previous verdicts,
renew old task approvals or enable execution/release. Final due time, association,
correlation and exact-payload execution approval remain absent; every task stays
BLOCKED even if its draft is semantically accepted.

## What can proceed while DNS verification completes

| Work | State / boundary |
| --- | --- |
| Consolidation and offline hash/source verification | Completed, no external calls. |
| Genuine human semantic decisions | Ready for the user; all 14 entries PENDING. |
| Fresh model validation | Proposed only; existing 210/210 cap is unchanged. |
| Hosted deployment and feature/delivery verification | Not executed; remains gated. |

The user subsequently reported that DNS/domain verification is complete. This is
recorded separately as **user-reported**, not an independent provider/API check.
It does not approve semantics or enable email. The sending-secret configuration
and bounded hosted delivery check remain separate.

The subsequent [Cloudflare Secret-name check](email-secret-presence.json) found
`OPERATOR_EMAIL_API_KEY` as Secret on the original demo Worker, but not on the
ledger-owner Worker `ai-and-main-revenue-opportunity-staging`. This is a verified
**location mismatch**, not a rejected Resend credential. Values were not retrieved.
Configure the same existing key on the owner from its secure source; no new key,
scope change, extraction from Cloudflare or automatic transfer is required.

## Proposed fresh-model allowance — NOT AUTHORIZED

[model-validation-plan.json](model-validation-plan.json) proposes at most **32
additional non-production Responses calls**, taking the recorded maximum from
210 to 242 only after explicit user approval. It is not a reservation/reset and
does not alter any existing budget record or runner. Nine affected scenarios ×
three independent runs = 27; five negative controls × one run = 5. Every source
is an existing synthetic fixture. RQ02 covers the additional active-job scope
case, alongside the seven flagged cases and UV11. Controls cover decline,
employee attribution, chronology/reversal and injection.

The request retains reasoning-v0.3.3 / findings-v0.2 / gpt-5.6-terra / low.
Output shaping and task policies are pinned in the review packet. If semantic
decisions require further generation changes, update the versioned plan before
requesting/running the new validation. Fresh outputs will require their own
human-review bindings; acceptance of these retained captures does not transfer.
The proposed three runs do not replace or relabel the earlier five-run study.

## Reproduction and evidence

```sh
node scripts/review/consolidate-current.js --check
npm run review:current
```

The assembler reads the original raw outputs, rematerializes using the retained
synthetic evaluation clock, verifies current hashes against the preserved
multi-finding replay, validates evidence and emits only this new versioned packet.
It refuses to overwrite changed existing review artifacts, or operate after a
materializer/proposal contract change. `--check` does not write artifacts.

[Results](results.json), [tests](tests.txt), [review check](review-check.txt),
[source/packet manifest](manifest.json) and the machine-readable packet establish
what was actually executed. This cycle makes zero model/CRM/mail-delivery calls,
creates no tasks, makes no credential/configuration changes itself, and deploys
nothing. The separate Cloudflare account inspection is read-only metadata only.
Email and all write/test/fault/release flags remain disabled. No merge to main.
