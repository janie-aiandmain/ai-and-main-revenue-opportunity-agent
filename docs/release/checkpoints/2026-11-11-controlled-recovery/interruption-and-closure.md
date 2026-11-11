# Interrupted operation and verified closure

The operator's [post-interruption evidence](operator-after-interruption.json)
records operation `operation_20a11253-37c0-4c7c-b045-e73e457d37ce` in **UNKNOWN**,
with revision **1**, unchanged approved request/hash/version, no stored remote
task ID, and **one reserved create attempt**.

The ledger boot changed from `161ad1fd-9ad7-4304-991c-502b28a0f5fe` to
`560155d1-7591-45c3-b283-12c773de8fdf` before the cleanup deployment. Trace order:

1. Operation persisted at `20:42:23.350Z`.
2. Exact approvals recorded at `20:49:49.117Z`, `20:50:00.701Z`, and
   `20:51:04.537Z`; these repeated clicks concern one operation and zero creates.
3. Synthetic loss control armed at `21:21:38.071Z`.
4. Attempt reservation and POST intent committed at `21:21:43.448Z`.
5. Restart recovered uncertain state without another create at `21:21:44.127Z`.

These are **November 11 UTC timestamps**; the create-intent time is 4:21:43 p.m.
Eastern. The explicit post-create discard event is absent. A subsequent
[local correction](fault-marker-correction/README.md) diagnoses and fixes marker
durability; it does not retrospectively fill that gap in this hosted trace.

The test window was then [closed](window-closed.json), public gateway first and
ledger owner second, with no ledger reset. [Actual code/configuration checks](closed-code-and-configuration.json)
verify source **203f48c**, all nine demo and six owner execution/fault flags
false, preserved Secrets/Approver mapping/namespace, Access redirects, and a
disabled owner hostname and previews.

Closed deployments:

- Demo: `965c8478-6da1-4dc8-83f5-11a7da45be32`.
- Owner: `e6cf1615-ca7b-4d98-aebf-fe07c94632c6`.

The operator was asked to reconcile read-only after this hosted redeployment.
**Remote task ID, exact remote match and final recovery remain pending receipt.**
No second submission, approval, ledger reset or retry is authorized to resolve
the uncertainty. Missing/ambiguous/mismatched results must remain blocked.

The pre-submit evaluation and mandatory fresh evaluation account for two hosted
model invocations, bringing tracked cycle use from 206 to **208/210**. The fresh
evaluation did not invalidate the approved source/material snapshot before POST.
Confidence calibration and raw-key equivalence are not established by that fact.
No financial outcome or revenue rescue is established by a reserved attempt or
task existence.
