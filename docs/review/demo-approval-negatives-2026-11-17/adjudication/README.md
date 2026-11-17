# Controlled demo release accepted

The user replied **“Approved”** to:

> Do you accept this release for the existing controlled synthetic demo, with general writeback disabled?

This closes the current existing-demo release review. The
[append-only decision](release-decisions.json) records the exact reply and its
conversation attribution; [derived status](current-status.json) reports
**ACCEPTED**. It does not fabricate a Cloudflare Access identity or runtime task
approval from the chat message.

| Exact accepted release | Binding |
| --- | --- |
| Review/evidence commit | `8178ccc584f879b6bf5d55887dc2bf5441cea690` |
| Packet hash | `sha256:8d9356f98a4f0d848d8f3093cc6117f649a3cb4ae8e76be67248937155848c76` |
| Deployed source | `bef3d71276b94c7d398225487c2ecbc36f35bd71` |
| Private owner version | `3586b7d5-0ce4-42f2-baef-5f1a744443e5` |
| Demo gateway version | `f7ae2b0f-07f1-467d-b7cd-fe8eab47b0fd` |
| Supported scope | Existing controlled synthetic demo, portal 247646122/contact 582095692487 |

The accepted evidence includes 38/38 hosted synthetic approval checks (37
negatives, zero simulated create escapes), the separately demonstrated bounded
real HubSpot task recovery after an injected application response discard,
preserved semantic decisions, 233 tests, 207 retained workflow executions and both
builds. A simulated effect is not a real CRM task; the controlled discard is not
a naturally occurring outage. No verified financial outcome is claimed.

The [original candidate](../release-candidate.json), [presented review](../FINAL-REVIEW.md)
and all ten bound evidence files remain byte-for-byte unchanged. Their PENDING
fields are capture-time history. The separate append-only event establishes the
current accepted status without rewriting those records. The verifier also
checks the unchanged deployed-source file hashes and exact source/version
bindings:

```sh
node scripts/release/verify-demo-release-acceptance.js
```

General writeback and all nine execution/fault/release switches remain disabled.
The existing owner email configuration is preserved. This acceptance grants no
new task, flag activation, credential/permission change, real-customer rollout
or approval for future changed outputs/versions. No deployment, CRM/model/mail
call, test rerun or configuration change was made to record it. The branch
remains `enterprise-hardening`; no merge to main occurred.

The exact existing demo is accepted for controlled demonstration. No further
console receipt or approval is needed to close this cycle.
