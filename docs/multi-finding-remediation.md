# Independent findings — v0.2

## Scope

A finding is an agent reasoning and future approval unit, not a CRM entity. No
customer profile, pipeline, general task manager, notes editor or deal store is
created. HubSpot remains the system of record. This change introduces no identity,
authentication, durable idempotency, approval issuance/expiry enforcement or live
writeback changes. No deployment or HubSpot request was made for validation.

`/ai-shadow-evaluate` now returns `findings-v0.2` arrays within each evaluated
context, including empty arrays when no actionable signal remains. Each finding
has its own classification, type, confidence, evidence, recommendation, review
requirement and exact versioned task proposal. `findingCount` counts independent
findings; `recordsEvaluated` still counts contexts. This is an explicit API shape
change for consumers of that read-only endpoint.

The existing `/writeback-preview`, `/writeback-test`, `/writeback-task` and legacy
stress endpoint retain the v0.1 reasoning path. They are a lab mechanism and are
not wired to approve or execute v0.2 proposals. Do not use their contact-only
approval payload as approval for any new finding. The existing live writeback
handler is intentionally unchanged in this work; migrating that path requires
separately approved exact finding/action binding. No new proposal is executed here.

## Versioned reasoning contract

- Prompt: `reasoning-v0.2`.
- Structured model output: a single object with `findings: []`, versioned as
  `findings-v0.2` after server materialization.
- Action proposal: `follow-up-task-proposal-v1`.
- Source contract: `src/findings-request-v0.2.json`; frozen test snapshot:
  `fixtures/production-request-v0.2.json`.
- Model and reasoning effort remain `gpt-5.6-terra` / `low`.
- Original reasoning instructions are retained verbatim as a prefix. Five appended
  instructions apply those rules independently, define zero/multiple results,
  canonical opportunity keys, per-finding evidence and required human review.
- `src/reasoning.js`, the v0.1 corpus, frozen request and recorded baseline remain
  unchanged for compatibility and comparison.

## Identity and exact action versions

The caller supplies a stable context reference (not the mutable customer name).
The read-only HubSpot adapter uses `hubspot:contact:<source-id>` within a single
client deployment. Evaluation fixtures use `synthetic:<case-id>`. Callers outside
that adapter must include a stable client/source namespace when sharing references
across deployments. Context references are identifiers, not authorization evidence.

The model supplies a canonical semantic `opportunityKey` such as
`surge-protection` or `pendant-lighting`. Service/location qualifiers distinguish
independent needs of the same type. Duplicate keys are rejected, never merged or
silently discarded. The Worker computes:

`findingId = finding_ + SHA256(canonical({contextKey, opportunityKey}))`

The ID is deterministic, independent of array position, names, timestamps,
classification, evidence prose and action content. Re-evaluation with the same
context/key keeps the ID even when material information changes. Known keys can
be supplied on subsequent evaluations via `knownOpportunityKeys` to encourage
reuse. A key rename represents a new identity; this stateless change cannot prove
semantic identity across model-generated synonyms or arbitrary key drift. Such
changes require reconciliation before future approval, never automatic merging.
No durable finding registry or idempotency store is introduced in this scope.

Each proposal contains a fixed action class (`hubspot.follow_up_task.create`),
context target, exact task properties, authority requirements and an `actionVersion`.
The version hashes canonical schema versions, the complete finding, authority
requirements and action payload. Thus changes to classification, evidence,
recommendation, confidence, summary, priority or authority change the action
version without changing the finding ID. Stable serialization and evidence order
remove object-key/output-order effects. No clock-based due date is inserted.
Any later addition of an association, assignee, due date or other submitted field
must be bound and versioned before approval; the current target is a context
reference, not a fully resolved HubSpot write request.

Future approval must bind to `findingId + proposedAction.actionVersion`, with the
already approved 24-hour validity and material-change reapproval policies. Hashes
are content/version references, not authentication, signatures or approval tokens.

## Evidence boundaries

Input notes carry stable source IDs. When no CRM note ID is supplied (synthetic
or standalone contexts), a timestamp/text digest supplies a stable reference.
Identical notes are deduplicated; conflicting content under one source ID fails.
The model must return exact source quote substrings for each finding. The Worker
rejects missing or invented quotes, duplicate opportunity keys, overlapping quote
spans across independent findings and actionable output without human review.

Quotes and task body evidence are local to each finding. Neither the other
findings nor the full CRM history are copied into a proposal. Source grounding
and nonoverlap are structural protections, not proof of semantic relevance. Human
review remains necessary. Repeated identical quote occurrences use the first
matching offset; ambiguous overlapping citations fail closed rather than guessing.

## Regression comparison

`enterprise-v1.json` and all v0.1 artifacts are retained unchanged. The versioned
`enterprise-v2.json` preserves all 31 source contexts and adds explicit per-finding
expectations. Negative contexts expect zero findings. EN11 requires surge pricing
and deferred lighting separately; EN12 requires service recovery and EV charger
pricing separately, with topic-specific evidence inclusion/exclusion checks.

Run all existing and new offline tests with `npm test`; build with `npm run check`.
The separate opt-in live comparison is:

```sh
npm run regression:findings -- --live --non-production
```

It uses only the non-production evaluation key and fixed Responses destination,
checks the full v0.2 request against its snapshot, checkpoints results and preserves
errors. It never calls HubSpot. The old opt-in runner remains available for v0.1.
No repeated-run or semantic safety certification is implied by one comparison run.
