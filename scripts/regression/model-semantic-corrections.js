// Fresh non-production model calls only; no CRM credentials, mutations or deployment.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {reasonCorrected,materializeCorrected,PROMPT_VERSION,SCHEMA_VERSION} from '../../src/findings-v0.3.3.js';
import {prepareHistory} from '../../src/findings.js';
import {gradeFindings,loadFindingsCorpus,hash} from './findings-core.js';
import {inspectFinding} from '../../src/staging/review-policy.js';
if(process.argv.slice(2).join(' ')!=='--live --non-production')throw Error('explicit_live_nonproduction_opt_in_required');
if(!process.env.EVAL_OPENAI_API_KEY)throw Error('nonproduction_evaluation_credential_missing');
const corpus=await loadFindingsCorpus(),unseen=JSON.parse(await readFile('fixtures/unseen-review-variations-v1.json','utf8'));
const expected=JSON.parse(await readFile('fixtures/human-semantic-corrections-v1.json','utf8'));
const snapshot=JSON.parse(await readFile('fixtures/reasoning-request-v0.3.3.json','utf8'));
const time='2026-11-03T12:00:00.000Z',rows=[],original=globalThis.fetch;let telemetry={};
const output='reports/semantic-corrections-v0.3.3-'+new Date().toISOString().replaceAll(/[:.]/g,'-')+'.json';
const meta={kind:'FRESH_MODEL_AND_INTERNAL_TASK_VALIDATION_NOT_FINAL_APPROVAL',promptVersion:PROMPT_VERSION,schemaVersion:SCHEMA_VERSION,proposalVersion:'internal-task-proposal-v2',reviewPolicy:'finding-review-v2',requestHash:hash(snapshot),promptHash:hash(snapshot.instructions),schemaHash:hash(snapshot.text.format.schema),model:snapshot.model,reasoning:snapshot.reasoning,evaluationTime:time,corpusHash:hash(corpus),unseenHash:hash(unseen),humanExpectationHash:hash(expected),humanDecisionBasisCommit:'38bc069',grading:'Unchanged expectations; explicit v0.3.3 materializer rebuild, no legacy-prompt metadata normalization',hubspotCalls:0,crmWrites:0,newExecutionApprovals:0};
globalThis.fetch=async(url,options)=>{
 if(url!=='https://api.openai.com/v1/responses')throw Error('unexpected_destination');const {input,...request}=JSON.parse(options.body);if(hash(request)!==hash(snapshot))throw Error('request_drift');
 const r=await original(url,options);if(r.ok){const b=await r.clone().json();telemetry={returnedModel:b.model,usage:b.usage};}return r;
};
const planned=[...corpus.cases.map(c=>({...c,suite:'original31'})),...unseen.cases.map(c=>({...c,suite:'unseen16'}))];
await mkdir('reports',{recursive:true});
try{
 for(const c of planned){telemetry={};try{
  const actual=await reasonCorrected({EVAL_OPENAI_API_KEY:process.env.EVAL_OPENAI_API_KEY},c.context,'synthetic:'+c.id,time);
  const history=await prepareHistory(c.context);
  const grade=c.suite==='original31'?await gradeFindings(c,actual,{materializer:(raw,h,k)=>materializeCorrected(raw,h,k,time)}):{valid:true,decisionPassed:(actual.findings.length>0)===c.expectedActionable};
  const inspections=actual.findings.map(f=>({findingId:f.findingId,...inspectFinding(f,history,actual.findings,time)}));
  const taskFailures=[];
  for(const f of actual.findings){const a=f.proposedAction,body=a.actionPayload.properties.hs_task_body;
   if(a.authorityRequirements.customerActionPermitted!==false||!a.executionBlocked||a.material.operatorTaskDueAt!==null)taskFailures.push('unapproved_or_customer_action_authority');
   if(a.material.evidence.some(e=>!body.includes(e.timestamp)))taskFailures.push('source_timestamp_missing');
   if(a.material.customerActionGates.some(g=>g.satisfiedByInternalVerification!==false))taskFailures.push('customer_gate_silently_cleared');
  }
  const humanCase=expected.cases.find(x=>x.id===c.id);
  if(humanCase){for(const f of actual.findings){const p=f.proposedAction,e=humanCase.expected;let purpose=e.purpose;
    if(e.purposes){purpose=c.id==='EN11'?(/surge protection/i.test(f.evidence.map(x=>x.quote).join(' '))?'internal_preparation':'internal_verification'):(f.opportunityType==='retention'?'internal_verification':'internal_preparation');}
    if(p.actionPurpose!==purpose)taskFailures.push('human_scope_purpose_mismatch');
    for(const word of e.required||[])if(!p.actionPayload.properties.hs_task_body.includes(word))taskFailures.push('human_required_context_missing:'+word);
   }}
  rows.push({id:c.id,suite:c.suite,...telemetry,actual,outputHash:hash(actual),grade,inspections,taskFailures:[...new Set(taskFailures)],humanReviewOfThisOutput:{status:'PENDING',verdict:null},priorHumanDecisionScope:'Original captured output only; not inherited'});
 }catch(e){rows.push({id:c.id,suite:c.suite,error:e.code||'request_or_output_failed',...(e.toJSON?{blocker:e.toJSON()}:{}),errorClass:/^model_http_\d+$/.test(e.message)?e.message:undefined});}
 await writeFile(output,JSON.stringify({...meta,rows},null,2)+'\n');console.log(JSON.stringify({id:c.id,completed:rows.length,planned:planned.length,error:rows.at(-1).error??null,decisionPassed:rows.at(-1).grade?.decisionPassed??false}));
 if(['missing_credential','rejected_credential','insufficient_permission','blocked_network_access'].includes(rows.at(-1).error))break;
 }
}finally{globalThis.fetch=original;}
const summary={planned:planned.length,attempted:rows.length,valid:rows.filter(r=>!r.error&&r.grade.valid!==false).length,originalDecisionPasses:rows.filter(r=>r.suite==='original31'&&r.grade?.decisionPassed).length,unseenActionabilityPasses:rows.filter(r=>r.suite==='unseen16'&&r.grade?.decisionPassed).length,inspectionFailures:rows.filter(r=>r.inspections?.some(i=>i.qualityFailures.length)).map(r=>({id:r.id,issues:r.inspections.flatMap(i=>i.qualityFailures)})),taskFailures:rows.filter(r=>r.taskFailures?.length).map(r=>({id:r.id,issues:r.taskFailures})),legacyGraderFlags:rows.filter(r=>r.grade?.failures?.length).map(r=>({id:r.id,dimensions:r.grade.failures})),freshHumanSignoffs:0,modelCalls:rows.length};
await writeFile(output,JSON.stringify({...meta,rows,summary},null,2)+'\n');console.log(JSON.stringify({output,summary}));process.exitCode=summary.valid===planned.length&&summary.originalDecisionPasses===31&&summary.unseenActionabilityPasses===16&&!summary.inspectionFailures.length&&!summary.taskFailures.length?0:1;
