# Bounded existing-demo remote recovery

**Executed:** [hosted results, exact hashes and task IDs](demo-recovery-evidence/README.md).
Normal/repeat and injected-loss/restart recovery each produced one real test task;
changed-payload approval rejection produced none. All controls are now disabled.

The user authorized deployment to the existing original demo Worker and up to
three clearly labeled synthetic tasks on HubSpot portal 247646122, contact
582095692487, only after both existing credentials' portal IDs and the exact
contact marker pass read-only verification. No new environment, namespace,
permission or Access setup is authorized. General writeback stays disabled.

## Implementation and storage reuse

`wrangler.jsonc` runs `src/demo/worker.js`, wrapping the existing application. All
general write/release flags and demo execution/fault flags default false. Its
external `DEMO_RECOVERY_LEDGER` binding names class `CertificationLedger` in the
already deployed `ai-and-main-revenue-opportunity-staging` Worker. A metadata GET
verified namespace `16dca25759494a33813d2800f3f1a850`, SQLite, owner/class and migration
tag `certification-v1`. An external binding requires no new class migration in
the caller. The owner retains its existing migration, secrets, private public-URL
state, and certification behavior; it adds only an internal storage handler.
Actual binding resolution and namespace identity are verified by the hosted run,
not inferred from the configuration.

Only the original Worker makes HubSpot requests using its existing
`HUBSPOT_ACCESS_TOKEN` / `HUBSPOT_WRITE_TOKEN`. The external ledger receives no CRM
credentials. Its per-run named instance and `demo_*` SQL tables isolate these
controls from previous findings and evidence. The owner's public entrypoint
never forwards the private ledger path. No cross-Worker HTTP authentication or
Access setup is required for a private Durable Object binding.

The fixed controls NORMAL, LOSS and CHANGED are not generated opportunities or
semantic approval. All seven flagged cases remain rejected. No model call or
production reasoning prompt/schema change occurs. The source snapshot binds the
fixed control contract, both portal identities and designated live marker. It
is freshly checked immediately before submission; a failed source/account check
revokes an unused approval. This does not certify arbitrary live-note reasoning.

Operation ID, correlation, complete final request, payload hash/action version,
source hash, approval revision/expiry and trace persist before submission. An
atomic durable transition to SENDING consumes one attempt; each operation can
consume at most one, and each authorized run at most three. The HTTP controller
sends only that stored approved payload. Every subsequent submission reconciles
with reads only, even when no task is found or the outcome is unknown. Readback
requires one correlation candidate, all requested properties and exactly the
approved contact association. Pagination limits/errors block, never authorize
another POST. No amount is recorded as opportunity value or rescued revenue.

## Operator controls and fault

The opt-in harness creates a short-lived, run-scoped operator capability in
Cloudflare Secrets. The value exists only in process memory and the secret store;
it is never printed or written to Git/reports. Deployment logs are directed to
`/dev/null`. This capability is a lab operator control, not enterprise identity or
a human semantic verdict. It does not replace or rotate HubSpot credentials.

The LOSS control deliberately discards a successful creation response before the
ledger receives a task ID or success. This is injected application-layer response
loss, not evidence of a real network outage. An operator-only private restart
aborts only that run's Durable Object, followed by original-Worker redeployment.
A changed durable boot ID and SENDING→UNKNOWN recovery must be observed before
read-only reconciliation can count as a demonstrated hosted restart recovery.
The harness finally closes the durable run, disables demo execution/fault/control
and all general flags, removes its temporary secret, and verifies cleanup.

## Run and evidence

```sh
# Paid/model runner is not used. Existing HubSpot credentials remain in the Worker.
npm test
WRANGLER_SEND_METRICS=false npm run check
npm run staging:check
NODE_USE_ENV_PROXY=1 node scripts/demo/remote-recovery.js --live --user-authorized --max-tasks=3
```

The live harness writes a new receipt under ignored `reports/`, including exact
approved requests/hashes, task IDs, durable traces, bootstrap/binding/preflight,
restarts, counts and cleanup. A failed gate stops tasks and records the blocker.
Only a receipt's actually executed scenarios may be called remote-verified.
Normal and LOSS use two tasks in the intended successful run; CHANGED uses zero.
Tests and a dry-run alone are not live recovery evidence. Captured fixtures,
baselines and pending human reviews remain untouched.

The first hosted attempt stopped before tasks at the operator-readiness gate;
settings activation is now explicit. A read-only retry then proved the external
binding but exposed workerd's unsupported `redirect: "error"` option. The adapter
now uses `manual` and rejects non-success responses without forwarding credentials
through redirects. A native workerd test covers both-credential preflight. Both
failed receipts are preserved, with zero task creations and closed controls.
