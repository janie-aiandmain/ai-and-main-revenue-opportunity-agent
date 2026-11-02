import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { reasonAboutRevenueFindings } from '../../src/findings.js';
import { loadFindingsCorpus, gradeFindings, hash } from './findings-core.js';

export function verifySeed(seed, corpus, snapshot) {
  if (seed.promptVersion !== 'reasoning-v0.2' || seed.schemaVersion !== 'findings-v0.2' || seed.model !== 'gpt-5.6-terra' || seed.reasoning?.effort !== 'low' || seed.corpusHash !== hash(corpus) || seed.requestHash !== hash(snapshot) || seed.rows.length !== corpus.cases.length) throw Error('Seed contract mismatch');
  const ids = new Set();
  for (const r of seed.rows) {
    if (r.run !== 1 || ids.has(r.id) || !corpus.cases.some(c => c.id === r.id) || r.error || r.returnedModel !== 'gpt-5.6-terra' || !r.grade?.valid || r.outputHash !== hash(r.actual)) throw Error('Invalid seed execution');
    ids.add(r.id);
  }
}
export function nextExecutions(corpus, rows) {
  const keys = new Set();
  for (const r of rows) {
    const k = r.id + ':' + r.run;
    if (!corpus.cases.some(c => c.id === r.id) || !Number.isInteger(r.run) || r.run < 1 || r.run > 5 || keys.has(k)) throw Error('Invalid repeated-run checkpoint');
    keys.add(k);
  }
  return [2,3,4,5].flatMap(run => corpus.cases.filter(c => !keys.has(c.id + ':' + run)).map(c => ({ c, run })));
}
async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || !args.includes('--live') || !args.includes('--non-production')) throw Error('Explicit --live --non-production required');
  const corpus = await loadFindingsCorpus();
  const snapshot = JSON.parse(await readFile(new URL('../../fixtures/production-request-v0.2.json', import.meta.url), 'utf8'));
  const seedText = await readFile(new URL('../../docs/baselines/model-findings-v0.2.json', import.meta.url), 'utf8');
  const seed = JSON.parse(seedText);
  verifySeed(seed, corpus, snapshot);
  const manifest = JSON.parse(await readFile(new URL('../../docs/baselines/model-findings-v0.2-manifest.json', import.meta.url), 'utf8'));
  if (hash(seedText) !== manifest.reportSha256) throw Error('Seed artifact changed');
  for (const [path, digest] of Object.entries(manifest.implementationFiles)) {
    if (hash(await readFile(path, 'utf8')) !== digest) throw Error('Frozen implementation changed: ' + path);
  }
  const file = 'reports/findings-v0.2-five-runs.json';
  await mkdir('reports', { recursive: true });
  let report;
  try { report = JSON.parse(await readFile(file, 'utf8')); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (report) {
    if (report.seedSha256 !== hash(seedText) || report.corpusHash !== hash(corpus) || report.requestHash !== hash(snapshot)) throw Error('Checkpoint contract mismatch');
    for (const r of report.rows) if (r.actual && r.outputHash !== hash(r.actual)) throw Error('Checkpoint output changed');
    if (hash(report.rows.filter(r => r.run === 1)) !== hash(seed.rows)) throw Error('Reused seed changed');
  } else {
    report = { kind: 'findings-v0.2-independent-five-run-evaluation', schemaVersion: seed.schemaVersion, promptVersion: seed.promptVersion, promptHash: seed.promptHash, schemaHash: seed.schemaHash, corpusVersion: corpus.version, corpusHash: hash(corpus), requestHash: hash(snapshot), model: seed.model, reasoning: seed.reasoning, seedSha256: hash(seedText), sourceCommit: '7746a5411ead880ff7f6d28d59b3edc8b7f7d3a2', plannedRunsPerCase: 5, plannedCases: 31, plannedExecutions: 155, reusedExecutions: 31, startedAt: new Date().toISOString(), rows: seed.rows };
  }
  const save = async () => {
    await writeFile(file + '.tmp', JSON.stringify(report, null, 2) + '\n');
    await rename(file + '.tmp', file);
  };
  const pending = nextExecutions(corpus, report.rows);
  if (pending.length && !process.env.EVAL_OPENAI_API_KEY) throw Error('Non-production EVAL_OPENAI_API_KEY required');
  const original = globalThis.fetch;
  let telemetry;
  globalThis.fetch = async (url, options) => {
    if (url !== 'https://api.openai.com/v1/responses') throw Error('Unexpected destination');
    const { input, ...settings } = JSON.parse(options.body);
    if (hash(settings) !== hash(snapshot)) throw Error('Frozen request drift');
    telemetry.inputHash = hash(input);
    const response = await original(url, { ...options, signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw Error('upstream_http_' + response.status);
    const body = await response.clone().json();
    telemetry.returnedModel = body.model ?? null;
    telemetry.providerResponseId = body.id ?? null;
    telemetry.usage = body.usage ?? null;
    const text = (body.output || []).filter(x => x.type === 'message').flatMap(x => x.content || []).find(x => x.type === 'output_text')?.text;
    try { telemetry.rawModelFindings = JSON.parse(text); } catch { telemetry.rawModelFindings = null; }
    return response;
  };
  try {
    for (const { c, run } of pending) {
      telemetry = {};
      const timestamp = new Date().toISOString();
      try {
        const actual = await reasonAboutRevenueFindings({ OPENAI_API_KEY: process.env.EVAL_OPENAI_API_KEY }, c.context, 'synthetic:' + c.id);
        if (telemetry.returnedModel !== snapshot.model) throw Error('Returned model mismatch');
        const prior = report.rows.find(r => r.id === c.id && r.inputHash);
        if (prior && prior.inputHash !== telemetry.inputHash) throw Error('Independent run input changed');
        report.rows.push({ id: c.id, run, timestamp, ...telemetry, actual, outputHash: hash(actual), grade: await gradeFindings(c, actual) });
      } catch (e) {
        report.rows.push({ id: c.id, run, timestamp, ...telemetry, error: /^upstream_http_\d+$/.test(e.message) ? e.message : 'model_or_validation_failure' });
      }
      await save();
      const row = report.rows.at(-1);
      console.log(JSON.stringify({ id: c.id, run, completed: report.rows.length, planned: 155, error: row.error ?? null }));
      if (row.error && (!telemetry.returnedModel || row.error.startsWith('upstream_http_'))) break;
    }
  } finally { globalThis.fetch = original; }
  report.finishedAt = new Date().toISOString();
  report.status = nextExecutions(corpus, report.rows).length ? 'incomplete' : 'collected_pending_semantic_review';
  report.newRequests = report.rows.filter(r => r.run > 1).length;
  await save();
  console.log(JSON.stringify({ status: report.status, executions: report.rows.length, newRequests: report.newRequests, errors: report.rows.filter(r => r.error).length }));
  process.exitCode = report.status === 'incomplete' || report.rows.some(r => r.error) ? 1 : 0;
}
if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  main().catch(() => { console.error('Repeated evaluation stopped: check configuration, frozen artifacts or checkpoint. No raw credential/error details printed.'); process.exitCode = 2; });
}
