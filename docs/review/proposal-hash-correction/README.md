# Proposal hash correction — local evidence, pending acceptance

The correction removes false proposal-version churn from explanatory paraphrases.
All 10 captured groups with identical authoritative material and task payloads
now have one proposal version per group. Real subject differences in EN11 and
EN31 still produce different versions. No subject or identity remediation was
performed. This remains a controlled prototype with tested local safeguards.

Checkpoint: `e9c0c57654938714c49d579204abb97f09716915`. This package records new
outputs separately; all 394 protected checkpoint evidence, fixture, request and
Wrangler configuration files remain byte-for-byte unchanged. See
[preservation proof](preservation.json). No model/HubSpot calls, email delivery,
deployment or configuration/credential/permission changes occurred. All tracked
write, test-execution, fault, email and release settings remain disabled. Hosted
state was not inspected or changed in this cycle.

## What changed

The old proposal hash used `finding: raw` after removing only `proposedAction`,
plus the complete projection and authority requirements. That unnecessarily
hashed `reasoningSummary`, informational `confidence`, raw `opportunityKey` and
the model-key-derived `findingId`, along with any other provider object fields.

The new hash has an explicit input object:

```text
SHA256(canonical({
  hashPolicyVersion, proposalVersion, reviewPolicyVersion,
  findingDecision: {
    classification, opportunityType, evidence,
    recommendedNextAction, humanReviewRequired
  },
  material: complete projection.material,
  actionPayload: complete projection.payload,
  authorityRequirements: complete authorityRequirements
}))
```

`material` retains quantities/scope, dated evidence, timing, customer-action gates,
restrictions, priority, purpose, target, authority and task/proposal policy versions.
The **complete** payload includes the subject, body, target and every property;
even a newly added property changes the hash. Recommendations remain bound
verbatim. Explanatory summaries are excluded; recommendation paraphrases are
conservatively still version changes. Object keys are recursively sorted, while
array order, whitespace and string bytes remain significant. No text normalization
or raw-key renaming occurs.

Confidence is informational in the inspected action/approval policies; it does
not select priority, authority or execution thresholds. Raw identity metadata is
excluded only as a redundant direct input. A raw key still affects the subject
and therefore the complete payload hash. Separate durable finding identity,
source/candidate revisions and final approval binding remain enforced. If a
future policy gives confidence or another field authority, that requires an
explicit versioned hash-policy update.

| Contract | Before | After |
| --- | --- | --- |
| Proposal | internal-task-proposal-v2.4 | internal-task-proposal-v2.5 |
| Task policy | internal-task-policy-v1.4 | internal-task-policy-v1.5 |
| Materializer | source-evidence-v0.3.9 | source-evidence-v0.3.10 |
| Hash policy | implicit whole-finding v2.4 | authoritative-proposal-hash-v1 |
| Review / evidence | finding-review-v2.7 / source-clause-closure-v1.1 | unchanged |
| Provider prompt / schema | reasoning-v0.3.3 / findings-v0.2 | unchanged |
| Model / reasoning | gpt-5.6-terra / low | unchanged |

Policy source SHA-256:

- Before: `5a8f6075db967a5a6c259dcd2be211e66687c51681764709261d77e51045fdbb`
- After: `883e356214bbf9b351c1c39a85706a815a0f2042a8a817d3df874d37e0ab199e`

The combined approval contract also changes from
`sha256:ddd99a2d8fac28a9a5f6444b7997023a7a89446edd9b5b42e15fd8fa72520bf0`
to `sha256:b30bd3fffc42aaaee49c7a55e5984f966fc196984953303d218ba6147fb68f04`.
[contracts.json](contracts.json) records full policy specification, source,
prompt, schema and request hashes. Specification hashes identify the documented
input recipes; per-finding action versions are recorded in [replay.json](replay.json).

