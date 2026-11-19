# Revenue Rescue DIY Operations Kit — owner preview v0.1.0

**Audience:** a nontechnical service-business owner using HubSpot, Jobber or
GoHighLevel. **Product:** one intelligence/approval workflow with separately
validated CRM connectors. **Current state:** package and reusable HubSpot shadow
installation prepared; not yet a customer-released product or active paid offer.

The owner should choose their CRM, authorize a connection, select the supported
source, name a reviewer, review the demonstration and start. Editing JavaScript,
Cloudflare/Durable Object administration, API scopes and secret management belong
in the implementation, not in the owner's DIY instructions.

## Deliverables

- `owner/START-HERE.html`: standalone, accessible guided setup **preview**. It
  collects non-secret preferences and exports a planning worksheet. It does not
  connect a CRM, grant execution approval, send data or take payment.
- `owner/OWNER-GUIDE.md`: plain-language workflow and included/excluded behavior.
- `owner/EXAMPLES-AND-REVIEW.md`: bounded findings, restrictions and review examples.
- `owner/PRIVACY-COSTS-SUPPORT.md`: data flow, additional account costs and support.
- `STOREFRONT-DRAFT.md`: proposed offer and availability copy; checkout stays off.
- `CONNECTOR-READINESS.json`: evidence-based status for the three requested CRMs.
- `LAUNCH-PLAN.md`: finite completion steps and the conditions for removing the
  customer connector block through working implementation and evidence.
- `IMPLEMENTER-HANDOFF.md`: separate technical handoff for the new reusable,
  effect-free HubSpot installation. This is not a nontechnical-owner setup guide.

Build the review download from the repository root:

```sh
python scripts/diy/build-owner-package.py
```

Output is a versioned ZIP, printable PDF, checksums and manifest in
`/workspace/artifacts/revenue-rescue-diy-v0.1.0/`. Only explicitly allowlisted owner
documents are distributed. No demo credentials, contact IDs, provider captures,
Git history, deployment configuration or node_modules are copied into the ZIP.
The PDF is generated from the same owner guide sources; the manifest hashes every
downloaded file and records its source checkpoint. The archive remains labeled
PREVIEW; it must not be attached to a paid ready-to-use software offer as-is.

## Concrete progress on the customer connector blocker

`src/diy/hubspot-worker.js` is a new standalone single-tenant entry point using
the existing finding engine and CertificationLedger class in the customer's own
installation. `src/diy/hubspot-profile.js` validates a separate account, portal,
record and Access identity; vendor demo IDs are rejected. The installer prepares
a dark configuration with all CRM effects, voice intake, mail and faults disabled.
Its public route allowlist permits only verified identity, preflight and finding
evaluation/readback. Even local approval/fault/create endpoints are unavailable.

This removes the dependency on the vendor's fixed demo record for **shadow
evaluation**. It does not certify live customer data, routine customer notes,
approved customer tasks, multi-record operations, no-code provisioning or the
other two platforms. Those are explicit remaining work, not hidden settings to
switch on. The existing deployed demo and its normal voice workflow are unchanged.

## HubSpot-first continuation

The user selected HubSpot first. The new
[owner connection implementation and evidence](hubspot-owner-validation/README.md)
now adds a server-backed OAuth/owner UI, encrypted credentials, explicit
multi-record permissions, separate durable findings, revocation and restart
controls. Its local Worker/SQLite/browser tests are executed. The earlier ZIP
remains an offline owner-planning preview, not a deployed connection screen.
Actual OAuth app creation/configuration and hosted validation are pending; the
user confirmed only service keys exist. MCP is not required. Automatic paid
provisioning and real-customer release remain incomplete.
