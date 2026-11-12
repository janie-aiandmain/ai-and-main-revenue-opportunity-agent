# Immediate review for in-progress scope requests

The user clarified the intent: **“Basically I want in progress work with scope
change requests to be tagged differently so that there is an immediate set of
eyes on it.”** [Attributable modification/routing request](user-policy-event.json)
retains the original requested values and the ST03 output/review hashes. It is
not a semantic PASS, confirmation of current crew presence or task approval.

Implemented in source on `enterprise-hardening`, based on `b9f2e12`:

- A prominent **IMMEDIATE REVIEW · In-progress scope request** badge.
- Qualifying cards sort first, with a **Needs immediate review** count.
- **HIGH default task priority**, correctly preselected in the console.
- Internal source-context tags `team_onsite` or `in_progress_work`, with exact
  source timestamps and quotations. Current job/onsite status remains UNVERIFIED.
- The task body identifies immediate internal review and preserves pricing before
  additional work. No added work, scheduling or customer contact is authorized.

This distinguishes job context from the review task's own status/type. HubSpot
task properties remain `hs_task_status: NOT_STARTED` and `hs_task_type: TODO`.
`team_onsite` and `immediate_review` are internal context/routing labels, not
invented HubSpot enum values. The operator may explicitly modify task priority;
the source-based attention flag remains visible and the final payload needs its
own exact approval. No customer deadline or automatic due date is invented.
This is visible console routing when findings are evaluated/refreshed; no external
message, background notification or automatic customer action is added.

The rule is general, not hardcoded to ST03: it requires a scope-change finding,
grounded customer-request evidence and a reported active-job/onsite cue. Future,
negated, employee-only and completed-job contexts do not produce the flag. A newer
source reporting closure suppresses an older active-job cue. Ambiguous job linkage
is conservative; the tag is not proof that work remains in progress today.

The console labels older timestamps as historical. That presentation is separate
from the stable source facts used for action hashing; crossing midnight does not
silently change the same proposal's version.

## Evidence and limits

- [Local Chromium screenshot](console-preview.png) shows the actual rendered
  badge, first-card ordering, historical source warning and HIGH selection.
- [Browser assertions](browser.json) used only localhost synthetic read fixtures.
  No model, CRM, Worker, preflight, approval or submission endpoint was invoked.
- [Retained-capture replay](replay.json) reprocesses 207 existing outputs; it is not
  a fresh model run. Only qualifying scope cases ST03, EN31 and RQ02 acquire the
  new effective routing/body/priority behavior; all other effective behavior is
  unchanged after excluding intentional policy-version changes.
- [ST03/EN31 exact revised drafts](previews.json) retain their source, output/review
  hashes and changed action versions. Both remain PENDING human semantic review
  and blocked for execution. Original captures and prior review packets are intact.
- **188 local tests passed**, with **207/207 retained captures** passing the offline
  replay. [Focused tests](focused-tests.txt), [full tests](tests.txt),
  [demo dry-run build](demo-build.txt) and [owner dry-run build](owner-build.txt)
  record the executed local checks.

Versions: `in-progress-scope-review-v1`, `internal-task-policy-v1.4`,
`internal-task-proposal-v2.4`, `source-evidence-v0.3.9`. The provider prompt,
findings schema, model/effort and existing finding-review v2.7 are unchanged.
The changed material/proposal contract invalidates prior cached review/approval;
tests use the actual preceding checkpoint contract to verify rejection/revocation.

No deployment, HubSpot/model call, task, credential/permission or production
configuration change was performed. All tracked execution/fault/release flags
remain false. Model budget remains 210/210; **fresh model validation is PENDING**.
The historical rules diagnostic limitations and all previous human verdicts remain
separate. This is an agent oversight feature, not CRM job or task management.

Reproduce locally:

```sh
npm test
node scripts/review/scope-replay.js
node scripts/review/scope-browser.js
npm run check
npm run staging:check
```

Earlier replay commands protect their historical evidence folders; this cycle
writes only to `docs/review/in-progress-scope`. No final task execution or release
approval follows from the user's routing/priority request.