Only three runtime files changed: explicit proposal inputs/version metadata,
materializer version metadata, and the combined review/approval contract hash.
No recommendation, subject, evidence completion, classification, identity,
notification or execution algorithm changed. Offline tooling now verifies the
new packet while guarding historical review generation against overwriting v0.3.9.
The original packet and human decision tests continue to validate their original
contracts/hashes rather than relabelling those outputs with today's constants.

## Measured comparison

All 27 immutable triplicate fixture captures were matched to the original 32
fresh outputs by response ID, raw output and output hash, then reprocessed.
The 27 are a subset of the 32, not 27 additional model calls. Five negative controls
have one execution each and are excluded from repeated-run denominators. This is
**capture replay, not fresh inference**.

| Measurement | Before | After |
| --- | ---: | ---: |
| Cases with one proposal version across three runs | 0/9 (0%) | 7/9 (77.8%) |
| Finding slots with one version across three runs | 0/11 (0%) | 8/11 (72.7%) |
| Identical-authority/payload groups with false version churn | 10/10 | 0/10 |
| Groups retaining genuine payload/version differences | EN11, EN31 | EN11, EN31 |
| Automated workflow passes on the 32 captures | 32/32 | 32/32 |
| Findings represented | 33 | 33 |
| Extra local durable identities | 0 | 0 |

Across all 32 executions: zero business-output, task-payload or raw-key/ID changes
relative to each corresponding old output. On repeated cases, classification,
type, actionability, evidence, restrictions, recommendation, authority, task
priority/status/type and independent-finding counts are unchanged and consistent.
The original four injection-control executions (EN31 x3, ST09 x1) remain bounded.
There are no replay false positives (0/5 negatives) or false negatives (0/27 positives).
This does not establish new model accuracy or human semantic safety.

The supported workflow additionally reprocesses 207 earlier retained executions
covering 59 scenarios, including all 31 enterprise cases and two independent
findings in each EN11/EN12 run. The comparison asserts zero business/payload
changes across those 207 executions too. Total reprocessed executions: **239**.
Within-contract, source-anchored local ledger replay retains 11 needs as 11 durable
IDs with no extra records across all 32 current captures. IDs are reused from the
local replay seed; these randomly allocated local IDs are not claims about a
hosted ledger. See [identity-replay.json](identity-replay.json) and
[supported-workflow.json](supported-workflow.json).

### Remaining variation is preserved

| Need | Run 1 raw key | Run 2 | Run 3 |
| --- | --- | --- | --- |
| EN11 pricing | surge-protection | surge-protection-pricing | surge-protection-pricing |
| EN11 lighting | pendant-lighting | pendant-lighting-after-renovation | pendant-lighting-after-renovation |
| EN31 scope change | three-garage-outlets | garage-outlets | garage-three-outlets |

Each distinct key in this table has its own model-key-derived raw `findingId`,
shown in full in [replay.json](replay.json), `summary.remainingRawKeyIdVariation`.
EN11 subject variants are `Internal pricing preparation: surge protection` versus
`Internal pricing preparation: surge protection pricing`, and `Internal verification:
pendant lighting` versus `Internal verification: pendant lighting after renovation`.
EN31 subjects are `Internal verification: three garage outlets`, `Internal verification:
garage outlets` and `Internal verification: garage three outlets`.
These are real task payload differences; they retain different versions even
though the source-anchored durable identity is reused. The two EN11 runs with the
same subject now share a version. No overall 95% version-stability claim is made:
77.8%/72.7% still fall below that target. Subject-generation/identity changes are
outside this cycle.

## Approval and identity verification

Proposal versions cover the complete **draft** action. Final CRM approval still
binds `hubspot-final-payload-v1`: complete method, URL, portal, properties, operator
due time, correlation marker and contact association. Its action version remains
`final-action-v1:SHA256({payloadHash, materialHash})`. Neither this mechanism nor
the final operation ledger source was changed.

