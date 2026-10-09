const RELEASE = "2026-10-09-revenue-opportunity-agent-v0.3";

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
      return testContacts(env);
    }

    if (url.pathname === "/hubspot-notes-test") {
      return testNotes(env);
    }

    if (url.pathname === "/shadow-evaluate") {
      return shadowEvaluate(env);
    }

    return json({
      service: "AI & MAIN Revenue Opportunity Agent",
      release: RELEASE,
      endpoints: ["/health", "/hubspot-test", "/hubspot-notes-test", "/shadow-evaluate"],
      nextStep: "Use /shadow-evaluate to review revenue opportunities without writing anything back to HubSpot.",
    });
  },
};

async function testContacts(env) {
  if (!env.HUBSPOT_ACCESS_TOKEN) return missingSecret();

  try {
    const response = await hubspotFetch(
      env,
      "https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=firstname,lastname,email,phone,lifecyclestage,hs_lead_status"
    );
    const body = await response.json();

    if (!response.ok) {
      return json({ status: "hubspot_error", httpStatus: response.status, details: body }, response.status);
    }

    return json({
      status: "connected",
      source: "HubSpot",
      readOnly: true,
      count: (body.results || []).length,
      contacts: (body.results || []).map(mapContact),
    });
  } catch (error) {
    return apiError(error);
  }
}

async function testNotes(env) {
  if (!env.HUBSPOT_ACCESS_TOKEN) return missingSecret();

  try {
    const context = await getHubSpotContext(env);
    if (context.response) return context.response;

    return json({
      status: "connected_with_notes",
      contactCount: context.contacts.length,
      noteCount: context.noteCount,
      contacts: context.contacts,
    });
  } catch (error) {
    return apiError(error);
  }
}

async function shadowEvaluate(env) {
  if (!env.HUBSPOT_ACCESS_TOKEN) return missingSecret();

  try {
    const context = await getHubSpotContext(env);
    if (context.response) return context.response;

    const evaluations = context.contacts.map((contact) => {
      const combinedNotes = contact.notes.map((note) => stripHtml(note.body)).join(" ");
      return {
        contactId: contact.id,
        customer: [contact.firstname, contact.lastname].filter(Boolean).join(" "),
        email: contact.email,
        mode: "shadow",
        crmWritePerformed: false,
        ...evaluateRevenueOpportunity(combinedNotes),
      };
    });

    return json({
      status: "shadow_evaluation_complete",
      source: "HubSpot",
      readOnly: true,
      methodology: "deterministic diagnostic rules v0.1",
      note: "This validates the deployment pipeline before an LLM reasoning layer is introduced.",
      evaluationCount: evaluations.length,
      evaluations,
    });
  } catch (error) {
    return apiError(error);
  }
}

async function getHubSpotContext(env) {
  const contactsResponse = await hubspotFetch(
    env,
    "https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=firstname,lastname,email,phone,lifecyclestage,hs_lead_status&associations=notes"
  );
  const contactsBody = await contactsResponse.json();

  if (!contactsResponse.ok) {
    return {
      response: json(
        { status: "contacts_error", httpStatus: contactsResponse.status, details: contactsBody },
        contactsResponse.status
      ),
    };
  }

  const contacts = (contactsBody.results || []).map((contact) => ({
    ...mapContact(contact),
    noteIds: (contact.associations?.notes?.results || []).map((x) => x.id),
  }));

  const noteIds = [...new Set(contacts.flatMap((contact) => contact.noteIds))];

  if (!noteIds.length) {
    return {
      contacts: contacts.map((contact) => ({ ...contact, notes: [] })),
      noteCount: 0,
    };
  }

  const notesResponse = await hubspotFetch(
    env,
    "https://api.hubapi.com/crm/v3/objects/notes/batch/read",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        properties: ["hs_note_body", "hs_timestamp"],
        inputs: noteIds.map((id) => ({ id })),
      }),
    }
  );
  const notesBody = await notesResponse.json();

  if (!notesResponse.ok) {
    return {
      response: json(
        {
          status: "notes_access_error",
          httpStatus: notesResponse.status,
          message: "HubSpot returned note associations but rejected the note-record read.",
          details: notesBody,
        },
        notesResponse.status
      ),
    };
  }

  const notesById = Object.fromEntries(
    (notesBody.results || []).map((note) => [
      note.id,
      {
        id: note.id,
        body: note.properties?.hs_note_body || "",
        timestamp: note.properties?.hs_timestamp || "",
      },
    ])
  );

  return {
    noteCount: noteIds.length,
    contacts: contacts.map((contact) => ({
      ...contact,
      notes: contact.noteIds.map((id) => notesById[id]).filter(Boolean),
    })),
  };
}

function evaluateRevenueOpportunity(noteText) {
  const text = (noteText || "").toLowerCase().trim();

  if (!text) {
    return {
      classification: "no opportunity",
      confidence: "low",
      evidence: "No service-note content was available for evaluation.",
      recommendedNextAction: "No action. Wait for new customer activity.",
      humanReviewRequired: false,
    };
  }

  const explicitNoNeed = /(no additional work|nothing else|issue resolved|everything is working well|no further work)/i.test(text);
  const deferredIntent = /(still wants|wanted to finish|finish the current project first|later|after this project|follow up)/i.test(text);
  const strongIntent = /(asked whether|asked if|wants pricing|wants a quote|request.*pricing|interested in|wants.*installed|also install|additional service)/i.test(text);

  if (explicitNoNeed && !strongIntent && !deferredIntent) {
    return {
      classification: "no opportunity",
      confidence: "high",
      evidence: excerpt(noteText),
      recommendedNextAction: "No revenue follow-up. Keep the customer in normal relationship cadence.",
      humanReviewRequired: false,
    };
  }

  if (strongIntent) {
    return {
      classification: "strong cross-sell opportunity",
      confidence: "high",
      evidence: excerpt(noteText),
      recommendedNextAction: "Prepare a relevant follow-up and pricing conversation for human approval.",
      humanReviewRequired: true,
    };
  }

  if (deferredIntent) {
    return {
      classification: "follow-up revenue opportunity",
      confidence: "medium-high",
      evidence: excerpt(noteText),
      recommendedNextAction: "Schedule a timely follow-up based on the customer's stated timing.",
      humanReviewRequired: true,
    };
  }

  return {
    classification: "no clear opportunity",
    confidence: "medium",
    evidence: excerpt(noteText),
    recommendedNextAction: "No automated action. Surface only if a human reviewer sees additional context.",
    humanReviewRequired: false,
  };
}

function mapContact(contact) {
  return {
    id: contact.id,
    firstname: contact.properties?.firstname || "",
    lastname: contact.properties?.lastname || "",
    email: contact.properties?.email || "",
    phone: contact.properties?.phone || "",
    lifecycleStage: contact.properties?.lifecyclestage || "",
    leadStatus: contact.properties?.hs_lead_status || "",
  };
}

function excerpt(text, max = 220) {
  const clean = stripHtml(text).replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&");
}

async function hubspotFetch(env, url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      Authorization: "Bearer " + env.HUBSPOT_ACCESS_TOKEN,
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });
}

function missingSecret() {
  return json(
    { status: "not_configured", message: "Add HUBSPOT_ACCESS_TOKEN as a Cloudflare secret." },
    503
  );
}

function apiError(error) {
  return json(
    {
      status: "error",
      message: "The Worker could not complete the HubSpot request.",
      error: error instanceof Error ? error.message : String(error),
    },
    500
  );
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
