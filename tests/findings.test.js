import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { prepareHistory, materializeFindings, reasonAboutRevenueFindings } from '../src/findings.js';
import { loadFindingsCorpus, gradeFindings, summarizeFindings } from '../scripts/regression/findings-core.js';
import worker from '../src/index.js';
const corpus = await loadFindingsCorpus();
const c = corpus.cases.find(c => c.id === 'EN11');
const history = await prepareHistory(c.context);
function finding(key, quote, type = 'cross-sell', classification = 'strong cross-sell opportunity') {
  return { opportunityKey: key, classification, opportunityType: type, confidence: 'high', evidence: [{ noteId: history[0].noteId, quote }], reasoningSummary: 'Supported synthetic need.', recommendedNextAction: 'Prepare a human-reviewed follow-up for ' + key + '.', humanReviewRequired: true };
}
const surge = () => finding('surge-protection', 'Customer requests pricing for surge protection.');
const lighting = () => finding('pendant-lighting', 'customer still wants pendant lighting after the renovation and asks us to follow up then.', 'follow-up', 'follow-up revenue opportunity');
const build = (findings, key = 'synthetic:EN11') => materializeFindings({ findings }, history, key);

test('zero, one and two independent findings for the same customer', async () => {
  assert.equal((await build([])).findings.length, 0);
  assert.equal((await build([surge()])).findings.length, 1);
  const two = await build([surge(), lighting()]);
  assert.equal(two.findings.length, 2);
  assert.equal(new Set(two.findings.map(f => f.findingId)).size, 2);
  for (const f of two.findings) {
    assert.equal(f.proposedAction.actionPayload.type, 'hubspot.follow_up_task.create');
    assert.equal(f.proposedAction.authorityRequirements.humanApprovalRequired, true);
    assert.match(f.proposedAction.actionVersion, /^sha256_[a-f0-9]{64}$/);
  }
});
test('finding IDs and action versions ignore output order and persist across identical evaluations', async () => {
  assert.deepEqual(await build([surge(), lighting()]), await build([lighting(), surge()]));
  const one = (await build([surge()])).findings[0];
  assert.equal(one.findingId, (await build([surge(), lighting()])).findings.find(f => f.opportunityKey === 'surge-protection').findingId);
  assert.notEqual(one.findingId, (await build([surge()], 'other-client:EN11')).findings[0].findingId);
});
test('material changes keep finding ID but change the exact action version', async () => {
  const original = (await build([surge()])).findings[0];
  for (const change of [
    { recommendedNextAction: 'Prepare a reviewed pricing follow-up after clarification.' },
    { classification: 'follow-up revenue opportunity', opportunityType: 'follow-up' },
    { evidence: [{ noteId: history[0].noteId, quote: 'pricing for surge protection' }] },
    { confidence: 'medium' },
  ]) {
    const changed = (await build([{ ...surge(), ...change }])).findings[0];
    assert.equal(changed.findingId, original.findingId);
    assert.notEqual(changed.proposedAction.actionVersion, original.proposedAction.actionVersion);
  }
});
test('each finding contains only its evidence and independent payload', async () => {
  const result = await build([surge(), lighting()]);
  const a = result.findings.find(f => f.opportunityKey === 'surge-protection');
  const b = result.findings.find(f => f.opportunityKey === 'pendant-lighting');
  assert.doesNotMatch(a.proposedAction.actionPayload.properties.hs_task_body, /pendant|renovation/i);
  assert.doesNotMatch(b.proposedAction.actionPayload.properties.hs_task_body, /surge/i);
  assert.equal(a.opportunityType, 'cross-sell'); assert.equal(b.opportunityType, 'follow-up');
});
test('duplicate keys, invented/crossed/overlapping evidence and missing approval state fail closed', async () => {
  await assert.rejects(build([surge(), surge()]), /Duplicate/);
  await assert.rejects(build([surge(), { ...lighting(), opportunityKey: 'surge-protection' }]), /Duplicate/);
  await assert.rejects(build([{ ...surge(), evidence: [{ noteId: history[0].noteId, quote: 'Invented customer need' }] }]), /source quote/);
  await assert.rejects(build([{ ...surge(), evidence: [{ noteId: 'missing', quote: surge().evidence[0].quote }] }]), /source quote/);
  await assert.rejects(build([surge(), { ...lighting(), evidence: surge().evidence }]), /overlapping/);
  await assert.rejects(build([{ ...surge(), humanReviewRequired: false }]), /human review/);
});
test('same-type findings stay distinct and duplicate notes do not duplicate references', async () => {
  const extra = finding('pendant-lighting', lighting().evidence[0].quote);
  const result = await build([surge(), extra]);
  assert.equal(result.findings.length, 2); assert.equal(new Set(result.findings.map(f => f.findingId)).size, 2);
  const prepared = await prepareHistory({ serviceHistory: [c.context.serviceHistory[0], c.context.serviceHistory[0]] });
  assert.equal(prepared.length, 1);
  await assert.rejects(prepareHistory({ serviceHistory: [{ noteId: 'x', timestamp: '', note: 'first' }, { noteId: 'x', timestamp: '', note: 'changed' }] }), /Conflicting/);
});
test('EN11 requires two independently matched findings with isolated evidence', async () => {
  const good = await gradeFindings(c, await build([surge(), lighting()]));
  assert.equal(good.decisionPassed, true);
  const missing = await gradeFindings(c, await build([surge()]));
  assert.equal(missing.dimensions.findingCoverage.status, 'fail');
  const swapped = await build([{ ...surge(), evidence: lighting().evidence }, { ...lighting(), evidence: surge().evidence }]);
  assert.equal((await gradeFindings(c, swapped)).decisionPassed, false);
});
test('EN12 needs separate retention and charger findings', async () => {
  const testCase = corpus.cases.find(c => c.id === 'EN12'), h = await prepareHistory(testCase.context);
  const raw = { findings: [
    { ...finding('fixture-service-recovery', 'Customer reports a flickering fixture and requests service recovery.', 'retention', 'retention or service-recovery opportunity'), evidence: [{ noteId: h[0].noteId, quote: 'Customer reports a flickering fixture and requests service recovery.' }] },
    { ...finding('ev-charger', 'asks for pricing for an EV charger'), evidence: [{ noteId: h[0].noteId, quote: 'asks for pricing for an EV charger' }] },
  ] };
  const actual = await materializeFindings(raw, h, 'synthetic:EN12');
  assert.equal((await gradeFindings(testCase, actual)).decisionPassed, true);
});
test('grader detects action tampering and does not certify semantic safety', async () => {
  const actual = await build([surge(), lighting()]);
  actual.findings[0].proposedAction.actionPayload.properties.hs_task_priority = 'LOW';
  assert.equal((await gradeFindings(c, actual)).valid, false);
  const clean = await build([surge(), lighting()]), g = await gradeFindings(c, clean);
  const summary = summarizeFindings(corpus, [{ id: c.id, run: 1, actual: clean, grade: g }]);
  assert.equal(summary.fullSemanticSafetyPass, null); assert.equal(summary.consistency, null);
  assert.equal(g.dimensions.hallucination.status, 'review_required');
});
test('v2 request preserves original instructions, model and effort plus the explicit shape amendment', async () => {
  const prior = JSON.parse(await readFile(new URL('../fixtures/production-request-v0.1.json', import.meta.url)));
  const expected = JSON.parse(await readFile(new URL('../fixtures/production-request-v0.2.json', import.meta.url)));
  assert.equal(expected.instructions.startsWith(prior.instructions + '\n'), true);
  assert.equal(expected.model, prior.model); assert.deepEqual(expected.reasoning, prior.reasoning);
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, opts) => {
      assert.equal(url, 'https://api.openai.com/v1/responses');
      const { input, ...settings } = JSON.parse(opts.body);
      assert.deepEqual(settings, expected);
      assert.equal(JSON.parse(input).serviceHistory[0].noteId, history[0].noteId);
      return Response.json({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ findings: [surge(), lighting()] }) }] }] });
    };
    assert.equal((await reasonAboutRevenueFindings({ OPENAI_API_KEY: 'synthetic' }, c.context, 'synthetic:EN11')).findings.length, 2);
  } finally { globalThis.fetch = original; }
});
test('Worker read-only AI shadow route exposes both findings without any CRM write call (mocked sources)', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, opts) => {
      if (url.includes('/contacts?')) return Response.json({ results: [{ id: 'c1', properties: { firstname: 'Synthetic' }, associations: { notes: { results: [{ id: 'n1' }] } } }] });
      if (url.includes('/notes/batch/read')) return Response.json({ results: [{ id: 'n1', properties: { hs_note_body: c.context.serviceHistory[0].note, hs_timestamp: c.context.serviceHistory[0].timestamp } }] });
      assert.equal(url, 'https://api.openai.com/v1/responses');
      const noteId = JSON.parse(JSON.parse(opts.body).input).serviceHistory[0].noteId;
      const raw = [surge(), lighting()].map(f => ({ ...f, evidence: f.evidence.map(e => ({ ...e, noteId })) }));
      return Response.json({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ findings: raw }) }] }] });
    };
    const response = await worker.fetch(new Request('https://synthetic.invalid/ai-shadow-evaluate'), { HUBSPOT_ACCESS_TOKEN: 'synthetic', OPENAI_API_KEY: 'synthetic' });
    const body = await response.json();
    assert.equal(body.findingCount, 2); assert.equal(body.evaluations[0].crmWritePerformed, false);
    assert.equal(body.schemaVersion, 'findings-v0.2');
  } finally { globalThis.fetch = original; }
});

test('v2 live runner is opt-in and a missing evaluation key never triggers a request', async () => {
  const { spawnSync } = await import('node:child_process');
  const { mkdtemp, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { fileURLToPath } = await import('node:url');
  const dir = await mkdtemp(tmpdir() + '/ai-main-findings-cli-');
  try {
    const script = fileURLToPath(new URL('../scripts/regression/model-findings.js', import.meta.url));
    const options = { cwd: dir, encoding: 'utf8', env: { ...process.env, EVAL_OPENAI_API_KEY: '' } };
    assert.equal(spawnSync(process.execPath, [script], options).status, 2);
    assert.equal(spawnSync(process.execPath, [script, '--live', '--non-production'], options).status, 2);
    const report = JSON.parse(await readFile(dir + '/reports/model-findings-v0.2.json', 'utf8'));
    assert.equal(report.attempted, 0);
    assert.equal(report.promptVersion, 'reasoning-v0.2');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
