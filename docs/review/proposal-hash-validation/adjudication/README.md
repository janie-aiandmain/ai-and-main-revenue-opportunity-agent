# Recorded user semantic approval of the fresh packet

The user stated **“I approve these”** after the latest results and review package
was linked at commit `834cd69c7817012779dc8cf86b099c9f7bcd5acb`. This is recorded
as semantic **PASS** for the exact 32 captured executions and 33 finding instances
in that packet, including all three UV11 variants. The 33 include repeated
executions of 11 underlying needs; this is not approval of 33 new CRM actions.

The [append-only ledger](../human-decisions.json) records the verbatim statement,
attribution, timestamp, packet commit, complete report hash, all 32 output hashes
and every finding's review hash, proposed action version and draft payload hash.
Attribution is to the user's chat statement. No external Access identity,
operator review record or execution grant is inferred or created.

Report hash:
`ac722851f2f89306f1a1ebe512e4da61a2d4d3f147ebc91e402b41c62eb9fab6`.
Per-finding review hashes use the existing hash helper on
`{callId, outputHash, finding}`; each identifies the unchanged exact finding
within its originally presented complete output. See
[current-status.json](current-status.json) for the complete mapping and
[decision-proof.json](decision-proof.json) for append/preservation verification.

| Captured cases | Executions | Finding instances | User semantic verdict |
| --- | ---: | ---: | --- |
| ST03 | 3 | 3 | PASS |
| ST04 | 3 | 3 | PASS |
| ST07 | 3 | 3 | PASS |
| ST08 | 3 | 3 | PASS |
| EN11 pricing and lighting | 3 | 6 | PASS |
| EN12 recovery and pricing | 3 | 6 | PASS |
| EN31 | 3 | 3 | PASS |
| UV11, all three variants | 3 | 3 | PASS |
| RQ02 | 3 | 3 | PASS |
| ST01 / ST02 / ST05 / ST09 / EN20 negative controls | 5 | 0 | PASS |
| **Total** | **32** | **33** | **PASS** |

Acceptance includes the captured EN31/RQ02 subject variants and UV11 evidence
variants as presented. It does not establish a blanket exception allowing old
conditions or restrictions to be omitted from future findings. All variants still
require internal current-interest/consent verification, retain documented
renovation completion and do not renew historical “now.” Customer-contact,
scheduling, installation, billing and other CRM authority are not granted.

This decision does not change the measured 6/9 case and 8/11 finding-level exact
proposal-version consistency, or waive the 95% target. Key/subject and evidence
selection variability remain recorded engineering limitations. Semantic
acceptance of these captured variants is separate from meeting a release gate.

## Preserved evidence and separate approvals

The original FRESH-REVIEW.md, reports, captures, reservations, fixtures, model
decisions and package manifest remain unchanged. Their PENDING fields preserve
the capture-time snapshot. The original manifest's ledger hash intentionally
identifies its preapproval state; this adjudication and its manifest identify the
new appended event and current ledger. All 16 other original manifest entries
retain their hashes. No prior semantic event was modified or transferred to a
different output, and earlier unreviewed packets remain unapproved by this event.

Semantic PASS applies only to these exact output hashes and contracts. Changed or
future outputs need separate review. All final task due times, correlations and
CRM associations still require a prepared complete payload and separate exact
execution approval in the operator workflow. This document neither creates nor
resumes such approval.

Final execution approval, email activation, deployment authorization and release
acceptance remain absent. All write/test/fault/email/release flags are unchanged
and disabled. No new model calls, HubSpot calls, tasks, emails, deployments,
credentials, permissions or configuration changes occurred in recording this
decision. Recorded model usage remains 274 calls.
