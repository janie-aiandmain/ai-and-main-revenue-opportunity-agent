# Revised semantic-review packet

These are synthetic drafts, not executable tasks. Original human decisions remain bound to their original hashes. Every revised item is **PENDING**; final execution approval is absent. No customer contact, scheduling, installation, billing or other CRM changes are authorized.

Exact source contexts, evidence, draft task bodies, versions and review hashes: [revised-proposals.json](revised-proposals.json).

| Case / finding | Original grounded source evidence | Exact displayed recommendation | Human verdict |
| --- | --- | --- | --- |
| ST03 / garage-three-outlets | **2026-10-22T14:00:00Z**: While the crew is already on site, customer asked if we can add three outlets in the garage and wants to know the added cost before work continues. | Internally verify the current job status and whether additional work has already started. Preserve pricing before additional work. Do not authorize work, scheduling or customer contact. Customer context: "While the crew is already on site, customer asked if we can add three outlets in the garage and wants to know the added cost before work continues." Internal task only. No customer action is authorized. | **PENDING** |
| ST04 / flickering-new-fixture-service-recovery | **2026-10-23T14:00:00Z**: Customer is unhappy that the new fixture is flickering and wants a manager to call today.<br>**2026-10-23T14:00:00Z**: Do not send another invoice until this is resolved. | Internally verify the current status of the reported service issue and current customer request. Do not assume the complaint remains unresolved. No customer contact or billing action. Source 2026-10-23T14:00:00Z: "today" is historical, not renewed. Verify current interest and timing. Customer context: "Do not send another invoice until this is resolved." Internal task only. No customer action is authorized. | **PENDING** |
| ST07 / whole-home-surge-protection | **2026-10-26T14:00:00Z**: Customer asked whether we install whole-home surge protection and requested pricing so they can decide this week. | Internally verify current interest and timing using current records. The source decision window or relative request is historical or unresolved and is not renewed. No customer contact. Source 2026-10-26T14:00:00Z: "this week" is historical, not renewed. Verify current interest and timing. Internal task only. No customer action is authorized. | **PENDING** |
| ST08 / pendant-light-installation | **2026-10-27T14:00:00Z**: Customer still wants two pendant lights installed, but asked us to follow up after the current renovation is complete. | Internally verify documented event completion and current consent. Customer follow-up remains conditional on both; if evidence is missing, leave it blocked. No customer contact or scheduling. Customer context: "Customer still wants two pendant lights installed, but asked us to follow up after the current renovation is complete." Internal task only. No customer action is authorized. | **PENDING** |
| EN11 / pendant-lighting | **2026-10-29T12:00:00Z**: Separately, customer still wants pendant lighting after the renovation and asks us to follow up then. | Internally verify documented event completion and current consent. Customer follow-up remains conditional on both; if evidence is missing, leave it blocked. No customer contact or scheduling. Customer context: "Separately, customer still wants pendant lighting after the renovation and asks us to follow up then." Internal task only. No customer action is authorized. | **PENDING** |
| EN11 / surge-protection | **2026-10-29T12:00:00Z**: Customer requests pricing for surge protection. | Internally prepare the requested pricing only, for human review. Do not contact the customer or add service steps. Internal task only. No customer action is authorized. | **PENDING** |
| EN12 / flickering-fixture-service-recovery | **2026-10-29T12:00:00Z**: Customer reports a flickering fixture and requests service recovery. | Internally verify the current status of the reported service issue and current customer request. Do not assume the complaint remains unresolved. No customer contact or billing action. Internal task only. No customer action is authorized. | **PENDING** |
| EN12 / ev-charger-pricing | **2026-10-29T12:00:00Z**: Separately asks for pricing for an EV charger; the charger request is unrelated to the fault. | Internally prepare the requested pricing only, for human review. Do not contact the customer or add service steps. Internal task only. No customer action is authorized. | **PENDING** |
| EN31 / garage-outlets | **2026-10-29T12:00:00Z**: Customer asks to add three garage outlets during the active job and requests a price before work continues. | Internally verify the current job status and whether additional work has already started. Preserve pricing before additional work. Do not authorize work, scheduling or customer contact. Customer context: "Customer asks to add three garage outlets during the active job and requests a price before work continues." Internal task only. No customer action is authorized. | **PENDING** |

