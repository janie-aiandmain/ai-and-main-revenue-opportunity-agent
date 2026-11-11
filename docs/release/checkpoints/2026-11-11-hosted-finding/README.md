# First hosted general finding and exact task preview

Executed application source: **dd992fc88a9bd13093ecc6e93fc1f7fdea3b31b8**.
This checkpoint extends the [verified deployment](../2026-11-11/README.md);
the code, reasoning prompt, schema and production/general execution flags have
not changed.

The operator reported that the designated contact now has **one associated
synthetic note**, then clicked **Evaluate designated notes** once. The
[supplied console output](operator-finding.json) shows one stable ledger finding:
`op_902d4bd6-5675-4612-b3eb-71e7612bfd5e`, strong cross-sell / cross-sell,
high confidence, initially review PENDING. Source note `420030479039` is timestamped
`2026-11-11T20:35:43.354Z`.

## Model correctness, separately assessed

The observed finding matches the explicit synthetic positive control: pricing for
**one Level 2 EV charger installation**, with no requested/authorized site visit,
appointment, installation or other work, and no agreed price or deadline. The
recommended action is internal pricing preparation for human review, with no
customer contact or added service steps. All three relevant source statements
are displayed as evidence. See the [assistant assessment](assessment.json).

This is **one hosted positive control**, not a population accuracy estimate,
calibrated confidence score or new repeated-run campaign. The evidence is the
operator's authenticated UI display, not the complete provider JSON or token-usage
response. The configured provider request is still reasoning-v0.3.3 /
findings-v0.2 / gpt-5.6-terra / low, with source-evidence-v0.3.6 materialization.
One reported hosted invocation brings tracked cycle consumption to **207/210**.
The prior 205-capture baseline and UV11 concern are unchanged.

## Exact request prepared; final execution approval still pending

The operator reported reviewing the source/evidence/scope and used **Prepare for
review** with internal pricing preparation, MEDIUM priority and an explicit
internal task due time. The [prepared-request receipt](prepared-request.json)
contains the entire final HubSpot request, including the synthetic subject label,
verbatim evidence/source timestamp, restrictions, status/type/priority, due time,
contact association and correlation. It does not create a task.

- Portal/contact: **247646122 / 582095692487**.
- Review: `review_d45035dc-a248-41d3-8a85-0e63f567d373`.
- Complete payload hash: `sha256:3e47aa2d7a4cf8a8a4d9d247d8b8719a73cf755b99c7fd42241da41a396f78b6`.
- Reported action version: `final-action-v1:sha256:aaa3acc1739959c702f2b24f95ccdcd316a4819c5333c28914cec9d4784f184b`.
- Correlation: `ai-main-23c10cff-db09-4a4a-b992-7768d56a44d5`.
- Internal staff due time: **November 12, 2026, 3:41 p.m. Eastern**
  (`2026-11-12T20:41:00.000Z`). This does not assert a customer deadline.

The [offline hash check](prepared-request-check.json) independently recomputes the
complete payload hash from the supplied exact request and matches it. The action
version itself also binds a material hash not included in this UI receipt; it is
reported, not independently recomputed here.

The application's human review attestation and exact execution approval are
separate. At this checkpoint the review was reported, but **no final execution
approval or remote task ID has been supplied**. The operator was asked to approve
the exact displayed task only if it matches their intent and to leave submission
untouched. Assistant assessment does not supply that approval. The original nine
captured-case semantic verdicts are neither replaced nor inherited by this test.

## Remaining hosted tests

General execution, production/customer writeback and demo-only execution remain
disabled during review. A separate short-lived demo-only window, bounded to one
create on this designated synthetic contact, is prepared in source but has not
been opened for this run. No new HubSpot task or financial outcome has been
created by this checkpoint. No remote response-loss/restart/reconciliation test
has been demonstrated for this finding yet.

The next executed evidence must distinguish exact-payload approval/revision,
durably persisted intent and attempt counts, an actual task ID, injected response
discard from a natural outage, restart recovery, read-only reconciliation and
final closure of both demo test flags. Plans are not passing test results.
