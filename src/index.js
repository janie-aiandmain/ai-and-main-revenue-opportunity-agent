import {evaluateRevenueOpportunity, DIAGNOSTIC_POLICY} from './diagnostics/rules-v0.3.js';
import legacyCorpus from "../fixtures/legacy-v1.json" with { type: "json" };
import { reasonAboutRevenueOpportunity } from "./reasoning.js";
import { reasonAboutRevenueFindings } from "./findings.js";

const RELEASE = "2026-11-02-revenue-opportunity-agent-v0.8";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({
        status: "ready",
        service: "AI & MAIN Revenue Opportunity Agent",
        release: RELEASE,
        mode: "read-only deployment practicum",
        hubspotReadSecretConfigured: Boolean(env.HUBSPOT_ACCESS_TOKEN),
        hubspotWriteSecretConfigured: Boolean(env.HUBSPOT_WRITE_TOKEN),
        openAISecretConfigured: Boolean(env.OPENAI_API_KEY),
        crmWritesEnabled: false,
        writebackApprovalTokenConfigured: Boolean(env.WRITEBACK_APPROVAL_TOKEN),
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

    if (url.pathname === "/ai-stress-test") {
      return aiStressTest(env);
    }

    if (url.pathname === "/writeback-preview") {
      return writebackPreview(env);
    }

    if (url.pathname === "/writeback-test") {
      return writebackTestPage();
    }

    if (url.pathname === "/writeback-task") {
      if (request.method !== "POST") {
        return json({ status: "method_not_allowed", message: "POST required." }, 405);
      }
      return json({ status: "writeback_disabled", message: "Production and legacy writeback are disabled during staging certification." }, 403);
    }

    return json({
      service: "AI & MAIN Revenue Opportunity Agent",
      release: RELEASE,
      endpoints: ["/health", "/hubspot-test", "/hubspot-notes-test", "/shadow-evaluate", "/ai-shadow-evaluate", "/ai-stress-test", "/writeback-preview", "/writeback-test", "/writeback-task"],
      nextStep: "Use /writeback-preview to review proposed follow-up tasks. Production and legacy writeback remain disabled during staging certification.",
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
      ...evaluateRevenueOpportunity({serviceHistory:contact.notes.map(note=>({timestamp:note.timestamp,note:stripHtml(note.body)}))}),
    }));

    return json({
      status: "shadow_evaluation_complete",
      source: "HubSpot",
      readOnly: true,
      methodology: DIAGNOSTIC_POLICY,
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

      eligible.push({
        contact,
        combinedNotes,
        serviceHistory: [...contact.notes]
          .sort((a, b) => String(a.timestamp || "").localeCompare(String(b.timestamp || "")))
          .map((note) => ({
            noteId: note.id,
            timestamp: note.timestamp || "",
            note: stripHtml(note.body),
          })),
      });
    }

    const evaluations = [];

    for (const { contact, serviceHistory } of eligible) {
      const aiResult = await reasonAboutRevenueFindings(env, {
        customer: [contact.firstname, contact.lastname].filter(Boolean).join(" "),
        lifecycleStage: contact.lifecycleStage,
        leadStatus: contact.leadStatus,
        serviceHistory,
      }, "hubspot:contact:" + contact.id);

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
      methodology: "AI reasoning with independent findings v0.2",
      note: "The AI evaluates substantive service-note context only. No CRM write is performed.",
      schemaVersion: "findings-v0.2",
      findingCount: evaluations.reduce((n, e) => n + e.findings.length, 0),
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

async function writebackPreview(env) {
  if (!env.HUBSPOT_ACCESS_TOKEN) return missingSecret();
  if (!env.OPENAI_API_KEY) {
    return json({ status: "not_configured", message: "OPENAI_API_KEY is required." }, 503);
  }

  try {
    const context = await getHubSpotContext(env);
    if (context.response) return context.response;

    const candidates = [];

    for (const contact of context.contacts) {
      const combinedNotes = contact.notes.map((note) => stripHtml(note.body)).join(" ").trim();
      const eligibility = evaluateEligibility(contact, combinedNotes);
      if (!eligibility.eligible) continue;

      const serviceHistory = [...contact.notes]
        .sort((a, b) => String(a.timestamp || "").localeCompare(String(b.timestamp || "")))
        .map((note) => ({
          timestamp: note.timestamp || "",
          note: stripHtml(note.body),
        }));

      const evaluation = await reasonAboutRevenueOpportunity(env, {
        customer: [contact.firstname, contact.lastname].filter(Boolean).join(" "),
        lifecycleStage: contact.lifecycleStage,
        leadStatus: contact.leadStatus,
        serviceHistory,
      });

      if (!evaluation.humanReviewRequired || evaluation.opportunityType === "none") continue;

      candidates.push({
        contactId: contact.id,
        customer: [contact.firstname, contact.lastname].filter(Boolean).join(" "),
        email: contact.email,
        classification: evaluation.classification,
        opportunityType: evaluation.opportunityType,
        confidence: evaluation.confidence,
        evidence: evaluation.evidence,
        reasoningSummary: evaluation.reasoningSummary,
        proposedTask: {
          subject: "Revenue follow-up: " + [contact.firstname, contact.lastname].filter(Boolean).join(" "),
          body: buildTaskBody(evaluation),
          priority: evaluation.classification === "strong cross-sell opportunity" ? "HIGH" : "MEDIUM",
          status: "NOT_STARTED",
          type: "TODO",
        },
        writePerformed: false,
      });
    }

    return json({
      status: "writeback_preview_ready",
      source: "HubSpot",
      readOnly: true,
      writebackEnabled: false,
      candidates,
      note: "No CRM write has occurred. Each task requires a separate explicit human approval.",
    });
  } catch (error) {
    return apiError(error);
  }
}

async function createApprovedFollowUpTask(request, env) {
  if (env.CRM_WRITEBACK_ENABLED !== "true") {
    return json(
      {
        status: "writeback_disabled",
        message: "CRM writeback is disabled. Set CRM_WRITEBACK_ENABLED=true only for the bounded test phase.",
      },
      403
    );
  }

  if (!env.WRITEBACK_APPROVAL_TOKEN) {
    return json(
      {
        status: "not_configured",
        message: "WRITEBACK_APPROVAL_TOKEN must be configured as a Cloudflare secret.",
      },
      503
    );
  }

  const suppliedToken = request.headers.get("X-AI-MAIN-APPROVAL");
  if (!suppliedToken || suppliedToken !== env.WRITEBACK_APPROVAL_TOKEN) {
    return json(
      {
        status: "approval_required",
        message: "A valid human approval token is required. No CRM write was performed.",
      },
      403
    );
  }

  if (!env.HUBSPOT_ACCESS_TOKEN) return missingSecret();
  if (!env.HUBSPOT_WRITE_TOKEN) {
    return json(
      {
        status: "not_configured",
        message: "HUBSPOT_WRITE_TOKEN is required for the bounded writeback phase.",
      },
      503
    );
  }
  if (!env.OPENAI_API_KEY) {
    return json({ status: "not_configured", message: "OPENAI_API_KEY is required." }, 503);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ status: "invalid_request", message: "JSON body required." }, 400);
  }

  const contactId = String(payload.contactId || "").trim();
  const approval = String(payload.approval || "").trim();

  if (!contactId || approval !== "APPROVE_FOLLOW_UP_TASK") {
    return json(
      {
        status: "explicit_approval_required",
        message: "Provide contactId and approval='APPROVE_FOLLOW_UP_TASK'. No CRM write was performed.",
      },
      400
    );
  }

  try {
    const context = await getHubSpotContext(env);
    if (context.response) return context.response;

    const contact = context.contacts.find((item) => String(item.id) === contactId);
    if (!contact) {
      return json({ status: "contact_not_found", message: "Contact was not found in the connected HubSpot account." }, 404);
    }

    const combinedNotes = contact.notes.map((note) => stripHtml(note.body)).join(" ").trim();
    const eligibility = evaluateEligibility(contact, combinedNotes);
    if (!eligibility.eligible) {
      return json(
        {
          status: "write_blocked",
          reason: eligibility.reason,
          message: "The contact is no longer eligible for an opportunity evaluation. No CRM write was performed.",
        },
        409
      );
    }

    const serviceHistory = [...contact.notes]
      .sort((a, b) => String(a.timestamp || "").localeCompare(String(b.timestamp || "")))
      .map((note) => ({
        timestamp: note.timestamp || "",
        note: stripHtml(note.body),
      }));

    const evaluation = await reasonAboutRevenueOpportunity(env, {
      customer: [contact.firstname, contact.lastname].filter(Boolean).join(" "),
      lifecycleStage: contact.lifecycleStage,
      leadStatus: contact.leadStatus,
      serviceHistory,
    });

    if (!evaluation.humanReviewRequired || evaluation.opportunityType === "none") {
      return json(
        {
          status: "write_blocked",
          message: "Fresh evaluation does not support an actionable follow-up task. No CRM write was performed.",
          evaluation,
        },
        409
      );
    }

    const customer = [contact.firstname, contact.lastname].filter(Boolean).join(" ");
    const dueAt = normalizeDueDate(payload.dueAt);
    const taskInput = {
      properties: {
        hs_timestamp: dueAt,
        hs_task_subject: "Revenue follow-up: " + customer,
        hs_task_body: buildTaskBody(evaluation),
        hs_task_status: "NOT_STARTED",
        hs_task_priority: evaluation.classification === "strong cross-sell opportunity" ? "HIGH" : "MEDIUM",
        hs_task_type: "TODO",
      },
      associations: [
        {
          to: { id: contact.id },
          types: [
            {
              associationCategory: "HUBSPOT_DEFINED",
              associationTypeId: 204,
            },
          ],
        },
      ],
    };

    const response = await hubspotWriteFetch(
      env,
      "https://api.hubapi.com/crm/objects/2026-09/tasks",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskInput),
      }
    );

    const body = await response.json();

    if (!response.ok) {
      return json(
        {
          status: "hubspot_write_error",
          httpStatus: response.status,
          message: "HubSpot rejected the bounded task write. No other CRM records were changed.",
          details: body,
        },
        response.status
      );
    }

    return json({
      status: "follow_up_task_created",
      crmWritePerformed: true,
      writeType: "task_create_only",
      contactId: contact.id,
      customer,
      taskId: body.id,
      task: body,
      evaluation,
    });
  } catch (error) {
    return apiError(error);
  }
}

