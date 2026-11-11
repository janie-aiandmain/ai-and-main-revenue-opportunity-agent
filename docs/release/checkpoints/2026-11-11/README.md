# November 11 hardening resumption

The staging credential blocker is resolved in the operator-supplied authenticated
[preflight receipt](operator-preflight-before-deployment.json): both credentials
verify portal **247646122**, the operator verifies as **Approver**, the designated
contact **582095692487** passes the synthetic marker check, and task reads pass.
The receipt reports **noteCount: 0**. It is user-supplied browser evidence, not an
authenticated request made by Codex. No key rotation or permission expansion was
needed.

The refreshed cloud environment initially restored `main`'s old code under branch
`work`. The preserved remote `enterprise-hardening` branch was fetched and checked
out at `dd992fc88a9bd13093ecc6e93fc1f7fdea3b31b8`; no source edits or merge to main
were performed. Required network domains and existing credential bindings are
now reported ready/enforced by the replacement environment. Its published draft
was not changed.

## Executed validation and deployments

- [151 local tests passed](tests-151-passed.txt), with no failures. The
  [initial sandboxed run](sandbox-test-process-failure.txt) crashed in Node's
  native callback machinery; the same suite passed outside the process sandbox
  without changing code or assertions.
- [Demo](demo-dry-run.txt) and [owner](owner-dry-run.txt) dry-run builds passed.
- The existing namespace owner and demo gateway were deployed sequentially with
  the already tested source **dd992fc**. This is an application deployment,
  not publication of a Codex environment configuration.
- [Actual provider module hashes](active-code-verification.json) match the local
  build outputs for both active deployments. Verification passed; it does not
  rely solely on a version label.

| Worker | Active deployment | Write/test/release state |
| --- | --- | --- |
| `ai-and-main-revenue-opportunity-agent` | `19e5a563-6565-45e2-9dbe-66f90aa5b84b` | All 9 execution/fault flags false; previews off |
| `ai-and-main-revenue-opportunity-staging` | `2eab5efc-7b62-4aee-956d-61793d141b63` | All 6 configured execution/fault flags false; hostname/previews off |

Secrets remain type `secret_text`, the gateway Approver mapping is preserved,
and both bindings still refer to SQLite namespace
`16dca25759494a33813d2800f3f1a850`, class `CertificationLedger`. No namespace,
migration, resource or identity infrastructure was added. The owner does not
require a separate public operator mapping; the gateway forwards its verified
actor through the private namespace binding.

Unauthenticated Node requests to `/identity`, `/operator`,
`/certification/general/findings` and `/writeback-task` returned **302** to
`falling-cell-9501.cloudflareaccess.com`. Earlier Python requests received
Cloudflare **1010**; those responses were not counted as proof of Access login
enforcement. The subsequent Node checks supply the redirect evidence.

## Remaining input and acceptance gates

The earlier credential failure is historical. Do not ask for replacement keys
based on it. The next missing input is an associated synthetic source note, not
new credentials. The operator was asked to add [this exact test note](synthetic-source-note.txt)
manually to the designated contact and rerun **Check connection (read-only)**.
The source adapter reads associated HubSpot notes without a content filter, so
the empty count is not an intentional exclusion of otherwise associated notes.

A new authenticated receipt should identify the owner source **dd992fc** and the
owner deployment above and report at least one note. After that, hosted model
evaluation can use the existing non-production credential. No model calls were
made during this resumption; cycle consumption remains **206/210**. Hosted model
correctness remains separate from the passing credential/storage/code checks.

No HubSpot task, note or other CRM object was created by the agent. No task
execution or semantic approval was created. Manual creation of a synthetic note
does not authorize task execution. General and demo-only task execution remain
disabled. The current complete hosted note-to-approved-task flow and revised
semantic/release acceptance are still pending; the earlier remote recovery
demonstration is preserved separately and is not relabelled as a new run.

UV11 chronology variation and the original hash-bound human verdicts remain as
documented in the [release results](../../README.md) and
[human-review packet](../../HUMAN-REVIEW.md). This checkpoint does not resolve
those semantic judgments or declare customer release acceptance.

The [manifest](manifest.json) hashes this checkpoint's safe receipts. The commit
containing this checkpoint records evidence; the executed source is **dd992fc**.
