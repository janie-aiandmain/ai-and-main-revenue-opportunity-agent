# Release validation checkpoint

The current supported description is **controlled prototype with tested local
safeguards**. The revised workflow is not yet a hosted, accepted customer release.
Use the [acceptance matrix](acceptance.md), [operations guide](OPERATIONS.md), and
[pending human review](HUMAN-REVIEW.md) together.

**November 11 update:** the [resumption checkpoint](checkpoints/2026-11-11/README.md)
records passing operator-supplied credential preflight and actual deployment/code
hash verification of source **dd992fc** on both existing Workers, with every
execution flag false. The designated contact has no associated source notes
(`noteCount: 0`); a synthetic note and a new authenticated preflight receipt are
needed before hosted evaluation. No new model call or HubSpot write occurred.
The older hosted-state/blocker descriptions below are historical.

**Hosted finding update:** the [first general hosted evaluation and exact task
preview](checkpoints/2026-11-11-hosted-finding/README.md) now succeed with one
synthetic source note. Pricing-only scope, restrictions and source timestamp are
preserved. The complete prepared payload hash was independently verified; final
execution approval, task creation and current-finding recovery remain pending.
Tracked model consumption is now **207/210**, including one reported hosted call.

**Approval UI correction:** source **203f48c** is now deployed and code-verified.
After an off-screen confirmation caused confusion, the console now shows inline
status/receipts and can resume the same saved approval after a refresh. The
[hosted resumption receipt](checkpoints/2026-11-11-approval-feedback/deployment/README.md)
preserves the original review, hash/version and 24-hour expiry. All **155 tests**,
the actual local browser flow and both builds passed. No HubSpot task has yet
been created for this finding; current-operation recovery remains pending.

**Interrupted-test update:** the [controlled run](checkpoints/2026-11-11-controlled-recovery/interruption-and-closure.md)
has now reserved one create attempt, persisted intent and restarted into
**UNKNOWN** with the approved hash unchanged. Both demo controls were closed
and verified false before requesting read-only reconciliation. The remote task
ID and exact match are still pending; task existence is not yet confirmed.
The trace lacks an explicit discard marker. A captured failure and a
[local storage-flush correction](checkpoints/2026-11-11-controlled-recovery/fault-marker-correction/README.md)
are preserved; **156 tests** and both builds pass for that correction, which is
not yet deployed. Hosted execution/reconciliation remains on source **203f48c**.
Tracked model use is **208/210**. Earlier statements of zero attempts above are
historical; no additional create is permitted to resolve the uncertainty.

