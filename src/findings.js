import requestContract from './findings-request-v0.2.json' with { type: 'json' };

export const FINDINGS_SCHEMA_VERSION = 'findings-v0.2';
export const FINDINGS_PROMPT_VERSION = 'reasoning-v0.2';
export const ACTION_SCHEMA_VERSION = 'follow-up-task-proposal-v1';

export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
export async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)));
  return Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, '0')).join('');
}
export async function prepareHistory(context) {
  if (!Array.isArray(context.serviceHistory)) throw Error('Service history required');
  const byId = new Map();
  for (const note of context.serviceHistory) {
    if (typeof note.note !== 'string' || typeof note.timestamp !== 'string') throw Error('Invalid source note');
    const noteId = note.noteId || note.id || 'note_' + await digest({ timestamp: note.timestamp, note: note.note });
    if (typeof noteId !== 'string' || !noteId) throw Error('Invalid source reference');
    const entry = { noteId, timestamp: note.timestamp, note: note.note };
    if (byId.has(noteId) && canonical(byId.get(noteId)) !== canonical(entry)) throw Error('Conflicting source reference');
    byId.set(noteId, entry);
  }
  return [...byId.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.noteId.localeCompare(b.noteId));
}
const exactKeys = (o, keys) => o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).length === keys.length && keys.every(k => k in o);
const itemSchema = requestContract.text.format.schema.properties.findings.items;

// Only prepares reasoning/approval units. It never executes a CRM mutation.
export async function materializeFindings(raw, history, contextKey) {
  if (typeof contextKey !== 'string' || !contextKey.trim()) throw Error('Stable context key required');
  if (!exactKeys(raw, ['findings']) || !Array.isArray(raw.findings)) throw Error('Invalid findings envelope');
  const keys = new Set(), spans = [], result = [];
  for (const f of raw.findings) {
    if (!exactKeys(f, itemSchema.required)) throw Error('Invalid finding fields');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.opportunityKey) || keys.has(f.opportunityKey)) throw Error('Duplicate or invalid opportunity key');
    keys.add(f.opportunityKey);
    for (const name of ['classification', 'opportunityType', 'confidence']) if (!itemSchema.properties[name].enum.includes(f[name])) throw Error('Invalid finding decision');
    if (f.humanReviewRequired !== true) throw Error('Actionable finding requires human review');
    for (const name of ['reasoningSummary', 'recommendedNextAction']) if (typeof f[name] !== 'string' || !f[name].trim()) throw Error('Missing finding narrative');
    if (!Array.isArray(f.evidence) || !f.evidence.length) throw Error('Missing finding evidence');
    const evidence = [], localQuotes = new Set();
    for (const e of f.evidence) {
      if (!exactKeys(e, ['noteId', 'quote']) || typeof e.quote !== 'string' || !e.quote.trim()) throw Error('Invalid evidence');
      const source = history.find(n => n.noteId === e.noteId);
      const start = source ? source.note.indexOf(e.quote) : -1;
      if (start < 0) throw Error('Evidence is not a source quote');
      const end = start + e.quote.length;
      if (spans.some(s => s.key !== f.opportunityKey && s.noteId === e.noteId && start < s.end && end > s.start)) throw Error('Independent findings share overlapping evidence');
      spans.push({ key: f.opportunityKey, noteId: e.noteId, start, end });
      const identity = canonical(e);
      if (!localQuotes.has(identity)) { evidence.push({ noteId: e.noteId, quote: e.quote }); localQuotes.add(identity); }
    }
    evidence.sort((a, b) => canonical(a).localeCompare(canonical(b)));
    const findingId = 'finding_' + await digest({ contextKey, opportunityKey: f.opportunityKey });
    const authorityRequirements = { policyVersion: 'human-approved-task-only-v1', humanApprovalRequired: true, allowedMutation: 'hubspot.follow_up_task.create' };
    const actionPayload = {
      type: 'hubspot.follow_up_task.create', target: { contextKey },
      properties: {
        hs_task_subject: 'Follow-up: ' + f.opportunityKey.replaceAll('-', ' '),
        hs_task_body: ['AI & MAIN finding: ' + findingId, 'Classification: ' + f.classification, 'Evidence: ' + evidence.map(e => e.quote).join('\n'), 'Recommended action: ' + f.recommendedNextAction].join('\n'),
        hs_task_priority: ['strong cross-sell opportunity', 'retention or service-recovery opportunity'].includes(f.classification) ? 'HIGH' : 'MEDIUM',
        hs_task_status: 'NOT_STARTED', hs_task_type: 'TODO',
      },
    };
    const finding = { findingId, opportunityKey: f.opportunityKey, classification: f.classification, opportunityType: f.opportunityType, confidence: f.confidence, evidence, reasoningSummary: f.reasoningSummary, recommendedNextAction: f.recommendedNextAction, humanReviewRequired: true };
    const actionVersion = 'sha256_' + await digest({ schemaVersion: FINDINGS_SCHEMA_VERSION, actionSchemaVersion: ACTION_SCHEMA_VERSION, finding, authorityRequirements, actionPayload });
    result.push({ ...finding, proposedAction: { schemaVersion: ACTION_SCHEMA_VERSION, actionPayload, authorityRequirements, actionVersion } });
  }
  return { schemaVersion: FINDINGS_SCHEMA_VERSION, promptVersion: FINDINGS_PROMPT_VERSION, findings: result.sort((a, b) => a.findingId.localeCompare(b.findingId)) };
}

export async function reasonAboutRevenueFindings(env, context, contextKey) {
  if (typeof contextKey !== 'string' || !contextKey.trim()) throw Error('Stable context key required');
  const history = await prepareHistory(context);
  const input = { customer: context.customer, serviceHistory: history };
  for (const name of ['lifecycleStage', 'leadStatus', 'knownOpportunityKeys']) if (context[name] !== undefined) input[name] = context[name];
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { Authorization: 'Bearer ' + env.OPENAI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...requestContract, model: env.OPENAI_MODEL || requestContract.model, input: JSON.stringify(input) }),
  });
  if (!response.ok) throw Error('Findings model request failed: HTTP ' + response.status);
  const body = await response.json();
  const text = (body.output || []).filter(x => x.type === 'message').flatMap(x => x.content || []).find(x => x.type === 'output_text')?.text;
  if (!text) throw Error('Missing findings output');
  return materializeFindings(JSON.parse(text), history, contextKey);
}
