# Closed deployment of fault-marker durability correction

Source **34a7b4257c3c491c8a89f34e29ff0c01fbdd9ee8** is now deployed on both
existing Workers. [Actual module hashes and settings](active-code-verification.json)
match the local build outputs, with all nine demo and six owner execution/fault
flags false. Secrets, Approver mapping and existing SQLite namespace/class are
preserved; owner hostname and all previews are off; unauthenticated routes
redirect to Access.

- Demo: `91d1135c-054e-4614-aa45-74401ba060d0`.
- Owner: `76c27653-bb40-45cb-8ef1-50883e6a0976`.

The explicit storage-flush helper passed the actual local workerd regression and
the full 156-test suite and both builds. It changes diagnostic persistence before
an intentional reset, not the reasoning prompt, schema, approved payload, HubSpot
permissions or normal task-creation authority.

**No new hosted post-create fault was executed on this corrected source.** The
confirmed task `420072115944` was created/recovered on source **203f48c**. Its
original missing marker remains in the immutable capture; deployment of this fix
does not retrospectively improve that evidence. No new task is authorized merely
to check this code's deployment, and the confirmed operation must not be reset.
