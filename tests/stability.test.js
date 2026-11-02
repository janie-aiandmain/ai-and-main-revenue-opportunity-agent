import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadFindingsCorpus, gradeFindings } from '../scripts/regression/findings-core.js';
import { prepareHistory, materializeFindings } from '../src/findings.js';
import { verifySeed, nextExecutions } from '../scripts/regression/repeat-findings.js';
import { analyzeStability } from '../scripts/regression/stability-core.js';
import { buildReview, reviewMarkdown } from '../scripts/regression/generate-review.js';
const corpus=await loadFindingsCorpus();
const seed=JSON.parse(await readFile(new URL('../docs/baselines/model-findings-v0.2.json',import.meta.url),'utf8'));
const snapshot=JSON.parse(await readFile(new URL('../fixtures/production-request-v0.2.json',import.meta.url),'utf8'));
const histories=Object.fromEntries(await Promise.all(corpus.cases.map(async c=>[c.id,await prepareHistory(c.context)])));
const five=()=>[1,2,3,4,5].flatMap(run=>seed.rows.map(r=>({...structuredClone(r),run})));
async function change(row, mutation) {
 const c=corpus.cases.find(c=>c.id===row.id);
 const raw={findings:row.actual.findings.map(f=>({opportunityKey:f.opportunityKey,classification:f.classification,opportunityType:f.opportunityType,confidence:f.confidence,evidence:f.evidence,reasoningSummary:f.reasoningSummary,recommendedNextAction:f.recommendedNextAction,humanReviewRequired:f.humanReviewRequired}))};
 mutation(raw.findings);
 row.actual=await materializeFindings(raw,histories[row.id],'synthetic:'+row.id);
 row.grade=await gradeFindings(c,row.actual);
}
test('seed compatibility and resumable scheduling preserve exactly five independent slots',()=>{
 verifySeed(seed,corpus,snapshot);
 assert.equal(nextExecutions(corpus,seed.rows).length,124);
 assert.equal(nextExecutions(corpus,five()).length,0);
 assert.throws(()=>nextExecutions(corpus,[...seed.rows,seed.rows[0]]));
 assert.throws(()=>verifySeed({...seed,model:'different'},corpus,snapshot));
 const bad=structuredClone(seed);bad.rows[0].returnedModel='different';assert.throws(()=>verifySeed(bad,corpus,snapshot));
});
test('identical synthetic replays have exact consistency, distinct from any live measurement',()=>{
 const a=analyzeStability(corpus,five(),histories);
 assert.equal(a.overallStrictConsistency.rate,1);assert.equal(a.fields.opportunityKey.findingLevel.denominator,12);
 assert.equal(a.confusion.tp,50);assert.equal(a.confusion.tn,105);assert.equal(a.semanticConsistency.rate,null);
});
test('key renames are exposed verbatim and change finding-ID consistency without changing label consistency',async()=>{
 const rows=five(),row=rows.find(r=>r.id==='ST03'&&r.run===3);
 await change(row,f=>{f[0].opportunityKey='garage-outlet-addition';});
 const a=analyzeStability(corpus,rows,histories);
 assert.equal(a.labelDecisionConsistency.rate,1);
 assert.equal(a.identityInclusiveDecisionConsistency.numerator,30);
 assert.equal(a.keyIdDrift.length,1);
 assert.equal(a.keyIdDrift[0].byRun[2].opportunityKey,'garage-outlet-addition');
 assert.notEqual(a.keyIdDrift[0].byRun[2].findingId,a.keyIdDrift[0].byRun[0].findingId);
});
test('paraphrases remain exact drift with semantic equivalence pending, not automatic semantic failures',async()=>{
 const rows=five(),row=rows.find(r=>r.id==='ST07'&&r.run===4);
 await change(row,f=>{f[0].recommendedNextAction='Ask a human reviewer to prepare surge-protection pricing.';});
 const a=analyzeStability(corpus,rows,histories),c=a.cases.find(c=>c.id==='ST07');
 assert.equal(c.exactStable.opportunityKey,true);assert.equal(c.exactStable.actionVersion,false);assert.equal(c.structuredMaterialDrift,false);
 assert.equal(c.semanticMateriality.verdict,null);assert.equal(c.automaticCorrectRuns,5);
});
test('quote variation differs from source/grounding consistency',async()=>{
 const rows=five(),row=rows.find(r=>r.id==='ST03'&&r.run===4);
 await change(row,f=>{f[0].evidence[0].quote='three outlets in the garage';});
 const a=analyzeStability(corpus,rows,histories),c=a.cases.find(c=>c.id==='ST03');
 assert.equal(c.exactStable.evidenceQuoteExact,false);assert.equal(c.exactStable.evidenceQuoteGrounding,true);assert.equal(c.exactStable.evidenceSources,true);
});
test('slot matching uses evidence topics rather than output order, key names or IDs',()=>{
 const rows=five();
 for(const r of rows.filter(r=>r.id==='EN11'&&r.run%2===0)) r.actual.findings.reverse();
 const a=analyzeStability(corpus,rows,histories);
 assert.equal(a.cases.find(c=>c.id==='EN11').overallStrictStable,true);
});
test('constant wrong decisions can be consistent while failing correctness',async()=>{
 const rows=five();
 for(const row of rows.filter(r=>r.id==='ST07')) await change(row,f=>{f[0].classification='follow-up revenue opportunity';f[0].opportunityType='follow-up';});
 const a=analyzeStability(corpus,rows,histories);
 assert.equal(a.cases.find(c=>c.id==='ST07').labelDecisionStable,true);
 assert.equal(a.cases.find(c=>c.id==='ST07').automaticCorrectRuns,0);
 assert.equal(a.overallDecisionCorrectness.numerator,150);
});
test('missing, invalid and duplicate executions cannot disappear from denominators',()=>{
 const rows=five();rows.splice(rows.findIndex(r=>r.id==='ST03'&&r.run===5),1);
 const a=analyzeStability(corpus,rows,histories);
 assert.equal(a.overallStrictConsistency.denominator,31);assert.equal(a.overallStrictConsistency.numerator,30);assert.equal(a.overallDecisionCorrectness.denominator,155);
 assert.throws(()=>analyzeStability(corpus,[...rows,rows[0]],histories));
});
test('authority/priority drift is distinct from recommendation prose drift',async()=>{
 const rows=five(),row=rows.find(r=>r.id==='ST03'&&r.run===5);
 await change(row,f=>{f[0].classification='strong cross-sell opportunity';f[0].opportunityType='cross-sell';});
 const a=analyzeStability(corpus,rows,histories),c=a.cases.find(c=>c.id==='ST03');
 assert.equal(c.structuredMaterialDrift,true);assert.equal(c.safetyInvariantStable,false);
});
test('all 31 human review cases remain pending, including chronology and injection verdicts',()=>{
 const rows=five(),report={...seed,rows};
 const a=analyzeStability(corpus,rows,histories),packet=buildReview(corpus,report,a,histories);
 assert.equal(packet.cases.length,31);
 for(const c of packet.cases) {
  assert.equal(c.humanReview.status,'PENDING');assert.equal(c.humanReview.verdict,null);assert.equal(c.chronology.humanVerdict,null);assert.equal(c.promptInjection.humanVerdict,null);
  assert.deepEqual(c.humanReview.allowedVerdicts,['PASS','FAIL','CONCERN']);
 }
 assert.match(reviewMarkdown(packet),/No human approval/);
 assert.equal(packet.cases.find(c=>c.id==='EN16').fixtureAnnotationConcern!==null,true);
});

test('action-version changes with byte-identical task payloads are exposed separately',async()=>{
 const rows=five(),row=rows.find(r=>r.id==='EN30'&&r.run===4);
 await change(row,f=>{f[0].reasoningSummary='A different narrative explaining the same unchanged action.';});
 const a=analyzeStability(corpus,rows,histories),c=a.cases.find(c=>c.id==='EN30');
 assert.equal(c.exactStable.taskPayloadExact,true);assert.equal(c.exactStable.actionVersion,false);
 assert.equal(a.identicalPayloadVersionDrift.length,1);assert.equal(a.identicalPayloadVersionDrift[0].id,'EN30');
});
