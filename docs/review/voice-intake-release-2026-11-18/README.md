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
