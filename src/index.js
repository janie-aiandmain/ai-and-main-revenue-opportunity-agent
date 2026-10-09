const RELEASE = "2026-10-09-revenue-opportunity-agent-v0.2";

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

    if (url.pathname === "/hubspot-notes-test") {
      return testNotes(request, env);
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
      endpoints: ["/health", "/hubspot-test", "/hubspot-notes-test"],
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


async function testNotes(request, env) {
  if (!env.HUBSPOT_ACCESS_TOKEN) {
    return json({ status: "not_configured", message: "Add HUBSPOT_ACCESS_TOKEN as a Cloudflare secret." }, 503);
  }

  try {
    const contactsResponse = await fetch(
      "https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=firstname,lastname,email&associations=notes",
      { headers: { Authorization: "Bearer " + env.HUBSPOT_ACCESS_TOKEN, Accept: "application/json" } }
    );

    const contactsBody = await contactsResponse.json();

    if (!contactsResponse.ok) {
      return json({ status: "contacts_error", httpStatus: contactsResponse.status, details: contactsBody }, contactsResponse.status);
    }

    const contacts = (contactsBody.results || []).map((contact) => ({
      id: contact.id,
      firstname: contact.properties?.firstname || "",
      lastname: contact.properties?.lastname || "",
      email: contact.properties?.email || "",
      noteIds: (contact.associations?.notes?.results || []).map((x) => x.id),
    }));

    const noteIds = [...new Set(contacts.flatMap((x) => x.noteIds))];

    if (!noteIds.length) {
      return json({
        status: "connected_no_notes_found",
        message: "Contacts were retrieved, but no associated notes were returned.",
        contacts,
      });
    }

    const notesResponse = await fetch(
      "https://api.hubapi.com/crm/v3/objects/notes/batch/read",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + env.HUBSPOT_ACCESS_TOKEN,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: ["hs_note_body", "hs_timestamp"],
          inputs: noteIds.map((id) => ({ id })),
        }),
      }
    );

    const notesBody = await notesResponse.json();

    if (!notesResponse.ok) {
      return json({
        status: "notes_access_error",
        httpStatus: notesResponse.status,
        message: "Note associations were found, but HubSpot rejected the note read.",
        details: notesBody,
      }, notesResponse.status);
    }

    const notes = Object.fromEntries((notesBody.results || []).map((note) => [note.id, {
      id: note.id,
      body: note.properties?.hs_note_body || "",
      timestamp: note.properties?.hs_timestamp || "",
    }]));

    return json({
      status: "connected_with_notes",
      contactCount: contacts.length,
      noteCount: noteIds.length,
      contacts: contacts.map((contact) => ({
        ...contact,
        notes: contact.noteIds.map((id) => notes[id]).filter(Boolean),
      })),
    });
  } catch (error) {
    return json({ status: "error", error: error instanceof Error ? error.message : String(error) }, 500);
  }
}