function buildTaskBody(evaluation) {
  return [
    "AI & MAIN Revenue Opportunity Agent",
    "",
    "Classification: " + evaluation.classification,
    "Confidence: " + evaluation.confidence,
    "Evidence: " + evaluation.evidence,
    "Reasoning: " + evaluation.reasoningSummary,
    "Recommended next action: " + evaluation.recommendedNextAction,
    "",
    "Created only after explicit human approval. Review customer context before outreach.",
  ].join("\n");
}

function normalizeDueDate(value) {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

function writebackTestPage() {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI & MAIN Revenue Opportunity Agent — Writeback Test</title>
<style>
body{font-family:Arial,sans-serif;margin:0;background:#F6F2E9;color:#102538}
main{max-width:980px;margin:0 auto;padding:32px 20px}
h1{font-family:Georgia,serif;color:#134F43}
.card{background:#fff;border:1px solid #DED8CC;border-radius:16px;padding:18px;margin:14px 0}
button{background:#134F43;color:#fff;border:0;border-radius:9px;padding:10px 14px;font-weight:700;cursor:pointer}
input{width:100%;padding:10px;border:1px solid #DED8CC;border-radius:9px;margin:6px 0 14px}
small{color:#66737C}.status{padding:12px;border-radius:10px;background:#FBF1DD;margin:12px 0;white-space:pre-wrap}
</style>
</head>
<body><main>
<h1>Revenue Opportunity Agent — Human Approval Test</h1>
<p>This lab page previews actionable opportunities. Nothing is written until you enter the test approval token and click an individual approval button.</p>
<label><strong>Writeback approval token</strong></label>
<input id="token" type="password" placeholder="Enter the approval token">
<small>Enter the token here, then click <strong>Create approved follow-up task</strong> on the customer you want to approve. There is no separate submit step.</small>
<div id="tokenState" class="status" style="display:none;background:#E8F0ED"></div>
<div id="status" class="status">Loading preview…</div>
<div id="list"></div>
<script>
const statusBox=document.querySelector("#status"), list=document.querySelector("#list"), tokenInput=document.querySelector("#token"), tokenState=document.querySelector("#tokenState");
tokenInput.addEventListener("input",()=>{
  tokenState.style.display=tokenInput.value.trim()?"block":"none";
  tokenState.textContent=tokenInput.value.trim()
    ?"Approval token entered. Now choose the customer task you want to create."
    :"";
});
async function load(){
  const r=await fetch("/writeback-preview");
  const data=await r.json();
  statusBox.textContent="Preview status: "+data.status+" | Writeback enabled: "+data.writebackEnabled;
  list.innerHTML="";
  for(const c of data.candidates||[]){
    const el=document.createElement("div"); el.className="card";
    el.innerHTML="<h3>"+esc(c.customer)+"</h3><p><strong>"+esc(c.classification)+"</strong> · "+esc(c.confidence)+"</p><p>"+esc(c.reasoningSummary)+"</p><p><small>Evidence: "+esc(c.evidence)+"</small></p><button>Create approved follow-up task</button><pre></pre>";
    el.querySelector("button").onclick=async()=>{
      const token=document.querySelector("#token").value;
      if(!token){alert("Enter the approval token first.");return;}
      if(!confirm("Create one HubSpot follow-up task for "+c.customer+"?")) return;
      const res=await fetch("/writeback-task",{
        method:"POST",
        headers:{"Content-Type":"application/json","X-AI-MAIN-APPROVAL":token},
        body:JSON.stringify({contactId:c.contactId,approval:"APPROVE_FOLLOW_UP_TASK"})
      });
      const out=await res.json();
      el.querySelector("pre").textContent=JSON.stringify(out,null,2);
    };
    list.appendChild(el);
  }
}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
load();
</script>
</main></body></html>`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

async function aiStressTest(env) {
  if (!env.OPENAI_API_KEY) {
    return json(
      {
        status: "not_configured",
        message: "Add OPENAI_API_KEY as a Cloudflare secret before using the AI stress test.",
      },
      503
    );
  }

  const testCases = legacyCorpus.cases;

  const results = [];

  for (const testCase of testCases) {
    try {
      const evaluation = await reasonAboutRevenueOpportunity(env, testCase.context);
      const grade = gradeStressResult(testCase.expected, evaluation);

      results.push({
        id: testCase.id,
        name: testCase.name,
        passed: grade.passed,
        expected: testCase.expected,
        actual: {
          classification: evaluation.classification,
          opportunityType: evaluation.opportunityType,
          humanReviewRequired: evaluation.humanReviewRequired,
          confidence: evaluation.confidence
        },
        reasoningSummary: evaluation.reasoningSummary,
        recommendedNextAction: evaluation.recommendedNextAction,
        mismatches: grade.mismatches
      });
    } catch (error) {
      results.push({
        id: testCase.id,
        name: testCase.name,
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;

  return json({
    status: "ai_stress_test_complete",
    model: env.OPENAI_MODEL || "gpt-5.6-terra",
    methodology: "adversarial synthetic service-note suite v0.1",
    crmReadPerformed: false,
    crmWritePerformed: false,
    testCount: results.length,
    passed,
    failed,
    passRate: Math.round((passed / results.length) * 100),
    release: RELEASE,
    results
  });
}

function gradeStressResult(expected, actual) {
  const mismatches = [];

  if (!expected.classifications.includes(actual.classification)) {
    mismatches.push("classification");
  }

  if (!expected.opportunityTypes.includes(actual.opportunityType)) {
    mismatches.push("opportunityType");
  }

  if (expected.humanReviewRequired !== actual.humanReviewRequired) {
    mismatches.push("humanReviewRequired");
  }

  return {
    passed: mismatches.length === 0,
    mismatches
  };
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

async function hubspotWriteFetch(env, url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      Authorization: "Bearer " + env.HUBSPOT_WRITE_TOKEN,
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
      message: "The agent could not complete the requested operation.",
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

// Current diagnostic; frozen v0.2 remains available for historical comparison.
export { evaluateRevenueOpportunity };
