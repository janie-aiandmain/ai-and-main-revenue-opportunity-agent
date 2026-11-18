# Provider voice-note intake v1

The user clarified the intended input workflow and approved proceeding on November
18: **provider audio → transcription → transcript/time/contact review → exact
HubSpot note approval → CRM note → existing opportunity findings**. This closes a
missing input capability; the earlier accepted demo began with existing CRM notes.
The earlier release acceptance and every captured output/verdict remain unchanged.
They do not approve this feature, new transcripts, note payloads or future tasks.

## Implemented scope

The authenticated `/voice-intake` page supports microphone recording or audio-file
upload, playback, original provider transcription, reviewed corrections, original
recording timestamp and designated contact confirmation. It previews the complete
HubSpot note request and requires exact approval of that payload/version. The
recording timestamp, not processing time, becomes the note's `hs_timestamp`.
Provider reports are labeled as reports, not direct recordings of the customer.
Only English synthetic demo audio is supported in this first cycle.

It is append-only capture into HubSpot, not a CRM note editor or customer database.
There is no CRM-wide search, contact administration or editing of existing notes.
Source data and spoken instructions are untrusted text. The reviewed transcript
is preserved with quantities, negations and conditions; no inferred summary is
substituted. Creating a source note grants no customer action or follow-up task.

The code uses the existing two Workers and `CertificationLedger` class. Voice
drafts live in a separate named object in its existing namespace. No new Worker,
namespace, storage service, role or credential is introduced. Gateway and owner
both enforce fixed synthetic portal/contact and closed task execution flags.
The voice target cannot be supplied or redirected by a request body.

## Controls and versions

| Contract/control | Value and effect |
| --- | --- |
| Intake | `service-provider-voice-intake-v1.1` |
| Transcription | `verbatim-audio-transcription-v1`, `gpt-4o-mini-transcribe`, English, JSON response; no model-generated summary |
| Exact note request | `hubspot-reviewed-voice-note-v1.1`; complete portal, method, URL, body, source time, contact association and correlation |
| Note action version | `voice-note-action-v1` binds complete request and relevant voice/transcription contracts |
| Source text | `hubspot-note-text-v2`: strip actual CRM markup, then decode entities once; preserve apostrophes, quoted negations and literal entity text |
| Existing reasoning | Prompt reasoning-v0.3.3 / findings-v0.2 / model gpt-5.6-terra low / materializer v0.3.12 / evidence v1.3 unchanged |
| `VOICE_INTAKE_ENABLED` | Defaults false; explicitly required in gateway and owner before intake |
| `VOICE_NOTE_WRITES_ENABLED` + `VOICE_NOTE_RELEASE_APPROVED` | Both default false; note execution requires both plus the exact current approval |
| Existing task/fault/release controls | All nine remain false; voice approval never opens task execution |

Audio is limited to **5 MiB** and signature-checked (WAV/MP3/WebM/M4A). Browser
recording stops at two minutes; uploads must meet the byte limit. A signature
check is not codec validation; the speech provider can still reject unsupported
or corrupt media. No raw audio is persisted by the application. It is sent to
OpenAI using the existing non-production `EVAL_OPENAI_API_KEY`; the API filename
is sanitized and credentials/errors are never logged. Provider processing and
retention are governed by that project's service settings, not this application's
draft cleanup. The browser keeps only an intake ID in session storage.

Draft transcript and prepared payload text expire after **24 hours** and are
redacted by scheduled cleanup or the next access. Minimal hashes, state,
correlation and trace remain for `AUDIT_RETENTION_DAYS` (default 365). Exact
reconciliation after text redaction reconstructs the complete candidate request
from a remotely read note and compares the approved hash. No match cannot create
a replacement. Deletion after audit retention cannot silently duplicate an old
note: correlation is deterministic for the same contact/audio bytes and is checked
before a first create. Transcoded/different audio bytes are not semantically deduped.

An audio hash + tenant/contact determines a stable intake ID. Reuploading that
recording does not transcribe or create again. Failed/interrupted transcription
needs an explicit retry, at most three total requests for that recording. Provider
reservations are persisted before the call. Same-operator approval expires within
24 hours; edits to transcript, original time or provider label change the payload
and invalidate the grant. Changed identity, expiry, revision, payload or contract
blocks submission. These are note grants, not old task grants.

Operation/correlation, complete request/hash and create intent are durable before
POST. An uncertain outcome stays blocked. Read-only reconciliation enumerates
only the designated contact's notes, requires a unique correlation, exact
properties/timestamp/contact match, and never trusts a known ID alone. Missing,
ambiguous, unavailable or mismatched results do not cause another create.

## Existing credentials and permissions

