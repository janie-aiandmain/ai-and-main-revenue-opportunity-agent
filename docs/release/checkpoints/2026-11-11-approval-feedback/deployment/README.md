# Deployed approval feedback fix and hosted resumption

Both existing Workers now execute source
**203f48c96cb8e8c16ee4dc54fb4a7b9d92943240**. [Provider module hashes](active-code-verification.json)
match the local bundles. The demo deployment is
`7530b791-6658-467c-b881-9ab52414a03b`; the owner deployment is
`ca11035b-7fef-49e9-b55d-0d4033610c22`.

At verification all nine demo and six owner execution/fault controls were false.
Secrets, the gateway Approver mapping and existing `CertificationLedger` SQLite
namespace `16dca25759494a33813d2800f3f1a850` are preserved. The owner hostname and
all previews remain off; unauthenticated verification paths redirect to Access.

The [operator's hosted resumption receipt](operator-resumed-approval.json)
confirms the existing operation and approval were recovered through the new
same-actor source/payload validation route:

- Operation: `operation_20a11253-37c0-4c7c-b045-e73e457d37ce`.
- Approval: `approval_24149546-c59e-4594-9f21-2e22674f3e42`.
- Original review: `review_d45035dc-a248-41d3-8a85-0e63f567d373`.
- Complete payload hash and action version equal the prior prepared request.
- Identity: **EXTERNAL_VERIFIED**; state **APPROVED**; task submitted **false**.
- Original validity: November 11 at **3:51:04 p.m. Eastern** through November 12
  at **3:51:04 p.m. Eastern**, unchanged by resumption or deployments.

This is attributable operator-supplied hosted UI evidence, alongside direct
provider code/configuration checks. It establishes working approval feedback and
resumption, not task creation or current-operation remote-write recovery. No new
approval was inferred from assistant analysis. No paid model call was needed;
tracked model use remains 207/210. The next separately recorded test may enable
only a bounded demo exception, leaving general writeback false.
