# Actual read/transcribe/review-only hosted preview

The existing two demo Workers were updated to committed source
`dc8476d6594baceadac302ffe992a6ac206c49c5`, after 257 tests, 207 retained workflow
executions, both dry-run builds, the final native browser/Worker workflow, one
real generated-speech ASR request and five passing final reasoning checks. Earlier
failed runs remain preserved; the complete voice cycle reserved twelve provider
calls (one ASR, eleven reasoning). No provider call was made for deployment.

| Worker | Previous version (rollback) | New active version |
| --- | --- | --- |
| ai-and-main-revenue-opportunity-staging | 3586b7d5-0ce4-42f2-baef-5f1a744443e5 | 910bb6cd-c0a1-410d-b3c2-35ea209ac597 |
| ai-and-main-revenue-opportunity-agent | f7ae2b0f-07f1-467d-b7cd-fe8eab47b0fd | de3ec5b6-564c-4c97-90d3-bb0c0ee69138 |

Read-only [pre-deployment inspection](before-deployment.json) verified current
versions, credential binding names, namespace, tenant, identity settings and nine
false execution controls. Temporary Wrangler configs preserved all existing
ordinary settings and Secrets, adding only the three explicit voice controls and
new source tag. Secret values were neither read through Cloudflare nor written
into config/commands/Git. `wrangler versions upload` succeeded for both versions.
Before activation, candidate settings/Secret names/namespace bindings were
compared with the old immutable versions. The existing percentage deployment API
activated each candidate at 100%. No trigger deployment, new environment, binding
namespace, class migration, permission, credential or Access change was needed.

Downloaded active JS module byte hashes match the actual corresponding upload
bundle: [private owner](deployment-owner.json), [demo gateway](deployment-gateway.json).
Both `VOICE_NOTE_WRITES_ENABLED` and `VOICE_NOTE_RELEASE_APPROVED` are false;
`VOICE_INTAKE_ENABLED` is true. Every prior execution/fault/release control remains
false. Owner email remains as already authorized; gateway email remains off.
Owner public URL and all previews remain disabled. Namespace
`16dca25759494a33813d2800f3f1a850` / class CertificationLedger is unchanged; SQL
draft tables are lazy-created only in the isolated voice object within it.

[Actual unauthenticated HTTP checks](access-check.json) returned 302 to the
original Access issuer for the voice page, preflight/upload/submit and existing
operator/execute routes. A protected redirect proves the Access boundary, not
authenticated feature execution. The actual signed-in operator must provide the
next voice preflight receipt. Neither that preflight nor credential identity
checks prove note-create permission; no mutation probe is authorized by them.

No CRM call, note/task create, model request, email-provider call or credential
value inspection occurred in this deployment/readback procedure. The prior task
operations were not reset, reapproved or recreated. No merge to main occurred.
Human transcript/semantic review and exact note approval remain separate and
pending. The earlier demo release acceptance stays attached to its old exact
versions; it does not accept this new preview automatically.

Rollback, if required, means activating the two previous closed immutable versions
above and rechecking module/settings/bindings/Access. Preserve all ledger data and
consumed operations. No rollback was performed. Do not use an older open test
window version or turn on any note/task control as a rollback shortcut.

## Authenticated voice preflight completed

The user supplied the successful [voice preflight](operator-preflight.json). Both
credential identities match portal 247646122; contact 582095692487 has the required
synthetic marker; HubSpot-defined note/contact association type 202 is confirmed.
The receipt matches source dc8476d and active private-owner version 910bb6cd, from
voice ledger boot 2ee0bea3-92e0-4485-93cb-a77d52d17104. The [offline verifier](operator-preflight-check.json)
checks every field and its deployed-version binding. The supplied field list was
formatted as JSON without changing values. Attribution and the artifact hash are
in operator-preflight-provenance.json; no signed receipt or independent JWT
inspection is claimed.

This exercises the actual authenticated cross-Worker voice path. It does not
prove note-create permission or hosted transcription. The writer's own-account
identity check is a read, not a create probe. Note writes remain false, creation
permission remains UNVERIFIED_NO_MUTATION_PROBE, and semantic/execution approval
remain pending. No credential replacement, scope expansion, configuration
change, deployment, new model call or CRM mutation was made while recording it.

The next requested action is one synthetic microphone recording and transcription
in the same voice page, then sharing the transcript and **Intake and approval
evidence** JSON. Do not Prepare, Approve or Save yet. No prior consumed task
operation needs another read, grant or submission.
