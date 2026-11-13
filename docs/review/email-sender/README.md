# Selected operator email sender and Reply-To

The user's selection is **From alerts@aiandmain.ai, Reply-To janie@aiandmain.ai**.
The previously supplied recipient remains **janie@aiandmain.ai**. This is email
configuration direction, not human semantic acceptance, execution or release approval.

The [disabled demo template](../../../config/email-notifications.demo.json) now
records all three values. Notification policy `operator-email-alerts-v1.1` adds
optional validated `OPERATOR_EMAIL_REPLY_TO`; Resend receives it as `reply_to`.
It is persisted in the exact email request and included in its route hash. A
changed Reply-To blocks an older pending send; the old idempotency key is never
reused for different headers. Header-injection values are rejected. Other clients
may omit Reply-To. No finding, provider reasoning, task payload or approval
contract changes, and no original semantic verdict transfers.

The [previous cycle](../workflow-email/README.md) and its manifest/logs remain
unchanged. [Results](results.json), command logs and source hashes here describe
this follow-up only. All mail requests in tests are intercepted locally, including
the actual Worker alarm; no real email provider or HubSpot was called.

## Remaining account step

1. In **Resend → Domains**, add `aiandmain.ai` if it is not already verified.
2. Add exactly the verification records Resend supplies in **Cloudflare →
   aiandmain.ai → DNS → Records**, preserving existing mail/MX records. If SPF
   changes are requested for an existing hostname, reconcile them rather than
   publishing competing SPF records. Verification is not established by choosing
   the sender address; no account/DNS check was performed in this cycle.
3. Once Resend shows the domain verified, use an existing appropriate sending key
   if available. Otherwise create a **Sending access** key restricted to that
   domain. This credential is separate from HubSpot and OpenAI credentials.
4. Enter its value privately in **Cloudflare → Workers & Pages →
   ai-and-main-revenue-opportunity-staging → Settings → Variables and Secrets →
   Add → Secret**, named `OPERATOR_EMAIL_API_KEY`. Do not paste the value into
   chat or put it in Git. The owner Worker sends mail through its existing alarm;
   its public hostname remains disabled.
5. In a later authorized deployment cycle, sync the ordinary settings below into
   the owner's Wrangler vars and deploy the reviewed source. Delivery remains
   disabled until a bounded hosted delivery check can be performed. No task/write,
   fault-injection or release flag needs enabling to send operator notifications.

| Ordinary setting | Selected value |
| --- | --- |
| `OPERATOR_EMAIL_FROM` | `alerts@aiandmain.ai` |
| `OPERATOR_EMAIL_REPLY_TO` | `janie@aiandmain.ai` |
| `OPERATOR_EMAIL_TO` | `janie@aiandmain.ai` |
| `OPERATOR_EMAIL_PROVIDER` | `resend` |
| `OPERATOR_EMAIL_ENABLED` | `false` |

No deployment, DNS change, credential change, mail send, model inference or CRM
call was performed. All existing Wrangler settings and earlier evidence are
preserved. Semantic review, exact-task approval and release acceptance remain
separate and pending. The preexisting fresh-model validation gap is unchanged.
