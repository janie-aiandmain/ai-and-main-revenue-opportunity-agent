# Controlled-demo voice recovery and release candidate

The user authorized completing interrupted-note recovery and the broader voice
release for the EXISTING synthetic demo. This cycle does not enable customer
production, general writeback, tasks, email, CRM administration, new permissions,
new credentials, infrastructure or another namespace. Work stays on
enterprise-hardening; no merge to main.

The confirmed ceiling-fan intake/note 426427657968 remains consumed and untouched.
The user recorded one NEW recovery-control note, reviewed it and approved its
complete exact request. See hosted/recovery-run-1/operator-*.json and provenance.
It explicitly contains no customer request and no work/contact/billing/task
authority; one additional synthetic note is the maximum for the recovery drill.
The original action/payload remain valid because generation is unchanged.

## Implemented / tested independently

- Versioned explicit, authenticated recovery Save route. Both gateway and owner
  require the exact one-intake/payload/approval window and separate note-only
  fault switch. Default is disabled. An ordinary Save cannot silently enter
  fault mode, and fault mode accepts only the explicit synthetic control text.
- Durable fault marker and one-attempt POST intent, before create. The transient
  returned ID is deliberately discarded before any success/remote ID is recorded.
  The marker is flushed, then actual ctx.abort() restarts the Durable Object.
- Restart converts persisted NOTE_SENDING to NOTE_UNKNOWN. Reads reconcile
  correlation, complete properties/time and contact association. No absent,
  ambiguous, mismatched or unavailable lookup can create again.
- Closed/expiry/identity/approval/payload checks still apply; all nine task/
  general/fault controls stay false. No note-output/prompt/model/schema change.

302/302 offline tests, 207/207 retained workflow executions and both Worker
dry-run builds pass. The native workerd test actually aborts the local Durable
Object, sees a new boot, hides/reveals the independent HTTP fixture note, and
recovers one effect with one attempt. It is LOCAL evidence, not hosted HubSpot.
The first harness command failed at an import before running; the corrected
installed Miniflare adapter passed. Logs and exact policy/generation hashes are
in validation/, contracts.json and local-native-recovery.json.

The five existing v1.2 reasoning outputs now have genuine user semantic PASS,
bound append-only to exact output/payload/packet hashes in adjudication/. The
old packet's PENDING fields remain unchanged. The separate audio-transcript
field was not adjudicated by that five-row answer. The two actual operator
recording reviews remain separate evidence; broad ASR reliability is unmeasured.
No fresh reasoning inference is claimed; retained captures are replay evidence.

## Hosted gates still pending

1. Deploy the tested note-recovery guard CLOSED to both existing Workers,
   preserving all Secrets, namespace, identity/tenant/email/host settings.
2. Open only the approved recovery-control note window (at most 30 minutes and
   one durable create attempt), explicitly choose the response-loss Save once.
3. Immediately close both note switches and the note-only fault switch. Verify
   closed configuration/code, then real operator reconciliation read-only.
4. Record UNKNOWN after discard/restart and the same uniquely matched HubSpot
   note after read-only retry, with one total create attempt and changed boot.
5. Assemble the final exact-source/version/results packet for human controlled-
   demo release acceptance. Semantic PASS and exact note approval are not release.

Do not mark hosted recovery verified until those actual operator receipts arrive.
Label the injected application-response discard explicitly; it is not a natural
network outage. No revenue rescued or other financial outcome is established.

## Closed deployment completed

Tested source `367621d5d3b60cb0415c3f8a544abf3861c7d6a7` is now active on the existing
private owner (`cbd48dab-7e0a-4247-a380-7b7931bcac57`) and protected gateway
(`408305be-b9aa-4f8e-ab9e-dc7696da62dd`). Both module bytes match the uploaded
bundles. All nine task/general/fault flags and all THREE note write/release/
response-loss flags are false. Existing Secrets, namespace, identity/tenant/email
and hostname/preview settings are preserved. See hosted/recovery-run-1/
guard-before-deployment.json and guard-deployment-*.json. Five unauthenticated
routes, including the new recovery Save endpoint, redirect to Access.
No CRM/model/email call or note submission occurred during deployment.

The operator's existing exact recovery grant stays compatible: its note request
and action hashes are reproduced by the unchanged builder; only the operational
execution guard is new. Do not ask for another transcription or approval.
Open the specific test window only for this unused approved control; after the
operator result close with `node scripts/voice/note-window.js --close
--user-authorized --recovery` before further steps. Do not reopen the consumed
ceiling-fan note or any old task operation.

## Exact recovery window verified open

The actual note-window-enable.json verifies BOTH existing Workers with identical
code, Secrets, namespace, identity/tenant/email/host state and Access protection.
Only the THREE bounded note write/release/response-loss switches are temporarily
true for this exact control intake, grant and payload. All nine task/general/
legacy-fault flags remain false. Run `voice-note-run-b456842e-4246-4548-a0bc-7dfd1d1161ee`
expires November 18 at 7:46:08 p.m. Eastern (2026-11-19T00:46:08.746Z), maximum
one durable create across all retries. The controller makes zero CRM/model/mail
calls and does not submit the note.

The real operator has been asked to copy the loaded pre-test ledgerBootId, click
ONLY the explicit response-loss Save once, then Load read-only and return full
evidence. An interruption is expected. Do not reconcile until the controller
closes all THREE note switches, and never submit again. Hosted recovery remains
PENDING until actual UNKNOWN/discard/restart/readback receipts arrive.

Concurrent architecture commits d3c12d0 and 2a9478a are retained: one Revenue
Rescue product with shared governance and independently certified adapters.
They change documentation only; deployed/tested runtime remains exactly 367621d.
This voice candidate is only a controlled HubSpot synthetic demo; no customer
connector certification, website checkout or commercial-release flag is activated.

## Hosted result completed — final release decision ready

Actual recovery is CONFIRMED: HubSpot note **426418751203**, still one create
attempt, original request/action/approval unchanged. Response discard and
constructor restart were observed under the same deployed version, followed
by a second config restart and strict read-only match with all switches closed.
See hosted/recovery-run-1/CONFIRMATION.md and recovery-check.json. The separate
normal note426427657968 is unchanged. No further Save or recovery click is needed.

A final independent Cloudflare read confirms closed versions, identical code,
all12 note/task/test flags false on both Workers, same Secrets/namespace/host
and Access protection. The current normal UI also passes actual local browser/
workerd regression; original artifacts were restored and new results retained
separately. No real provider/CRM/mail call was made by those verifiers.

The completed candidate and limits are in RELEASE-REVIEW.md and
release-candidate.json. Human release acceptance remains PENDING and separate
from the five semantic PASS decisions and two exact note approvals. This accepts
no customer connector, website offer, checkout, general writeback or future
changed source. Original records and concurrent connector architecture remain
intact. A first final metadata-check command failed on a local variable-shadowing
error after reads only; the corrected reusable verifier passed with no config
mutation. The earlier local harness import failure is likewise preserved as a
fixed tooling issue, not hidden or counted as a safety pass.
