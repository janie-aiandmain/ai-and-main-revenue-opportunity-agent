# Actual hosted operator email delivery

The signed-in operator supplied the durable outbox receipt showing two SENT
alerts, each with one attempt, a distinct Resend provider ID and no error. When
asked whether one HIGH priority and one IMMEDIATE REVIEW email arrived at
`janie@aiandmain.ai`, the user answered **“both arrived.”** This establishes
provider acceptance and user-confirmed inbox arrival for both routes.

| Finding | Durable alert | Provider receipt | Attempts | Evidence |
| --- | --- | --- | --- | --- |
| Three additional garage outlets; op_1207462a-0eb2-4a52-a5af-57ee8d05a00b | alert_3e640bf4663dfb7a3ad08f0cb9afa26d3848eff3d6ba89365db33b9e56f73bf7 | 01a1e5d9-fd3e-7e0c-9902-aafd842a7604 | 1 | SENT; Immediate Review inbox arrival confirmed |
| Other new finding; op_be78186d-6376-4778-95c2-28001c2e3886 | alert_9034283bc5f8919ea3f1eda4ec092633764e828979a1db19bdf77ee16fb7262c | 01a1e5d9-fd7e-7a19-b55b-53cb03d03fc4 | 1 | SENT; HIGH inbox arrival confirmed |

The second finding is inferred to be surge pricing from the three-candidate
identity review; the status receipt does not itself include its subject/evidence.
No new email, model or HubSpot call was made to record these supplied receipts.

These are actual hosted sends, not local mocked deliveries. The receipt shows
one attempt per alert; it does not independently demonstrate repeated processing
or provider retry recovery. No natural outage was claimed. Semantic acceptance,
final task approval and release acceptance remain separate. Both new findings
retain the captured synthetic-label evidence blocker; no task was prepared or
submitted by this email test. General/test/fault/release execution flags remain
disabled in the last verified deployment.
