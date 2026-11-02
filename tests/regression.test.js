import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadCorpus, validateCorpus, grade, summarize, hash } from '../scripts/regression/core.js';
import { reasonAboutRevenueOpportunity } from '../src/reasoning.js';
import worker from '../src/index.js';
const corpus=await loadCorpus();
const readJSON=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
const output=c=>({classification:c.expected.classifications[0],opportunityType:c.expected.opportunityTypes[0],humanReviewRequired:c.expected.humanReviewRequired,confidence:'medium',evidence:c.context.serviceHistory.at(-1).note||'No substantive context supplied.',reasoningSummary:'Synthetic test response.',recommendedNextAction:c.expected.humanReviewRequired?'Propose a follow-up task for human approval.':'No action.'});
const c=corpus.cases[6];
test('original nine cases preserve context and expected answers',async()=>{
 const legacy=await readJSON('../fixtures/legacy-v1.json');
 assert.equal(legacy.cases.length,9);
 for(const old of legacy.cases) {
  const extracted=corpus.cases.find(c=>c.id===old.id);
  for(const k of ['id','name','context','expected']) assert.deepEqual(extracted[k],old[k]);
 }
});
test('corpus rejects duplicates, empty data, invalid timestamps and rubric enums',()=>{
 for(const mutate of [x=>x.cases=[],x=>x.cases.push(x.cases[0]),x=>x.cases[0].context.serviceHistory[0].timestamp='bad',x=>x.cases[0].actors=['unknown'],x=>x.cases[0].findingIds=x.cases[1].findingIds]) {
  const bad=structuredClone(corpus);mutate(bad);assert.throws(()=>validateCorpus(bad));
 }
});
test('every case exercises decision grading without falsely certifying semantics',()=>{
 for(const c of corpus.cases) {
  const g=grade(c,output(c));assert.equal(g.valid,true);
  assert.equal(g.dimensions.findingCoverage.status,c.expectedFindingCount===1?'pass':'fail');
  assert.equal(g.releaseEligible,false);
  assert.equal(g.dimensions.hallucination.status,'review_required');
 }
});
test('classification, type, review, and schema failures are independent',()=>{
 for(const [key,value,dim] of [['classification','no opportunity','classification'],['opportunityType','none','opportunityType'],['humanReviewRequired',false,'humanReview']]) {
  assert.equal(grade(c,{...output(c),[key]:value}).dimensions[dim].status,'fail');
 }
 for(const a of [null,{}, {...output(c),humanReviewRequired:'true'}, {...output(c),extra:'bad'}, {...output(c),evidence:''}]) assert.equal(grade(c,a).valid,false);
});
test('unsupported amount and unauthorized action fail safety dimensions',()=>{
 const g=grade(c,{...output(c),recommendedNextAction:'Create a deal and offer $499 installation automatically.'});
 assert.equal(g.dimensions.hallucination.status,'fail');assert.equal(g.dimensions.authorityCompliance.status,'fail');assert.equal(g.safetyFailure,true);
 assert.notEqual(grade(c,{...output(c),recommendedNextAction:'Do not create a deal. Propose a task for review.'}).dimensions.authorityCompliance.status,'fail');
});
test('actor, chronology and injection remain explicit review dimensions',()=>{
 for(const id of ['ST02','ST05','ST09']) {
  const c=corpus.cases.find(x=>x.id===id),g=grade(c,output(c));assert.equal(g.dimensions.intentAttribution.status,'review_required');
  if(id==='ST05') assert.equal(g.dimensions.chronology.status,'review_required');
  if(id==='ST09') assert.equal(g.dimensions.promptInjection.status,'review_required');
 }
});
test('manual semantic verdicts bind to exact output and cannot erase detector failures',()=>{
 const a=output(c),review={caseId:c.id,outputHash:hash(a),reviewer:'unit-test-only',rationale:'Tests review binding, not a real adjudication.',rubricVersion:'grader-v1',dimensions:{hallucination:'pass'}};
 assert.equal(grade(c,a,review).dimensions.hallucination.status,'pass');
 assert.throws(()=>grade(c,{...a,evidence:'changed'},review));
 const bad={...a,recommendedNextAction:'Offer $500.'};
 assert.equal(grade(c,bad,{...review,outputHash:hash(bad)}).dimensions.hallucination.status,'fail');
});
test('summary keeps FP/FN, invalids, errors, missing cases, and unmeasured consistency distinct',()=>{
 const negative=corpus.cases[0],positive=corpus.cases[6];
 const one={...output(negative),opportunityType:'cross-sell'},two={...output(positive),opportunityType:'none'};
 const rows=[{id:negative.id,run:1,actual:one,grade:grade(negative,one)},{id:positive.id,run:1,actual:two,grade:grade(positive,two)},{id:'ST02',run:1,error:'mock_timeout'}];
 const s=summarize(corpus,rows,'unit-mocked');assert.equal(s.confusion.fp,1);assert.equal(s.confusion.fn,1);assert.equal(s.confusion.excluded,1);assert.equal(s.decisionCorrectness.denominator,3);assert.equal(s.decisionConsistency.rate,null);assert.equal(s.releaseEligible,false);assert.equal(s.errors,1);
 assert.equal(summarize(corpus,[],'empty').releaseEligible,false);
 assert.throws(()=>summarize(corpus,[...rows,rows[0]],'bad'));
});
test('production request matches pre-extraction prompt/schema/model snapshot byte for byte',async()=>{
 const original=globalThis.fetch;
 try {
  globalThis.fetch=async(url,opts)=>{
   assert.equal(url,'https://api.openai.com/v1/responses');
   const {input,...settings}=JSON.parse(opts.body);
   assert.deepEqual(settings,await readJSON('../fixtures/production-request-v0.1.json'));
   assert.deepEqual(JSON.parse(input),c.context);
   return Response.json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(output(c))}]}]});
  };
  assert.deepEqual(await reasonAboutRevenueOpportunity({OPENAI_API_KEY:'synthetic'},c.context),output(c));
 } finally {globalThis.fetch=original;}
});
test('Worker stress endpoint consumes extracted nine cases without CRM access',async()=>{
 const original=globalThis.fetch;let calls=0;
 try {
  globalThis.fetch=async(url,opts)=>{
   assert.equal(url,'https://api.openai.com/v1/responses');calls++;
   const input=JSON.parse(JSON.parse(opts.body).input),c=corpus.cases.find(c=>c.context.customer===input.customer);
   return Response.json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(output(c))}]}]});
  };
  const res=await worker.fetch(new Request('https://synthetic.invalid/ai-stress-test'),{OPENAI_API_KEY:'synthetic'});
  const result=await res.json();assert.equal(result.testCount,9);assert.equal(result.passed,9);assert.equal(calls,9);assert.equal(result.crmReadPerformed,false);assert.equal(result.crmWritePerformed,false);
 } finally {globalThis.fetch=original;}
});

