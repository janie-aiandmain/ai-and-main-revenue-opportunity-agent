// Opt-in non-production calls; never loads CRM credentials.
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { reasonCorrected } from '../../src/findings-v0.3.2.js';
import { prepareHistory } from '../../src/findings.js';
import { gradeFindings,loadFindingsCorpus,hash } from './findings-core.js';
import { inspectFinding } from '../../src/staging/review-policy.js';
if(process.argv.slice(2).join(' ')!=='--live --non-production')throw Error('explicit_live_nonproduction_opt_in_required');
if(!process.env.EVAL_OPENAI_API_KEY)throw Error('nonproduction_evaluation_credential_missing');
const corpus=await loadFindingsCorpus(),unseen=JSON.parse(await readFile('fixtures/unseen-review-variations-v1.json','utf8'));
const snapshot=JSON.parse(await readFile('fixtures/reasoning-request-v0.3.2.json','utf8'));
const original=globalThis.fetch,rows=[];let telemetry;
const time='2026-11-03T12:00:00.000Z';
globalThis.fetch=async(url,options)=>{
 if(url!=='https://api.openai.com/v1/responses')throw Error('unexpected_destination');
 const {input,...request}=JSON.parse(options.body);if(hash(request)!==hash(snapshot))throw Error('request_drift');
 const r=await original(url,options);if(r.ok){const b=await r.clone().json();telemetry={returnedModel:b.model,usage:b.usage};}return r;
};
const planned=[...corpus.cases.map(c=>({...c,suite:'original31'})),...unseen.cases.map(c=>({...c,suite:'unseen16'}))];
const meta={kind:'CORRECTED_MODEL_VALIDATION_NOT_HUMAN_SIGNOFF',promptVersion:'reasoning-v0.3.2',schemaVersion:'findings-v0.2',requestHash:hash(snapshot),promptHash:hash(snapshot.instructions),schemaHash:hash(snapshot.text.format.schema),model:snapshot.model,reasoning:snapshot.reasoning,evaluationTime:time,corpusHash:hash(corpus),unseenHash:hash(unseen)};
await mkdir('reports',{recursive:true});
try{
 for(const c of planned){
  telemetry={};
  try{
   const actual=await reasonCorrected({EVAL_OPENAI_API_KEY:process.env.EVAL_OPENAI_API_KEY},c.context,'synthetic:'+c.id,time);
   // Schema is unchanged; v2 decisions are graded with explicit prompt-metadata adaptation only.
   const grade=c.suite==='original31'?await gradeFindings(c,{...actual,promptVersion:'reasoning-v0.2'}):{decisionPassed:(actual.findings.length>0)===c.expectedActionable};
   const history=await prepareHistory(c.context);
   const inspections=actual.findings.map(f=>({findingId:f.findingId,...inspectFinding(f,history,actual.findings,time)}));
   rows.push({id:c.id,suite:c.suite,...telemetry,actual,outputHash:hash(actual),grade,inspections,humanReview:{status:'PENDING',verdict:null}});
  }catch(e){rows.push({id:c.id,suite:c.suite,error:e.code||(/^model_http_\d+$/.test(e.message)?e.message:'request_or_output_failed'),...(e.toJSON?{blocker:e.toJSON()}:{})});}
  await writeFile('reports/corrected-model-v0.3.2.json',JSON.stringify({...meta,rows},null,2)+'\n');
  console.log(JSON.stringify({id:c.id,completed:rows.length,planned:planned.length,error:rows.at(-1).error??null}));
  if(['missing_credential','rejected_credential','insufficient_permission','blocked_network_access'].includes(rows.at(-1).error)||/^model_http_(?:400|401|403|404|429)$/.test(rows.at(-1).error??''))break;
 }
}finally{globalThis.fetch=original;}
const report={...meta,rows,summary:{planned:planned.length,attempted:rows.length,valid:rows.filter(r=>!r.error).length,decisionPasses:rows.filter(r=>r.grade?.decisionPassed).length,qualityFailures:rows.filter(r=>r.inspections?.some(i=>i.qualityFailures.length)).map(r=>({id:r.id,issues:r.inspections.flatMap(i=>i.qualityFailures)})),humanSignoffs:0}};
await writeFile('reports/corrected-model-v0.3.2.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));
// Valid results still need semantic adjudication; this is not a promotion command.
process.exitCode=report.summary.valid===planned.length&&report.summary.decisionPasses===planned.length&&!report.summary.qualityFailures.length?0:1;
