# Fresh targeted validation of the reviewed current generator

**Completed: 32/32 fresh calls passed automated workflow checks; total usage is
242/242 reserved calls.** [Results and remaining variation](RESULTS.md) distinguish
100% decision/safety-invariant consistency from unstable raw names and proposal
versions. [Fresh outputs](FRESH-REVIEW.md) remain PENDING human semantic review.
No deployment, HubSpot call or email occurred, and no additional allowance remains.

The user explicitly authorized **up to 32 additional non-production model calls**,
raising the cumulative maximum from 210 to 242. The [authorization event](authorization.json)
binds the user's answer to the unchanged [published plan](../model-validation-plan.json)
and semantically approved packet. Earlier budgets, captures and decisions are
preserved; the old proposed-plan file is not rewritten as if previously authorized.

The fixed batch is nine affected contexts × three independent executions, plus
five negative controls × one execution. Each uses only versioned synthetic data,
the non-production EVAL_OPENAI_API_KEY, reasoning-v0.3.3, findings-v0.2,
gpt-5.6-terra / low and source-evidence-v0.3.9. The full non-input request hash must
match the frozen snapshot. No prompt, model, schema or runtime generator changes.

## Request accounting and capture

The runner refuses changed runtime sources, wrong credentials/destinations,
uncommitted runner changes, missing semantic approval or a different allowance.
It creates its journal and lock exclusively; an existing run cannot be silently
restarted or reset. Every attempted request, including any credential test,
requires a flushed append-only reservation first. There is no extra probe: the
first planned case also verifies the credential. Network/auth/quota/schema errors
stop the batch; no automatic retry is performed. Unrun cases remain unrun.
The hard additional maximum is 32 requests, independently of whether they succeed.

Raw successful provider output and safe response/usage metadata are flushed to
an append-only capture journal before grading. Error bodies, headers and secret
values are not stored. The output text is synthetic untrusted data, not instructions.
The runner never calls HubSpot, deploys, sends email or modifies release flags.

## Analysis definitions

Report provider/raw reasoning and post-materialization policy checks separately.
Evidence completion and canonical UV11 labels must not hide raw omissions or label
variation. Raw key/finding-ID changes remain visible; source-anchored durable IDs
are evaluated separately in a **local analysis ledger**, without approvals/tasks.

For the nine triplicate cases, distinguish decision consistency, safety-invariant
consistency, durable identity reuse, exact action-version consistency and exact
text/output equality. Semantic equivalence requires new human adjudication; a
paraphrase is not automatically unsafe or approved. Single-run controls measure
correctness only, not repeated-run consistency. Three runs are not a new five-run
certification or population accuracy estimate. Missing/invalid runs cannot pass
consistency. Full semantic safety is not established by deterministic checks.

Every fresh output remains **PENDING human semantic review**. The previously
approved retained packet does not automatically approve these outputs. Any captured
failure remains immutable evidence; no remediation is included in this run.

Results, accounting, full captures, local checks and a fresh review artifact are
recorded here. No production/CRM certification follows from it. Authorization and
journals are retained; do not remove the lock or reset reservations to rerun.