The new tests cover recursive object-key reordering, explanatory paraphrases,
raw-key-induced subject differences and 19 authoritative/material/payload
counterexamples plus a review-policy version change. These include classification,
type, evidence, recommendation, review requirement, quantity, scope, timing,
restriction, customer gate, authority, target, subject/body, priority/status/type,
new payload fields and policy. All material counterexamples change the proposal
version. Existing integration tests continue to reject material recommendation,
classification/evidence/source changes, withdrawal, altered priority and incompatible
review contracts without making a remote write.

A new immutable **local synthetic** fixture captures a genuine v2.4 grant from
the checkpoint code. It is not a human decision or a hosted approval. Restoration
under the new contract demonstrates:

1. Old review and approval resume fail even with an unexpired grant and unchanged
   source; failure is contract/authority validation, not expiry.
2. Reevaluation reuses the durable finding ID, revokes the old grant and resets
   semantic/operator review state to PENDING.
3. A fresh local synthetic review/approval is required. The exact final request
   can have the same payload hash while the material-bound final action version
   changes for the contract migration.
4. Changing the final operator due time changes the complete payload/version and
   rejects the previous grant. Tampered subject, association, extra property or
   HTTP method independently fails final-request integrity checks.

These tests use in-memory storage and make zero create attempts. They do not
upgrade earlier hosted recovery evidence or establish new hosted certification.
See [tests/proposal-version.test.js](../../../tests/proposal-version.test.js)
and [test log](logs/tests.txt).

## Executed checks and reproducibility

| Command | Final result |
| --- | --- |
| `npm test` | 217 passed; 0 failures |
| `npm run regression:offline` | 207/207; 59 scenarios; all 31 base cases represented |
| `node scripts/review/proposal-hash-replay.js` | 32/32; all 27 variation captures verified |
| `npm run review:current` | 32 current packet outputs/hash bindings verified |
| `node scripts/review/verify-proposal-hash-checkpoint.js` | 394 protected files unchanged; 207 payload comparisons pass |
| `WRANGLER_SEND_METRICS=false npm run check` | demo dry-run passed |
| `npm run staging:check` | owner dry-run passed |

Final checks used Node 24.19.0, Wrangler 4.156.2, esbuild 0.28.2 and Miniflare
5.20261102.0-beta from the existing lockfile. The workspace initially contained
Wrangler 4.157.0; `npm ci --prefer-offline --no-audit --no-fund` restored the pinned
tools, and tests/gate/builds were rerun. Build logs contain only the proxy notice,
available-update/telemetry notices and successful dry-run exits; no deploy occurred.
During test development one counterexample set the intent to its existing value;
that test failed as expected for a no-op and was corrected to a genuine intent
change. The final suite passes. The preservation check initially hit sandbox
`spawnSync git EPERM`; it passed with local subprocess permissions. No final
validation command failed. See [logs](logs) and [verification.json](verification.json).

Replay commands only write this new correction directory and ignored `reports/`.
The replay generator refuses to overwrite this packet after its decision ledger
contains a human event. Original fixtures, captures, reservation journals,
baselines and verdicts must remain immutable.

## Remaining gates

The approved allowance remains **242/242 exhausted**. No fresh model evaluation
was attempted. Fresh validation of the changed materializer/proposal contract is
**PENDING additional authorization**; replay is not a substitute for inference.
The request/prompt/schema/model/settings themselves are unchanged.

[REVIEW.md](REVIEW.md) and [replay.json](replay.json) provide all revised output
hashes, each dated source, exact recommendation, complete draft payload and new
proposal version. All 32 execution verdicts and 33 finding review items remain
**PENDING**. Existing exact-output semantic approvals are preserved and do not
transfer. [human-decisions.json](human-decisions.json) contains no events; future
decisions must be attributable append-only events bound to those exact hashes.
Semantic acceptance, exact final-payload execution approval and release acceptance
remain three separate decisions. No execution or release approval is recorded here.

The next step is human review of the narrowed hash policy and revised contract
outputs, followed by separately authorized validation if desired. No activation,
deployment or task execution is authorized by this evidence package.
