# Routine human-approved voice intake in the existing synthetic demo

The user accepted the tested voice demo and separately authorized its normal
workflow: **Record → review/correct → approve the exact note → save to HubSpot**.
The attributable acceptance/authorization is preserved in
[the append-only release event](../voice-intake-release-2026-11-18/release-adjudication/events.jsonl).
The accepted older candidate and its two confirmed notes are unchanged.

This change removes the need to coordinate a thirty-minute Cloudflare window
for each recording. It does not remove note approval or enable task execution.
Scope remains synthetic portal **247646122**, contact **582095692487**, existing
external Approver/Admin authentication and existing credentials/ledger namespace.

| Contract | Previous | Routine mode |
| --- | --- | --- |
| Operational authority | one-intake-exact-note-demo-window-v1 | authenticated-exact-note-demo-v1 |
| Action version prefix | voice-note-action-v1 | voice-note-action-v2 |
| Voice and note body | v1.2 | unchanged v1.2 |
| Transcription | verbatim-audio-transcription-v1 | unchanged |
| Reasoning prompt/schema/model/settings | existing accepted versions | unchanged |

Action v2 canonically hashes voice contract, transcription contract, **routine
execution policy version**, and the **complete final note request**. The request
includes method, URL, portal, original timestamp, complete HTML body/correlation
and contact association. Any changed request or authority policy needs fresh
approval. Unused old v1 approvals cannot silently authorize a routine save:
explicit Prepare changes the action version/revision, clears the old grant, and
requires Approve again. Confirmed notes remain confirmed under their original
versions; neither of the two demonstrated notes should be saved again.

Each recording retains an immutable audio hash/original transcript hash,
human-reviewed text, exact payload hash/revision/grant and durable submission
intent. Approval/draft expiry remains at most 24 hours. A create intent/count is
flushed before the POST; after any uncertain outcome only read-only strict
reconciliation or manual resolution is allowed, never another create. Intentional
fault injection is explicitly rejected in routine mode. Current portal credentials
and the contact marker are verified immediately before a first create.

## Executed validation before deployment

- Full suite: **310/310** passing (302 retained plus 8 targeted routine tests).
- Supported retained-capture workflow gate: **207/207**, zero false positives or
  false negatives in its 122 expected-finding checks. Replay is not fresh inference.
- Both Worker dry-run builds pass.
- [Actual local Chromium/workerd/SQLite workflow](local/local-workflow.json):
  record/upload/transcribe fixture → review → complete preview → exact approval →
  one fixture note; repeat remains one create. A second fixture tests ordinary
  transport response loss/restart/strict reconciliation without a duplicate.
  Two recordings, two fixture effects, zero unexpected writes.
- Tests reject changed payload/version/revision, stale legacy grants, expired
  approval/session, wrong actor/Viewer/portal and any task or fault activation.
- No real HubSpot/model/email calls were made by these validations. Local fake
  actors are not human approvals, and local injected faults are not live outages.

The note body generator, transcription model and reasoning output generation are
unchanged; this cycle makes **no new provider calls**. The prior hosted normal save
and injected-loss recovery remain evidence for the accepted v1 window policy,
not proof of a hosted v2 routine save. A first real signed-in v2 routine-save
receipt is **pending** until the operator supplies it. This is not a blocker to
the explicitly authorized demo activation after deterministic/build/Access gates.

## Deployment and rollback

`scripts/voice/routine-demo-deployment.js --prepare` compares the two existing
closed deployments with the accepted baseline, snapshots setting hashes (not
Secret values), and prepares temporary closed configs. Upload those two versions,
then `--activate-closed owner|gateway <version-id>` verifies all unchanged
settings/Secrets/bindings/hosts and exact tested module bytes.

`--enable-user-authorized` then changes only the routine mode/two note switches;
the note-fault and nine task/general flags stay false. Anonymous voice/identity
routes must redirect to the existing Access issuer or deny access. On failure,
the controller closes all three note switches on both Workers and records the
blocker. `--disable` closes notes while retaining evidence/resources. No create
API or model/email endpoint is invoked by the deployment controller.

Both checked-in Wrangler configurations record the desired authorized routine
state, use `keep_vars: true`, and keep staging public/preview endpoints disabled.
Live deployment/activation receipts are recorded separately in `hosted/` after
execution. No release to customers or merge to main is included.

## Operator use

Refresh [the voice page](https://ai-and-main-revenue-opportunity-agent.ruddy4learning.workers.dev/voice-intake)
to obtain the new controls. Record a **new synthetic** note. Transcribe once,
review/correct the text and verify original time/contact, Prepare the complete
note, Approve that exact note, then Save. A successful receipt says NOTE_CONFIRMED
and includes the remote note ID; retain it. No Cloudflare window is needed.
If the outcome is unknown, use Reconcile instead of recording/saving again.
Expired unfinished recordings need a new intake; expired approvals are not renewed
silently. Saving a note does not approve a task, customer action or revenue claim.
