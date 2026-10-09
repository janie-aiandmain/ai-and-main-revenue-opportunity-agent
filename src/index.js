const RELEASE = "2026-10-09-revenue-opportunity-agent-v0.1";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({
        status: "ready",
        service: "AI & MAIN Revenue Opportunity Agent",
        release: RELEASE,
        mode: "read-only deployment practicum",
        hubspotSecretConfigured: Boolean(env.HUBSPOT_ACCESS_TOKEN),
        crmWritesEnabled: false,
      });
    }

    if (url.pathname === "/hubspot-test") {
      if (!env.HUBSPOT_ACCESS_TOKEN) {
        return json(
          {
            status: "not_configured",
            message:
              "HubSpot access is not configured. Add HUBSPOT_ACCESS_TOKEN as a Cloudflare secret.",
          },
          503,
        );
      }

      try {
        const response = await fetch(
          "https://api.hubapi.com/crm/v3/objects/contacts?limit=10&properties=firstname,lastname,email,phone,lifecyclestage,hs_lead_status",
          {
            headers: {
              Authorization: `Bearer ${env.HUBSPOT_ACCESS_TOKEN}`,
              Accept: "application/json",
            },
          },
        );

        const body = await response.json();

        if (!response.ok) {
          return json(
            {
              status: "hubspot_error",
              httpStatus: response.status,
              message: "HubSpot rejected the read-only contact request.",
              details: body,
            },
            response.status,
          );
        }

        const contacts = (body.results || []).map((contact) => ({
          id: contact.id,
          firstname: contact.properties?.firstname || "",
          lastname: contact.properties?.lastname || "",
          email: contact.properties?.email || "",
          phone: contact.properties?.phone || "",
          lifecycleStage: contact.properties?.lifecyclestage || "",
          leadStatus: contact.properties?.hs_lead_status || "",
        }));

        return json({
          status: "connected",
          source: "HubSpot",
          readOnly: true,
          count: contacts.length,
          contacts,
        });
      } catch (error) {
        return json(
          {
            status: "error",
            message: "The Worker could not complete the HubSpot test request.",
            error: error instanceof Error ? error.message : String(error),
          },
          500,
        );
      }
    }

    return json({
      service: "AI & MAIN Revenue Opportunity Agent",
      release: RELEASE,
      endpoints: ["/health", "/hubspot-test"],
      nextStep:
        "Configure HUBSPOT_ACCESS_TOKEN as a Cloudflare secret, then open /hubspot-test.",
    });
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
