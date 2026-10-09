const RELEASE = "2026-10-09-revenue-opportunity-agent-v0.5";

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
        openAISecretConfigured: Boolean(env.OPENAI_API_KEY),
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

    if (url.pathname === "/ai-shadow-evaluate") {
      return aiShadowEvaluate(env);
    }

    return json({
      service: "AI & MAIN Revenue Opportunity Agent",
      release: RELEASE,
      endpoints: ["/health", "/hubspot-test", "/hubspot-notes-test", "/shadow-evaluate", "/ai-shadow-evaluate"],
      nextStep: "Use /shadow-evaluate for deterministic rules or /ai-shadow-evaluate for AI reasoning. Both remain read-only.",
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

    const eligible = [];
    const ignored = [];

    for (const contact of context.contacts) {
      const combinedNotes = contact.notes.map((note) => stripHtml(note.body)).join(" ").trim();
      const eligibility = evaluateEligibility(contact, combinedNotes);

      if (!eligibility.eligible) {
        ignored.push({
          contactId: contact.id,
          customer: [contact.firstname, contact.lastname].filter(Boolean).join(" "),
          email: contact.email,
          reason: eligibility.reason,
        });
        continue;
      }

      eligible.push({
        contact,
        combinedNotes,
      });
    }

    const evaluations = eligible.map(({ contact, combinedNotes }) => ({
      contactId: contact.id,
      customer: [contact.firstname, contact.lastname].filter(Boolean).join(" "),
      email: contact.email,
      mode: "shadow",
      crmWritePerformed: false,
      ...evaluateRevenueOpportunity(combinedNotes),
    }));

    return json({
      status: "shadow_evaluation_complete",
      source: "HubSpot",
      readOnly: true,
      methodology: "deterministic diagnostic rules v0.2",
      note: "Only contacts with substantive service-note context are evaluated. No CRM write is performed.",
      recordsScanned: context.contacts.length,
      recordsEvaluated: evaluations.length,
      recordsIgnored: ignored.length,
      evaluations,
      ignored,
    });
  } catch (error) {
    return apiError(error);
  }
}

async function aiShadowEvaluate(env) {
  if (!env.HUBSPOT_ACCESS_TOKEN) return missingSecret();
  if (!env.OPENAI_API_KEY) {
    return json(
      {
        status: "not_configured",
        message: "Add OPENAI_API_KEY as a Cloudflare secret before using AI shadow evaluation.",
      },
      503
    );
  }

  try {
    const context = await getHubSpotContext(env);
    if (context.response) return context.response;

    const eligible = [];
    const ignored = [];

    for (const contact of context.contacts) {
      const combinedNotes = contact.notes.map((note) => stripHtml(note.body)).join(" ").trim();
      const eligibility = evaluateEligibility(contact, combinedNotes);

      if (!eligibility.eligible) {
        ignored.push({
          contactId: contact.id,
          customer: [contact.firstname, contact.lastname].filter(Boolean).join(" "),
          email: contact.email,
          reason: eligibility.reason,
        });
        continue;
      }

      eligible.push({ contact, combinedNotes });
    }

    const evaluations = [];

    for (const { contact, combinedNotes } of eligible) {
      const aiResult = await reasonAboutRevenueOpportunity(env, {
        customer: [contact.firstname, contact.lastname].filter(Boolean).join(" "),
        lifecycleStage: contact.lifecycleStage,
        leadStatus: contact.leadStatus,
        serviceNotes: combinedNotes,
      });

      evaluations.push({
        contactId: contact.id,
        customer: [contact.firstname, contact.lastname].filter(Boolean).join(" "),
        email: contact.email,
        mode: "ai-shadow",
        crmWritePerformed: false,
        ...aiResult,
      });
    }

    return json({
      status: "ai_shadow_evaluation_complete",
      source: "HubSpot",
      readOnly: true,
      model: env.OPENAI_MODEL || "gpt-5.6-terra",
      methodology: "AI reasoning with structured output v0.1",
      note: "The AI evaluates substantive service-note context only. No CRM write is performed.",
      recordsScanned: context.contacts.length,
      recordsEvaluated: evaluations.length,
      recordsIgnored: ignored.length,
      evaluations,
      ignored,
    });
  } catch (error) {
    return apiError(error);
  }
}

async function reasonAboutRevenueOpportunity(env, customerContext) {
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      classification: {
        type: "string",
        enum: [
          "strong cross-sell opportunity",
          "follow-up revenue opportunity",
          "scope-change opportunity",
          "retention or service-recovery opportunity",
          "no clear opportunity",
          "no opportunity"
        ]
      },
      confidence: {
        type: "string",
        enum: ["low", "medium", "medium-high", "high"]
      },
      opportunityType: {
        type: "string",
        enum: ["cross-sell", "upsell", "scope change", "follow-up", "retention", "none"]
      },
      evidence: { type: "string" },
      reasoningSummary: { type: "string" },
      recommendedNextAction: { type: "string" },
      humanReviewRequired: { type: "boolean" }
    },
    required: [
      "classification",
      "confidence",
      "opportunityType",
      "evidence",
      "reasoningSummary",
      "recommendedNextAction",
      "humanReviewRequired"
    ]
  };

  const instructions = [
    "You are the reasoning layer for AI & MAIN's Revenue Opportunity Agent.",
    "Evaluate CRM service-note context for legitimate revenue or retention opportunities.",
    "Do not invent customer intent, pricing, products, services, timing, or facts not present in the supplied context.",
    "Treat direct customer interest, requested pricing, requested additional work, deferred work, and scope-change requests as meaningful signals.",
    "Distinguish a strong immediate opportunity from a softer follow-up opportunity.",
    "If the note only reports a resolved issue or satisfaction with no additional need, classify it as no opportunity.",
    "Use the evidence field to quote or closely paraphrase only the supplied service-note evidence.",
    "Keep the reasoning summary concise and business-focused.",
    "Any actionable revenue, retention, or scope-change recommendation requires human review in this shadow phase.",
    "Return only the structured result."
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + env.OPENAI_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-5.6-terra",
      reasoning: { effort: "low" },
      instructions,
      input: JSON.stringify(customerContext),
      text: {
        format: {
          type: "json_schema",
          name: "revenue_opportunity_evaluation",
          strict: true,
          schema,
        },
      },
    }),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error("OpenAI evaluation request failed: " + JSON.stringify(body));
  }

  const outputText = extractResponseText(body);
  if (!outputText) {
    throw new Error("OpenAI returned no structured text output.");
  }

  return JSON.parse(outputText);
}

function extractResponseText(responseBody) {
  for (const item of responseBody.output || []) {
    if (item.type !== "message") continue;
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  return "";
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

function evaluateEligibility(contact, noteText) {
  if (!contact.notes || contact.notes.length === 0) {
    return { eligible: false, reason: "No associated service notes." };
  }

  const clean = (noteText || "").replace(/\s+/g, " ").trim();

  if (!clean) {
    return { eligible: false, reason: "Associated note contains no substantive text." };
  }

  if (clean.length < 20) {
    return { eligible: false, reason: "Note text is too limited to support a reliable revenue evaluation." };
  }

  return { eligible: true, reason: "Substantive service-note context available." };
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
