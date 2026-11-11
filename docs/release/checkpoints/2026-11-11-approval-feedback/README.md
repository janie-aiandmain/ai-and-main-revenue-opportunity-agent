# Approval feedback and safe resumption correction

The operator clicked **Approve exact task** and reported that nothing appeared to
happen. A subsequent read-only [operation status](operator-reported-approved-state.json)
showed **APPROVED**, operation
`operation_20a11253-37c0-4c7c-b045-e73e457d37ce`, with no remote task ID.
This is operator-supplied hosted evidence. The full current grant/expiry receipt
has not yet been supplied; no assistant approval is substituted for it.

## Reproduced defects and correction

The prior UI wrote success and error messages only above the long preview. A
[real local Chromium reproduction](browser-before.json) confirmed that a rejected
expired identity produced no visible message beside the controls. The prior
browser test checked document-wide text and missed this usability failure.

Finding actions now show in-progress, success and error status beside their
controls. Successful approval displays a receipt containing the operation,
review, approval identifier, complete payload hash, action version and identity
kind. The UI checks that the response matches the exact prepared request.
Non-JSON responses produce a safe visible diagnostic; requests have a bounded
timeout. Input changes clear the in-memory approval and require a new review.

The original console also lost its in-memory grant on refresh even when the
durable operation remained approved. **Resume saved approval** now rechecks the
live source and returns the same stored grant only for the same verified subject,
role, issuer/audience, current review and exact payload/action version, while the
original approval and session remain valid. It does not create or renew a grant,
change task content, extend expiry, enable execution or create a task.

The protected POST route is `general/resume-approval`, versioned
**same-operator-exact-approval-resume-v1**. Viewers cannot use it. The route reads
only the designated context through the existing reader; changed source revokes
the old approval. Grant/state/expiry are checked again after that asynchronous
read to reject concurrent revocation or review changes. Returned approval
identifiers are bound to the external identity; no JWT, cookie or credential is
returned. Existing grant policy and exact-payload contract remain unchanged.

## Executed evidence

- [155 deterministic tests passed](tests-155-passed.txt), including same-grant and
  original-expiry preservation, other subjects/roles/domains, expired sessions
  and grants, changed source/payload, concurrent revocation and Viewer denial.
- [Focused resumption tests](resume-focused-tests.txt) passed after preserving
  the [pre-correction failures](resume-before.txt).
- [Actual local Chromium/workerd flow](browser-final.json) passed: visible
  rejection, visible approval receipt, reload, resumption of the same approval
  ID/hash/version without creation, then submission/repeat yielding one local
  fixture task. The identities and task are synthetic/local, not human sign-off
  or a real HubSpot write.
- Both [demo](demo-dry-run.txt) and [owner](owner-dry-run.txt) builds passed.

No reasoning prompt, output schema, evidence policy, model setting or generation
behavior changed. No additional provider model call was needed; tracked cycle
consumption remains **207/210**. No HubSpot task was created. All general, demo
and fault execution controls remain false during this correction.

## Hosted verification still required

After the disabled deployment is verified, the operator should refresh the
console and use **Resume saved approval** for the existing operation. The current
receipt must retain the original prepared payload hash
`sha256:3e47aa2d7a4cf8a8a4d9d247d8b8719a73cf755b99c7fd42241da41a396f78b6`
and action version, and report the existing approval's original expiry. This
hosted result is pending; the local browser evidence is not relabelled as hosted.
No new approval or task submission is needed merely to check it.

The underlying task's internal due time remains **November 12, 2026, 3:41 p.m.
Eastern**. Resumption must fail if its source, identity, payload, review or timing
is no longer valid. No rollback/reset of durable storage is permitted to clear
such a failure. Earlier immutable captures and original nine-case semantic
decisions remain unchanged.