Implementation source: [dcf6abc](https://github.com/janie-aiandmain/ai-and-main-revenue-opportunity-agent/commit/dcf6abc69b53d34c423034e88328aa4ece079dd7).
The commit containing this checkpoint records its evidence; it does not imply
that source was deployed. The [manifest](evidence/manifest.json) hashes each
artifact, identifies the prompt/request versions, and preserves raw captures.

## Executed results

| Evidence | Result | Boundary |
| --- | --- | --- |
| [Deterministic suite](evidence/release-all-tests.txt) | 151 passed, 0 failed | Local tests, including native Fetch behavior; no new HubSpot tasks |
| [Demo](evidence/release-resume-demo-build.txt) / [owner](evidence/release-resume-owner-build.txt) dry-run builds | Both passed | Build checks, not deployment checks |
| [Local Worker pipeline](evidence/release-local-worker-final.json) | 7 restarts, durable recovery and duplicate prevention exercised | Separate local HTTP/SQLite fixture; 4 fixture tasks, not HubSpot IDs |
| [Browser flow](evidence/release-browser-local.json) | Preview → approval → submission → repeat creates one fixture task | Local Chromium/workerd with synthetic signed identity; no human approval |
| [Independent model captures](evidence/manifest.json) | 205 retained outputs; 206 calls including one credential test | Non-production OpenAI project; no CRM calls by runners |
| [Final-policy replay](evidence/release-final-policy-replay.json) | 205/205 automated checks; 59 unique cases | Deterministic rematerialization of saved outputs, not 205 new calls |
| Repeated semantic decisions | 55/56 groups stable: **98.21%** | At least 3 independent outputs per group; UV11 varies |
| [Durable identity replay](evidence/release-identity-replay.json) | 37 needs → 37 identities across 205 executions; 0 extra IDs | Unchanged sources, local SQLite; not proof for arbitrary source edits |
| [Earlier hosted recovery](../demo-recovery-evidence/README.md) | Actual task IDs **415102198520**, **415333966522** | Earlier control implementation; deliberate response loss, not a genuine outage |
| Current-cycle hosted end-to-end task | **Not executed**; 0 new HubSpot tasks | Credential preflight and final-source deployment remain outstanding |

On the original 31-case corpus, classification/type/human-review checks passed
for all 122 captured executions. There were 0 false positives / 63 negative
executions and 0 false negatives / 59 positive executions. The latest full run
has 0/21 false positives and 0/10 false negatives. These repeated examples are
not independent real-world prevalence estimates.

Final-policy automated checks found no authority/injection escapes or ungrounded
quotes in the retained corpus. This is a bounded automated result, not complete
human semantic validation or a calibrated hallucination rate. Raw failures and
false-positive guards remain preserved alongside the passing replay. The
original UV14 omission remains in its immutable fixture; the source-clause closure
and new restriction counterexamples exercise the correction without editing it.

## Variation and grading limits

**UV11 remains a quality concern:** newer evidence says renovation is complete
and asks for pricing now. Captures alternate between current pricing preparation
and conservative verification retaining the older renovation gate. Both remain
internal-only and human-reviewed, but the conservative variant can delay a valid
opportunity. It must not be presented as identical semantic behavior.

Raw opportunity keys and their derived finding IDs vary for **ST03, ST08, EN11,
EN17, EN24, EN31, UV01, UV03, UV15**. They are preserved verbatim. Source-anchored
durable IDs were stable in the same-source replay; no key renames were hidden by
normalization. Exact draft action versions were stable in only **26/56** repeated
groups; exact recommendations in **55/56**. Draft versions are distinct from the
complete final payload hash/version bound by execution approval.

Automated grading checks explicit expectations, evidence grounding, authority
and source restrictions. It does not establish full semantic equivalence,
confidence calibration, or universal correctness on unseen notes. NV01, NV03 and
NV04 have only one captured run each. The targeted report's `sourceCommit`
identifies base `64ec9e5` with review-policy edits in progress; it is not an exact
committed-tree provenance claim. Legacy `v0.3.4` report filenames are retained;
the final full capture's actual materializer is v0.3.6.

## Hosted state and immediate blocker

At the [November 9 read-only inspection](evidence/release-resumed-state.json),
the [demo](https://ai-and-main-revenue-opportunity-agent.ruddy4learning.workers.dev/operator)
ran version `a33dd699-3de1-47a4-98b6-09179a9c5e94`, source `c0f2f40`;
the namespace owner ran `9a7c9590-da6a-478a-ba92-005d413d9435`, source `e01150d`.
Both retain namespace `16dca25759494a33813d2800f3f1a850` / `CertificationLedger`.
The owner hostname and previews were disabled; demo unauthenticated `/operator`
redirected to Access. All deployed execution flags were false. These are timestamped
observations; subsequent dashboard saves can create newer versions.

The latest [operator-supplied browser blocker](evidence/operator-supplied-connection-receipts.json)
is **missing_credential: STAGING_HUBSPOT_WRITE_TOKEN**. The prior read binding
returned 401; the original demo credential pair and synthetic contact marker
passed in that earlier receipt. The latest short blocker does not independently
prove the renewed full read/contact check. Configure the existing Writeback Lab
credential value securely on the namespace-owner Worker, then repeat authenticated
read-only preflight. No new key, scope expansion, or writes are needed to check it.

The highest-priority measured output remediation is **UV11 chronology-aware
selection of current pricing preparation versus a superseded deferral gate**.
Preserve the captured variants and require affected fresh validation after a
generation change. Do not begin that change by silently weakening expectations
or marking the conservative variant human-approved. First preserve this evidence
and obtain the genuinely outstanding semantic/release decisions.
