# Enterprise Hardening Plan

## Objective

Harden the AI & MAIN Revenue Opportunity Agent to enterprise pilot readiness for a mid-market service business with an internal IT/security team.

This phase is validation-first. Do not expand product scope or production authority until the regression system demonstrates that the current reasoning and control model is safe and reliable.

## Current proven capabilities

The existing implementation has already demonstrated:

- HubSpot contact and note ingestion;
- deterministic shadow evaluation;
- AI shadow evaluation with structured output;
- a first-round 9-case adversarial reasoning suite;
- explicit human approval for writeback;
- bounded HubSpot follow-up task creation;
- separate HubSpot read and write credentials;
- Cloudflare Worker deployment;
- GitHub-based source control and validation.

These are proof-of-concept capabilities, not enterprise readiness evidence.

## Phase 1 — Baseline and architecture review

Do not change the production reasoning prompt during this phase.

Tasks:

1. inspect the complete repository;
2. document the current architecture and trust boundaries;
3. identify security, reliability, observability, and test-coverage gaps;
4. record current prompt, schema, integration, and writeback versions;
5. establish the baseline behavior of the current agent.

Deliverables:

- architecture summary;
- ranked risk register: Critical / High / Medium / Low;
- test gap analysis;
- baseline test report.

## Phase 2 — Versioned enterprise regression corpus

Move adversarial scenarios out of `src/index.js` into versioned fixtures.

The fixture schema should support:

- case ID;
- category;
- customer/service history;
- actor attribution: customer, technician, dispatcher, manager, system;
- timestamps;
- expected classification;
- acceptable alternate classifications when defensible;
- expected opportunity type;
- required human-review state;
- allowed actions;
- prohibited actions;
- evidence requirements;
- expected confidence range;
- safety-critical flag;
- rationale.

Minimum scenario categories:

- clear cross-sell;
- deferred follow-up;
- scope change;
- service recovery;
- explicit decline;
- technician recommendation without customer intent;
- stale intent;
- newest note reverses previous intent;
- multiple opportunities for one customer;
- complaint plus legitimate opportunity;
- ambiguous wording;
- negation;
- speculative wording;
- employee opinion vs customer statement;
- third-party referral;
- duplicate notes;
- malformed/minimal notes;
- long technician notes;
- out-of-order timestamps;
- contradictory notes;
- prompt injection embedded in notes;
- fake authority embedded in notes;
- instructions telling the model to change its rules;
- unsupported pricing/offer claims;
- work completed by another provider;
- customer already purchased elsewhere;
- resolved issue with no additional need.

## Phase 3 — Multi-dimensional grading

The regression harness must score:

- classification;
- opportunity type;
- human-review requirement;
- evidence fidelity;
- customer-intent attribution;
- chronology;
- hallucination;
- authority compliance;
- recommended-action safety;
- prompt-injection resistance.

Add aggregate metrics:

- overall correctness;
- safety-critical correctness;
- false-positive rate;
- false-negative rate;
- opportunity-type accuracy;
- authority-policy accuracy;
- evidence-fidelity failure rate;
- hallucination rate;
- injection failure rate;
- repeated-run consistency.

A safety-critical failure may not be hidden by an aggregate average.

## Phase 4 — Repeated-run consistency

Run model-backed cases repeatedly.

For each run retain safe test metadata:

- case ID;
- run number;
- expected result;
- actual structured result;
- pass/fail by grading dimension;
- model;
- reasoning/prompt version;
- timestamp;
- token usage where available.

Target:

- 100% safety-critical / authority / injection / hallucination pass rate;
- >=95% overall correctness;
- >=95% repeated-run consistency.

Do not tune expected answers to the model.

## Phase 5 — Controlled remediation

Only after the baseline is recorded:

1. identify the highest-severity failure;
2. add/confirm the fixture reproduces it;
3. make the smallest defensible change;
4. run the entire suite;
5. compare with baseline;
6. reject a change if it trades away a safety boundary;
7. version the change;
8. continue until the completion criteria are met or a business-policy decision is required.

If a failure is genuinely ambiguous because AI & MAIN has not defined policy, stop and surface the policy decision rather than inventing one.

## Phase 6 — Read-only HubSpot lab validation

Use only `HUBSPOT_ACCESS_TOKEN`.

Do not use `HUBSPOT_WRITE_TOKEN`.

Validate:

- correct tenant;
- known lab contacts;
- note retrieval;
- associations;
- timestamps;
- note ordering;
- multiple-note history;
- eligibility filtering;
- AI evaluation;
- output schema;
- partial/missing records;
- timeouts and upstream failures;
- safe error messages.

Compare real lab behavior with equivalent synthetic fixtures.

Do not store secrets or real CRM payloads in repository artifacts.

## Phase 7 — CI gating

Build CI so that:

- deterministic regression runs on relevant PRs;
- model-backed regression is separately identified;
- safety-critical failures block the gate;
- regressions relative to the approved baseline block the gate;
- artifacts preserve safe metrics and case IDs;
- secrets never appear in logs;
- production is never auto-promoted.

Passing CI means eligible for human review, not approved for production.

## Phase 8 — Writeback certification

Do this only after read/reasoning thresholds are met.

Use the separate write credential.

Certify:

- write credential is only reachable at the bounded write boundary;
- explicit approval is required;
- a fresh evaluation occurs before write;
- stale approvals cannot force a write;
- prohibited CRM actions cannot be invoked;
- duplicate approval does not create uncontrolled duplicate work;
- HubSpot rejection/error paths are safe;
- rollback/revocation is documented.

Current allowed write class: follow-up task creation only.

Do not expand to contact edits, deal creation, stage changes, or outbound communication without a separate approved policy and test suite.

## Phase 9 — Enterprise pilot review package

Create technical documentation for client IT/security review:

- executive technical overview;
- architecture diagram;
- data-flow diagram;
- trust boundaries;
- HubSpot scopes and permissions;
- read/write credential separation;
- model/API data flow;
- Cloudflare role;
- GitHub/deployment flow;
- secrets management;
- PII assumptions;
- retention assumptions;
- prompt-injection controls;
- human-in-the-loop controls;
- authority model;
- audit logging;
- error handling;
- observability;
- change management;
- rollback;
- credential revocation;
- incident response;
- staging-to-production promotion;
- regression methodology;
- current test results;
- known limitations;
- client responsibilities;
- AI & MAIN responsibilities;
- production-readiness checklist.

Do not make unsupported compliance, security, privacy, uptime, regulatory, or certification claims.

## Completion criteria

The enterprise-hardening work is complete only when:

- all safety-critical cases pass;
- overall regression correctness is >=95%;
- repeated-run consistency is >=95%;
- false-positive and false-negative rates are documented;
- no unsupported intent attribution is observed;
- no hallucinated pricing/timing/service/fact/authority is observed in safety-critical testing;
- no unauthorized CRM mutation is recommended as authorized;
- CI is reproducible;
- integration tests are documented;
- enterprise review documentation is current;
- known limitations are explicit;
- production promotion still requires human approval.

## Non-goals

This hardening effort does not automatically authorize:

- autonomous customer outreach;
- autonomous deal creation;
- autonomous deal-stage changes;
- autonomous contact edits;
- broader HubSpot scopes;
- production credential changes;
- direct production deployment;
- automatic merge to `main`.
