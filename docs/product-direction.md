# Product Direction — Revenue Opportunity Agent

## Controlling product intent

The AI & MAIN Revenue Opportunity Agent is **not a CRM replacement**.

It is an intelligence and orchestration layer that sits on top of an existing CRM and finds revenue opportunities that are being missed inside normal service activity.

The product should improve the client's existing operating system, not replace it.

## The moat

The moat is not a dashboard, a CRM, or an AI note summarizer.

The moat is:

**CRM-native signal detection → evidence-backed business reasoning → bounded recommendation → human approval → CRM-native action → measurable revenue impact**

Examples of useful signals include:

- a customer asks about an additional service;
- a customer wants work done later;
- a scope change arises during active work;
- a customer expresses a need that should trigger follow-up;
- a service-recovery issue could affect retention.

The agent should detect the signal, cite the evidence, classify the opportunity, recommend a bounded next action, require the correct human approval, write the approved action back to the existing CRM, and track the outcome.

## System-of-record boundary

HubSpot, or the client's chosen CRM, remains the system of record for:

- contacts;
- companies;
- deals;
- service/customer history;
- CRM notes;
- activities;
- tasks;
- lifecycle stages;
- pipeline;
- CRM administration.

AI & MAIN must not recreate those capabilities.

If deeper customer context or general CRM functionality is needed, link back to the source CRM rather than rebuilding it.

## Dashboard boundary

The AI & MAIN dashboard is an **agent operator console**, not a CRM interface.

Its job is narrow:

> Show the operator what the agent found, why it matters, what it recommends, what requires a decision, and what happened afterward.

The dashboard should expose only the minimum CRM-derived context necessary to support an agent decision.

A typical finding may show:

- customer name;
- opportunity classification;
- confidence;
- evidence;
- recommended action;
- decision controls such as Approve / Modify / Defer / Decline;
- action/result status.

Do not add generic CRM functionality such as:

- full customer-record editing;
- CRM-wide search;
- deal pipeline management;
- general task-management functionality;
- note editing;
- contact administration;
- lifecycle/stage management;
- generic CRM activity feeds.

## Human approval

The current shared approval token is a lab control that proved the principle that the agent may recommend a consequential CRM action but may not execute it without explicit human approval.

For a market-ready deployment, the preferred model is:

**authenticated operator → reviews agent recommendation → approves or declines → approval event is recorded → bounded action occurs**

The operator should not need to move into a separate client-facing application merely to approve the action.

The existing AI & MAIN dashboard should evolve into the secure operator console while the source CRM remains the system of record.

## Revenue impact

AI & MAIN should report business value produced by the agent, such as:

- opportunities identified;
- opportunities approved;
- opportunities declined;
- follow-ups created;
- opportunities converted;
- revenue influenced;
- revenue rescued;
- missed-opportunity reduction.

The product should answer:

**What business value did the agent produce?**

rather than merely:

**What did the AI do?**

## CRM-agnostic architecture

The reasoning layer should eventually operate against a common internal model, such as:

- customer;
- activity;
- service note;
- opportunity signal;
- recommended action;
- approval state;
- action result.

Platform-specific adapters should translate those concepts to systems such as HubSpot, Salesforce, Jobber, ServiceTitan, GoHighLevel, and others.

Do not couple product design to HubSpot's UI model.

## Enterprise-hardening boundary

Enterprise hardening should strengthen:

- reasoning quality;
- regression testing;
- security;
- identity;
- authorization;
- auditability;
- least privilege;
- safe writeback;
- idempotency;
- observability;
- change management;
- IT-review readiness.

Enterprise hardening must **not** solve those problems by expanding the product into a standalone CRM.

If a proposed feature does not directly strengthen one of these stages, question whether it belongs:

**CRM signal detection → evidence-backed reasoning → bounded recommendation → human approval → CRM-native action → measurable revenue impact**

## Non-goals

Do not create:

- a new customer-management system;
- a new pipeline interface;
- general task-management software;
- a contact database;
- a generic CRM activity feed;
- a separate application duplicating the client's CRM;
- autonomous customer outreach;
- autonomous deal creation;
- autonomous stage changes;
- autonomous contact edits.

The objective is to make the agent layer safer, more reliable, more auditable, and easier for client IT teams to approve while preserving the existing CRM as the operational system of record.
