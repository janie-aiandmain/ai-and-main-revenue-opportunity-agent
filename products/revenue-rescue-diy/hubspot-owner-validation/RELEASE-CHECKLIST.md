# HubSpot customer release — pending actual hosted evidence

Local pass is supporting evidence, not a live release verdict.

| Gate | Current state | Required review evidence |
| --- | --- | --- |
| Secure owner setup and encrypted connection | LOCAL PASS | Genuine Access owner and OAuth consent; actual approved app/scopes/portal; no secret exposure |
| Multiple permitted records | LOCAL PASS | Two real synthetic record links in authorized portal; finding/evidence isolation and stable repeat |
| Historical deadlines/restrictions/independent findings | Existing retained gate plus local fixture controls | Exact live outputs checked against their actual sources; new outputs remain PENDING semantic review |
| Revocation and restart | LOCAL PASS | Real owner removes record/disconnects; subsequent reads/inference denied; stored state survives restart |
| Least privilege | Code restricts read scopes and CRM GETs | Actual app permissions and observed API capabilities; don't infer minimal scopes from token presence |
| OAuth refresh/provider behavior | LOCAL PASS WITH FIXTURES | Actual app/token lifecycle; no blind refresh replay after uncertain state |
| Host/data isolation | Configuration prepared | Own environment/namespace/key/grant; protected host; old demo unchanged |
| Routine customer CRM note/task effects | DISABLED / NOT CERTIFIED | Separate authority, exact-payload approval and remote recovery evidence before any activation |
| No-code paid installation/provisioning | INCOMPLETE | Owner starts after purchase without staff managing each account; hosting/support responsibilities and secure entitlement verified |
| Release acceptance | PENDING | Real human acceptance of exact scope/source/deployments/evidence; not inherited from demo or earlier semantic verdicts |

Reviewer fields: PASS / FAIL / CONCERN / PENDING; actual reviewer identity;
source/deployment/evidence hash; date and notes. No row is human-approved here.