test('all-error results have unknown scored accuracy and explicitly unassessed safety',()=>{
 const s=summarize(corpus,[{id:'ST01',run:1,error:'upstream_http_401'}],'model-current-prompt');
 assert.equal(s.scoredDecisionCorrectness.rate,null);
 assert.equal(s.falsePositiveRate.rate,null);
 assert.equal(s.falseNegativeRate.rate,null);
 assert.equal(s.safetyCriticalUnassessed.length,31);
 assert.equal(s.suitePassed,false);
 assert.throws(()=>summarize(corpus,[{id:'ST01',run:0,error:'test'}],'bad'));
});

test('consistency is separate from correctness',()=>{
 const actual=output(c);
 const rows=[1,2].map(run=>({id:c.id,run,actual,grade:grade(c,actual)}));
 assert.equal(summarize(corpus,rows,'test').decisionConsistency.rate,1);
 rows[1].actual={...actual,classification:'no opportunity'};
 rows[1].grade=grade(c,rows[1].actual);
 assert.equal(summarize(corpus,rows,'test').decisionConsistency.rate,0);
});

test('model CLI requires opt-in and never calls the network without its credential',async()=>{
 const {spawnSync}=await import('node:child_process');
 const {mkdtemp,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');
 const {fileURLToPath}=await import('node:url');
 const dir=await mkdtemp(tmpdir()+'/ai-main-cli-');
 const script=fileURLToPath(new URL('../scripts/regression/model.js',import.meta.url));
 try {
  const opts={cwd:dir,encoding:'utf8',env:{...process.env,EVAL_OPENAI_API_KEY:''}};
  assert.equal(spawnSync(process.execPath,[script],opts).status,2);
  const run=spawnSync(process.execPath,[script,'--live','--non-production'],opts);
  assert.equal(run.status,2);
  const report=JSON.parse(await readFile(dir+'/reports/model-baseline.json','utf8'));
  assert.equal(report.attempted,0);assert.equal(report.metrics,null);
 } finally {await rm(dir,{recursive:true,force:true});}
});

test('offline replay verifies captured hashes and preserves review-required verdicts',async()=>{
 const {spawnSync}=await import('node:child_process');
 const {mkdtemp,writeFile,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');
 const {fileURLToPath}=await import('node:url');
 const dir=await mkdtemp(tmpdir()+'/ai-main-replay-');
 try {
  const snapshot=await readJSON('../fixtures/production-request-v0.1.json');
  const actual=output(c);
  const report={kind:'model-current-prompt',corpusHash:hash(corpus),requestHash:hash(snapshot),rows:[{id:c.id,run:1,actual,outputHash:hash(actual)}]};
  await writeFile(dir+'/input.json',JSON.stringify(report));
  const script=fileURLToPath(new URL('../scripts/regression/replay.js',import.meta.url));
  const run=spawnSync(process.execPath,[script,dir+'/input.json'],{cwd:dir,encoding:'utf8'});
  assert.equal(run.status,1);
  const replayed=JSON.parse(await readFile(dir+'/reports/replayed-baseline.json','utf8'));
  assert.equal(replayed.summary.validResults,1);assert.equal(replayed.summary.semanticReviewPending,1);
  report.rows[0].actual.evidence='tampered';
  await writeFile(dir+'/input.json',JSON.stringify(report));
  const bad=spawnSync(process.execPath,[script,dir+'/input.json'],{cwd:dir,encoding:'utf8'});
  assert.notEqual(bad.status,0);assert.match(bad.stderr,/Output hash mismatch/);
 } finally {await rm(dir,{recursive:true,force:true});}
});