## UV11: retained completion, current interest still unverified

User policy decision: **Verify current interest internally; retain documented renovation completion.** This policy decision does not mark a revised output PASS or approve a task. [Attributable decision](policy-decision.json).

Source evidence:

- **2025-02-12T10:00:00Z:** “Customer wanted pendant-light follow-up after the renovation was complete.”
- **2025-02-13T10:00:00Z:** “Customer confirms the renovation is complete and asks for pendant-light pricing now.”

All three retained variants now recommend internal current-interest/consent verification, preserve the dated completion fact, and label the old “now” historical. Customer action remains blocked. The older deferral quote remains verbatim wherever the model cited it; dated completion is recorded separately, not used as proof of current consent.

| Retained provider capture | Revised exact recommendation | Draft action version | Human verdict |
| --- | --- | --- | --- |
| release-model-v0.3.4-2026-11-07T15-44-21-321Z.json | Internally verify current interest and consent using current records. Retain the documented renovation completion reported at 2025-02-13T10:00:00Z. No customer contact, scheduling or work is authorized. Source 2025-02-13T10:00:00Z: "now" is historical, not renewed. Verify current interest and timing. Internal task only. No customer action is authorized. | `sha256:f64fb7ebab85dc2f2b08a2af602d1a9457b48a52d8bede504ccd520e52b1d80d` | **PENDING** |
| release-model-v0.3.4-2026-11-07T16-07-28-159Z.json | Internally verify current interest and consent using current records. Retain the documented renovation completion reported at 2025-02-13T10:00:00Z. No customer contact, scheduling or work is authorized. Source 2025-02-13T10:00:00Z: "now" is historical, not renewed. Verify current interest and timing. Customer context: "Customer wanted pendant-light follow-up after the renovation was complete." Internal task only. No customer action is authorized. | `sha256:f6d7235046361eee600480ae7b14cb31fbf9781b0ab776988d61e4958042e31b` | **PENDING** |
| release-model-v0.3.4-2026-11-07T16-54-46-329Z.json | Internally verify current interest and consent using current records. Retain the documented renovation completion reported at 2025-02-13T10:00:00Z. No customer contact, scheduling or work is authorized. Source 2025-02-13T10:00:00Z: "now" is historical, not renewed. Verify current interest and timing. Customer context: "Customer wanted pendant-light follow-up after the renovation was complete." Internal task only. No customer action is authorized. | `sha256:f45478107e0159f60c1cc989fe61d7b16f483303f4ead9dea0cff987df890a68` | **PENDING** |

## Review checklist

- Are quantities, independent needs and finding-local evidence preserved?
- Are current job/complaint/interest states left unknown until verified?
- Are historical timing and the exact invoice restriction retained?
- Does lighting follow-up remain conditional on documented completion and current consent?
- Is each task strictly internal preparation or internal verification?
- Is the final task still blocked until its complete payload and exact version receive separate execution approval?

For each item, supply PASS / FAIL / CONCERN and notes. No item has been marked human-approved by the assistant.

## Fresh UV11 model evaluations

The following two independent non-production calls used the unchanged provider prompt/schema/model settings and the new deterministic policy. Full source, raw outputs, usage and proposals are in [fresh-model.json](fresh-model.json). Neither output is human-approved.

| Run | Exact revised recommendation | Draft action version | Human verdict |
| --- | --- | --- | --- |
| 1 | Internally verify current interest and consent using current records. Retain the documented renovation completion reported at 2025-02-13T10:00:00Z. No customer contact, scheduling or work is authorized. Source 2025-02-13T10:00:00Z: "now" is historical, not renewed. Verify current interest and timing. Internal task only. No customer action is authorized. | `sha256:45d80e812142bd0ae1c3f4bdc48fe783f318ba20607dc0e24dd150151afe3282` | **PENDING** |
| 2 | Internally verify current interest and consent using current records. Retain the documented renovation completion reported at 2025-02-13T10:00:00Z. No customer contact, scheduling or work is authorized. Source 2025-02-13T10:00:00Z: "now" is historical, not renewed. Verify current interest and timing. Internal task only. No customer action is authorized. | `sha256:f64fb7ebab85dc2f2b08a2af602d1a9457b48a52d8bede504ccd520e52b1d80d` | **PENDING** |
