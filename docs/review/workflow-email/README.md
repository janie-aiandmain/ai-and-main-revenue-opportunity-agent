# Supported workflow gate and operator email alerts

The user selected option 2: use the supported multi-finding workflow as the
primary offline gate, retaining the rules diagnostic as a limited secondary
check. The user also requested automatic email notifications for HIGH or
Immediate Review findings and supplied `janie@aiandmain.ai` as recipient.

## What changed

`npm run regression:offline` now reprocesses the 207 preserved provider captures
across 59 synthetic cases through the current materializer, finding grader,
inspection policy and **GeneralFindingLedger**. It checks complete corpus
coverage, finding counts, finding-specific evidence, classification/type/review,
blocked execution, action reconstruction and repeated durable identity reuse.
EN11 and EN12 must each produce two independent findings. Regression tests prove
that an otherwise correct single contact-level label cannot hide an omitted or
merged need, fabricated evidence or a prohibited customer action.

The output is `reports/workflow-offline.json`; CI runs this as the primary gate.
It records **offlineGatePassed** separately from **releaseAccepted: false** and
pending human semantics/fresh model validation. Retained captures are not new
inference and do not certify model generalization or full semantic correctness.

`npm run regression:diagnostic` preserves the corrected single-summary diagnostic
and its exit 1 for unsupported independent coverage. `regression:offline:legacy`
preserves v0.2 and its original 19/31. The new
`regression:diagnostic:report` checks only supported classification/review dimensions
and reports the full diagnostic's nonzero exit and unsupported coverage explicitly.
It fails on a regression in those dimensions. CI retains both reports; no fixture,
expectation, historical result or runtime diagnostic route is removed.

## Automatic operator email

Policy `operator-email-alerts-v1` observes accepted persisted findings, not browser
clicks or page refreshes. HIGH **or** Immediate Review qualifies; both together
produce one combined alert. A persisted operator priority change also updates
the alert state. A client-specific configuration selects sender, recipient and
protected console URL. The initial provider adapter is Resend; other channels or
providers can be added without changing the finding/action contract.

An SQL outbox is written in the finding/review transaction. The existing
CertificationLedger Durable Object owns delivery through its alarm, alongside
the existing retention alarm. No new Worker, namespace, class migration, queue,
scheduled CRM scan or CRM permission is introduced. Delivery works with the
browser closed once an evaluation has accepted a finding. **This does not add
automatic ingestion/evaluation of new HubSpot notes.**

Deduplication uses the durable finding identity and a material-change fingerprint,
not a provider's synonymous key or recommendation wording. It includes relevant
evidence/scope, classification/type, restrictions, gates, priority and urgency.
Independent needs have independent alerts. Same finding/revision does not produce
another email on reevaluation, refresh or restart; changed material produces a
new revision and cancels old queued alerts. Defer, decline, withdrawal and failed
evaluation cancel pending alerts. In-progress evaluation postpones delivery.
An alert already accepted by the mail provider cannot be recalled.

The request and idempotency key are retained before sending; storage is flushed
before provider I/O. A successful provider receipt marks SENT, which means provider
acceptance, **not verified inbox delivery**. Lost responses/restarts remain UNKNOWN
and may retry only the identical payload/key inside a conservative 23-hour window
within Resend's documented 24-hour idempotency period. The provider guarantee is
an external dependency, not proof of universal exactly-once mail. Past that window,
uncertainty blocks for manual resolution rather than risking another message.
Temporary errors back off; rejected credentials/requests and changed recipient/
sender configuration block. No automatic recipient fallback or new-key retry occurs.

Emails contain minimal operator metadata, source timestamps and a console link.
They omit customer names, CRM record IDs, note quotes and opportunity amounts.
Historical job context is explicitly not a claim that a crew remains onsite.
Evidence concerns remain blocked and visible. Alerts confer no semantic acceptance,
exact-payload execution approval, customer contact, billing or work authority.
Terminal request bodies/addresses are cleared at configured audit retention
(default 365 days); deduplication tombstones remain. Requests still in an uncertain
retry state are retained for safe resolution. Safe status is available in **Show email alert
status**, forwarded through the authenticated existing gateway.

## Setup remaining — no deployment or live send performed

The [demo configuration template](../../../config/email-notifications.demo.json)
contains the requested recipient and disabled delivery. It is a preparation file,
not an applied Wrangler/deployment configuration. Existing Wrangler configs and
all write/test/fault/release flags remain untouched and disabled.

Configure email on the **ledger-owner Worker**
`ai-and-main-revenue-opportunity-staging`, even though users enter through the
original demo Worker. Its public hostname remains disabled; the existing private
binding carries requests. Do not change Access or create infrastructure.

| Binding | Type | Value / source |
| --- | --- | --- |
| `OPERATOR_EMAIL_ENABLED` | Ordinary setting | Keep `false` until configuration and bounded deployment validation are authorized. |
| `OPERATOR_EMAIL_PROVIDER` | Ordinary setting | `resend` |
| `OPERATOR_EMAIL_TO` | Ordinary setting | `janie@aiandmain.ai` |
| `OPERATOR_EMAIL_FROM` | Ordinary setting | A sender from a domain verified with the chosen email provider; no sender has been verified here. |
| `OPERATOR_CONSOLE_URL` | Ordinary setting | `https://ai-and-main-revenue-opportunity-agent.ruddy4learning.workers.dev/operator` |
| `OPERATOR_EMAIL_API_KEY` | **Secret** | Existing suitably scoped Resend sending credential, if available; otherwise configure one after selecting/verifying the sender. Sending access restricted to that domain is sufficient. |

Enter the API value privately in Cloudflare → Workers & Pages → owner Worker →
Settings → Variables and Secrets → Add → **Secret**. Never use chat, command
arguments or Git for its value. These are not resource Bindings. Ordinary settings
must also be added to the owner Wrangler vars in the later deployment cycle so
redeployments remain in sync; this cycle deliberately leaves deployed/source
Wrangler configuration unchanged. No HubSpot or evaluation key is reused for mail.

An outbound request goes only to `https://api.resend.com/emails`; redirects are
rejected. Codex needs that hostname allowlisted only if a later explicit provider
API check is to run from Codex. This cycle uses intercepted synthetic requests;
no network or credential changes are needed for its local tests. Cloudflare
Worker egress is separate from Codex's network allowlist.

There is no automatic backlog mailing merely because delivery is enabled. The
next newly qualifying/materially changed finding produces its alert; unchanged
events observed while disabled are not replayed. A desired initial backlog is a
separate explicit policy. An absent configuration blocks activation, not permission
to substitute a customer address or bypass identity.

## Validation and remaining gates

Executed results are recorded in [results.json](results.json), with full logs and
the offline report beside it. Native workerd tests exercise the actual owner
class, SQL adapter, alarm scheduling and intercepted mail egress. File-backed
SQLite tests cover restart after persisted send intent and identical-key recovery.
These are **local tests**, not hosted email delivery or a real provider outage.

No model/HubSpot/email API calls, task creates, deployments, permission/credential
changes or production configuration changes are authorized or performed here.
The 210/210 model allowance remains exhausted. Prompt `reasoning-v0.3.3`, schema
`findings-v0.2`, materializer `source-evidence-v0.3.9`, task policy v1.4, proposal
v2.4, review v2.7, model/effort and exact-payload approval contract are unchanged.
Only notification policy v1 and offline gate v1 are introduced.

Next gates: current exact-output human semantic decisions; separately approved
fresh model validation for the previously changed generator; verified email sender
and secret configuration; then an authorized bounded hosted deployment/delivery
check. No local passing test enables CRM task submission or grants release approval.
