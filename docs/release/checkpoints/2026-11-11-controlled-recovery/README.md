# Controlled synthetic recovery run — setup evidence

Run `release-a42c1151-fac2-49fb-a74f-2917f53ea416` uses existing code
**203f48c96cb8e8c16ee4dc54fb4a7b9d92943240**, portal **247646122**, contact
**582095692487**, operation `operation_20a11253-37c0-4c7c-b045-e73e457d37ce`.
The operator already approved the exact pricing-only synthetic request; its
complete payload hash is
`sha256:3e47aa2d7a4cf8a8a4d9d247d8b8719a73cf755b99c7fd42241da41a396f78b6`.

Only `DEMO_ONLY_EXECUTION_ENABLED` and `DEMO_RESPONSE_LOSS_TEST_ENABLED` are
true during this run. The durable maximum is **one create attempt**. All four
general/write/release flags and the three legacy recovery flags remain false.
The window expires on **November 11, 2026, at 5:12:49 p.m. Eastern**; the source
policy rejects expired windows independently of cleanup deployments. This is
not production/customer execution authority.

[Actual code/configuration verification](window-code-and-configuration.json)
checks the two enabled controls, general flags, max one, identical run/expiry,
actual module hashes, same namespace, Access redirects and disabled owner
hostname/previews. No task is submitted by opening this window. The operator
was asked for the full pre-submit operation trace, boot ID and zero-attempt state.

**Current executed result: setup only.** No remote task ID, injected loss,
restart recovery, duplicate prevention or revenue outcome is established by
this setup package. Those results require separate actual receipts. A response
loss, if exercised, is deliberately injected after a successful HubSpot create;
it must not be described as a naturally occurring network outage.

The close helper redeploys the same source/config with both demo controls false,
public gateway first, retaining Secrets, identity mappings and SQLite storage.
It neither retries an uncertain create nor resets the ledger. Do not reopen a
new run to circumvent a consumed budget or an uncertain operation. Actual closure
and final disabled-code verification must be recorded after the test or cancellation.
