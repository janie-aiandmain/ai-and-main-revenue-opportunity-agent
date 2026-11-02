# Approved policy decisions

Status: approved requirements; not claims of current runtime enforcement.
Authorized implementation here is Phases 1–3 only. Assessment approval supersedes
the initial read-only task in `codex-kickoff.md`.

- AI & MAIN is an intelligence/orchestration layer. HubSpot remains the system of
  record. The console exposes minimal finding context, decisions and results.
- A finding/opportunity is the unit of work. Each has a stable unique ID; one
  contact can have multiple independent findings. Fixture IDs are stable test
  references, not implemented production IDs or a new contact database.
- Approval binds to the exact finding and proposed action. Material changes to
  classification, evidence, recommended action or authority requirements invalidate
  approval. Default approval validity is 24 hours.
- Retrying the same approved finding/action must not duplicate a CRM task.
- HubSpot follow-up task creation is the only allowed mutation. Wording/priority
  may vary by category; no deal, contact, pipeline or general CRM management.
- External identity supplies Viewer, Approver and Admin roles. Do not build user
  management. Identity provider and role permissions require deployment design.
- Deployments are single-tenant per client with separate credentials, environment,
  configuration and audit data.
- Audit retention defaults to 12 months and is configurable. Retain minimal event
  metadata rather than duplicated CRM histories.

Current singleton evaluation, contact-only approval, shared token, absent expiry
and exact-action binding, duplicate protection and audit persistence remain gaps.
These controls are not implemented by this baseline change. No prompt change,
scope expansion, production data, deployment or merge to main is part of this work.
