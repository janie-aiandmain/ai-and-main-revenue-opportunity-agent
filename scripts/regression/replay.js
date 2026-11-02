import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { loadCorpus, grade, summarize, hash } from './core.js';
const [reportPath, reviewPath, ...extra] = process.argv.slice(2);
if (!reportPath || extra.length) {
  console.error('Usage: npm run regression:replay -- reports/model-baseline.json [reviews.json]');
  process.exit(2);
}
const corpus = await loadCorpus();
const report = JSON.parse(await readFile(reportPath, 'utf8'));
if (report.corpusHash !== hash(corpus) || !Array.isArray(report.rows) || !report.rows.length) throw Error('Nonempty report from current corpus required');
const snapshot = JSON.parse(await readFile(new URL('../../fixtures/production-request-v0.1.json', import.meta.url), 'utf8'));
if (report.requestHash !== hash(snapshot)) throw Error('Request version mismatch');
const reviews = reviewPath ? JSON.parse(await readFile(reviewPath, 'utf8')) : [];
if (!Array.isArray(reviews)) throw Error('Review list required');
const rows = report.rows.map(r => {
  const c = corpus.cases.find(c => c.id === r.id);
  if (!c) throw Error('Unknown case ID');
  if (r.error) return { id: r.id, run: r.run, error: 'recorded_upstream_failure' };
  if (r.outputHash !== hash(r.actual)) throw Error('Output hash mismatch');
  const matches = reviews.filter(v => v.caseId === r.id && v.outputHash === r.outputHash);
  if (matches.length > 1) throw Error('Ambiguous semantic reviews');
  return { id: r.id, run: r.run, actual: r.actual, grade: grade(c, r.actual, matches[0]) };
});
if (reviews.some(v => !rows.some(r => r.id === v.caseId && r.actual && hash(r.actual) === v.outputHash))) throw Error('Review does not match a result');
const summary = summarize(corpus, rows, 'offline-replay-of-model-results');
await mkdir('reports', { recursive: true });
await writeFile('reports/replayed-baseline.json', JSON.stringify({ corpusHash: hash(corpus), sourceReportHash: hash(report), timestamp: new Date().toISOString(), summary, rows }, null, 2) + '\n');
console.log(JSON.stringify({ attempted: summary.attempted, validResults: summary.validResults, errors: summary.errors, decisionCorrectness: summary.decisionCorrectness, suitePassed: summary.suitePassed }, null, 2));
process.exitCode = summary.suitePassed ? 0 : 1;
