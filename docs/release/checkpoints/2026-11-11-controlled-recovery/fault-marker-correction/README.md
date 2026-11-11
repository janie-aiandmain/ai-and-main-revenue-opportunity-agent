# Post-create fault marker durability — local correction

The hosted run's [unaltered UNKNOWN-state receipt](../operator-after-interruption.json)
shows durable pre-submit intent, one reserved attempt and an automatic restart,
but lacks `INJECTED_CREATE_RESPONSE_DISCARDED_BEFORE_SUCCESS_NOT_NETWORK_OUTAGE`.
Its remote task outcome is still awaiting read-only reconciliation at the time
of this correction. The control was armed; the missing marker must not be
invented or treated as a naturally occurring outage. The captured receipt is
preserved as `fixtures/hosted-discard-marker-loss-v1.json`, with its SHA256 file.

An [actual local workerd/SQLite probe](native-flush-probe.json) reproduces the
cause: an immediate `ctx.abort()` resets the object but rolls back unflushed
post-create diagnostic writes. Earlier intent, committed in a prior request,
survives. Awaiting `ctx.storage.sync()` before the reset preserves the new marker.
The probe confirms that this API is supported by the selected workerd runtime;
it is not an assumed cross-Worker binding or a new hosted storage resource.

The application correction is deliberately narrow:

1. Existing code still reserves the attempt and persists POST intent before any
   create, and still never retries an uncertain outcome.
2. The one-use control and discard event are recorded after a successful create
   response, without persisting the remote ID.
3. The new `commitDemoFaultAndRestart` helper awaits storage synchronization,
   then intentionally aborts the Worker. Protocol version:
   **durable-discard-before-reset-v1**.

The [native regression](native-regression.txt) exercises the actual application
`consumeDemoFault` and reset helper in real local SQLite Durable Objects. Its
unflushed control loses both consumed state and trace, while the corrected path
retains consumed state and the exact discard event after the boot ID changes.
All [156 local tests](tests-156-passed.txt) and both [demo](demo-dry-run.txt) /
[owner](owner-dry-run.txt) builds pass. No HubSpot or model calls occur in these
checks; local identities/markers do not establish human approval or revenue.

**Status: implemented and tested locally, not yet deployed or exercised in a
new hosted post-create fault.** The current hosted task and reconciliation remain
on source **203f48c**, with execution already disabled. That historical run cannot
be relabelled as having used this fix. There must be no second create for its
uncertain operation. A future hosted verification requires an independently
approved bounded synthetic scenario, not resetting the current ledger or budget.

This changes diagnostic durability only. The reasoning prompt/schema/model,
finding identity, complete approved payload/hash, task authority, HubSpot scopes
and general writeback controls are unchanged. No additional paid evaluation is
required for this storage-only correction; tracked model use is **208/210**.
