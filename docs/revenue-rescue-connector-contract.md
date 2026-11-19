# Revenue Rescue — One Product, Multiple Certified CRM Connectors

**Architecture decision:** AI & MAIN will sell one Revenue Rescue product, with interchangeable and independently certified CRM connectors. The core intelligence and governance layer remains shared. Platform adapters handle authentication, data representation, associations, action execution, and reconciliation.

**Current release boundary (November 2026):** HubSpot is an accepted *controlled synthetic demo*, not an approved real-customer implementation. General writeback is disabled. Voice-note creation has separate pending release/permission gates. No customer production connector is currently certified. These distinctions must be preserved on the storefront.

## Shared Revenue Rescue workflow

1. Read an authorized CRM note or supported source with durable record identity and original timestamps.
2. Normalize the record into a CRM-independent signal envelope, preserving exact evidence, source attribution, associations, restrictions, and unknowns.
3. Classify possible additional-service requests or scope changes; expose recommendations for human review.
4. Require an authenticated actor to approve the *complete, final* platform payload (including target, associations, body, owner, priority, due date and version).
5. Persist correlation and operation intent before the approved create; reconcile uncertain external effects before any retry.
6. Record traceable outcomes and verified revenue evidence, without claiming inferred money recovered.

CRM remains the system of record. Revenue Rescue is not a CRM replacement, appointment scheduler, autonomous outreach tool, or general pipeline manager.

## Proposed adapter contract v1

| Capability | Required behavior |
| --- | --- |
| Identity | Authorized platform and tenant ID, installation, connector version; prevent cross-tenant substitutions |
| Permissions | Scoped OAuth or platform-authorized credential; read and write grants separated; revoke must disable actions |
| Read preflight | Confirm tenant, accessible note objects, associations, plan/tier limits, page traversal, API rate limits |
| Signal retrieval | Read incremental updates with a stable source ID, source version, original timestamp, author/provenance and exact text |
| Normalization | Map contact, customer, job/deal/ticket, evidence, restrictions, relations and missing fields to a common schema |
| Action preview | Produce a complete platform-native task proposal suitable for exact hash/version approval |
| Approved write | Execute only the current human-approved payload and authorized target; never customer-contact autonomously |
| Recovery | Remote effect correlation, read-only reconciliation, no duplicate creates after uncertain outcomes |
| Outcome | Track action state, operator verdicts, and auditable attributable revenue evidence |
| Operations | Auth failures, permission changes, rate limits, retries, monitoring, retention, error escalation, client separation |

Source notes and provider voice notes must not be conflated. A voice intake connector requires distinct transcript, time, contact-association, note-create authorization and semantic release gates.

## Connector release roadmap (not availability claims)

| CRM | Prioritization | Customer release status |
| --- | --- | --- |
| HubSpot | Existing controlled demo; first production-release candidate | Not certified |
| GoHighLevel | Small-business and agency fit; investigate notes and task permissions | Not built / not certified |
| Jobber | Field service opportunity; investigate job/request/notes model | Not built / not certified |
| Pipedrive | Later sales follow-up candidate | Not built / not certified |
| ServiceTitan | Potential custom integration with higher access/partner friction | Not built / not certified |

## Commercial model

- **DIY Operations Kit ($395):** once available, use the existing product with a released connector and complete self-install resources.
- **Guided Launch ($1,190):** AI & MAIN installs the existing Revenue Rescue product using a certified connector and the standard configuration; no new connector or changed business rules.
- **Customization (from $3,500):** new/modified adapter, unsupported API feature, altered workflow or nonstandard integration. An entirely new connector may require a larger custom quote.

Once a connector passes certification, it can join the standard installation options for the one product. The buyer chooses their CRM on Pricing or Our Work before payment. Uncertified platforms lead to a no-charge compatibility review, never direct checkout.

## Connector certification exit gates

1. Functional: supported CRM plans, scopes, object associations and source types documented, with authorized read-only live preflight.
2. Semantic: approved edge-case corpus including scope changes, historical/current restrictions, evidence completeness, timing, permissions and ambiguous context.
3. Safety: tenant isolation, least privilege, prompt injection safeguards, final payload hashes, human approvals and expiry.
4. External effects: bounded, explicitly authorized test tenant CRM creates and loss/restart reconciliation, verified remotely without duplicates.
5. Operations: monitoring, revocation, alerts, retention, quotas, failure handling and tested client handoff.
6. Commercial: standard setup effort, supported options, price/tax/terms, billing, post-payment intake and responsible data access.
7. Release: explicit approval for each connector version and customer-use scope. Controlled synthetic demo approval does not transfer.

The AI & MAIN website currently requires the global release setting REVENUE_CUSTOMER_RELEASE_APPROVED=true, the approved platform in REVENUE_CERTIFIED_CONNECTORS, and offer-specific activation before checkout can be offered. These flags must *not* be set as a substitute for completing the certification gates.

## Pre-call readiness

Collect the chosen CRM and plan, account identifier (not credentials), CRM administrator's name and attendance, note source, optional additional tools, approval owner, task assignment/deadline, anonymized examples, test-data readiness and data-sensitivity flags. The intake should attach to the previously purchased platform and surface missing details to AI & MAIN before the implementation meeting.

No customer passwords, API keys, personally identifiable customer records, or sensitive documents should be entered into the web intake or sent over ordinary email.