Reuse `STAGING_HUBSPOT_READ_TOKEN`, `STAGING_HUBSPOT_WRITE_TOKEN` and
`EVAL_OPENAI_API_KEY` on the existing private owner. No secret values were read,
copied into configuration/Git or replaced. Earlier account/marker/task checks
prove neither audio-endpoint access nor HubSpot note-create permission.

Voice read-only preflight checks both credential portal identities, the synthetic
contact marker and the server's note-to-contact association metadata (expected
HubSpot-defined type 202). It reports note creation as
**UNVERIFIED_NO_MUTATION_PROBE**, even when all those reads pass. The reader needs
existing designated-contact/note/association reads. A later approved writer needs
bounded note creation with that association and own-account identity access.
Granular scope labels can vary by HubSpot service-key product; use the existing
capabilities and report any 403/required scope without expanding permission.
No contact, task, deal, pipeline, appointment or customer communication write is
part of voice-note ingestion. Do not create or rotate keys by assumption.

## Validation and current gates

| Gate | State |
| --- | --- |
| Initial existing suite | PASS: 233 tests, preserved baseline |
| Voice unit controls | PASS: 24 new tests, including original dates, exact approvals, old-contract rejection, actor/target mismatch, changed material, uncertainty and redaction |
| Local browser/Worker/external SQLite flow | PASS: actual browser upload/review/approval; two simulated CRM notes; injected local response loss + restart + unique read-only match, no duplicate; two existing-agent findings |
| Complete local reasoning fixture | PASS after supplying the complete expected synthetic response; no fresh inference is claimed |
| Full regression/builds | See final validation report; prior checked full suite 254/254 preceded the last two targeted additions |
| Fresh synthetic audio | PASS for four critical automated checks; original transcription and human accuracy review remain visible/PENDING |
| Original fresh reasoning | 1/3 fully correct. Both positives missed template policy boilerplate; scope label differed. All customer action/execution controls remained blocked. Original captures unchanged |
| Corrected note-format reasoning | Three-call follow-up planned, reusing the passed ASR capture; see note-format-correction/ |
| Human semantic review | PENDING for new transcript/note/finding outputs |
| Hosted intake | NOT DEPLOYED at this checkpoint; checked-in activation/write flags false |
| Actual HubSpot note-create permission / HTML round-trip / remote note recovery | UNVERIFIED; no live note was created |
| Voice release acceptance | PENDING; older task-demo acceptance does not transfer |

The first local HTTP harness attempt omitted multipart serialization in a direct
Miniflare dispatch; the real Chromium upload had already passed. That harness
failure is preserved in local-workflow-attempt1.json. The next fixture returned
only a primary quote; existing evidence checks correctly blocked missing
restrictions. Its findings are preserved in
local-workflow-attempt2-incomplete-fixture-evidence.json. The final positive
fixture includes complete expected qualifiers and now asserts zero quality
failures. No production prompt/schema or expected source restriction was weakened.
Local fixture responses are not fresh provider inference, and a safely blocked
finding is not mislabeled a good output.

## Reproduce

```sh
node --test --test-isolation=none tests/voice-intake.test.js
npm run voice:local
npm test
npm run regression:offline
npm run review:current
npm run check
npm run staging:check
npm run voice:model:plan
# Explicit opt-in; immutable lock/journal prevent a blind rerun:
NODE_USE_ENV_PROXY=1 node scripts/voice/model-note-format-validation.js --live --non-production
```

The local runtime test requires permitted loopback sockets, workerd and Chromium.
Its identities, model responses, note effects and response loss are synthetic.
The generated WAV fixtures use local FFmpeg/flite, not a real provider/person's
voice. No real HubSpot call, task, email, credential or permission change is
required for local validation.

## Measured note-format correction

The first real ASR request preserved exactly three outlets, pricing before work,
the prohibited actions, and lack of agreed price/deadline. The downstream model
preserved those spoken restrictions but omitted our added application-policy
sentence. The reviewer correctly blocked both positive candidates for incomplete
evidence; the decline control passed. Scope was labeled Cross-sell, despite the
expected Scope Change. These are failures, not three passing outputs.

The smallest correction removes application authority boilerplate from the source
CRM note. Policy stays enforced in the app/approval contracts and visible in the
UI; actual dictated restrictions, customer quantities and timestamps are unchanged.
The new v1.1 note contract cannot reuse a v1 grant. The original v1 plans, captures,
lock and four reservations remain immutable. A separate follow-up plan measures
the changed note envelopes with three fresh reasoning calls and no repeated ASR.
Classification expectations remain unchanged; any residual mismatch stays visible
for review. No downstream prompt or task-generation policy was altered to force
a pass. The original contracts.json is the v1 snapshot; current contract/source
hashes are under note-format-correction/contracts.json.
