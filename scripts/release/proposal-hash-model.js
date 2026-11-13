// Opt-in finite matrix under the user's task-scoped evaluation continuation.
// Old journals, review decisions and the closed v0.3.9 runner remain immutable.
import {readFile,writeFile,mkdir,open} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {reasonCorrected,MATERIALIZATION_VERSION} from '../../src/release/reasoning.js';
import {INTERNAL_PROPOSAL_VERSION,INTERNAL_PROPOSAL_HASH_POLICY} from '../../src/staging/internal-task-policy.js';
import {prepareHistory} from '../../src/findings.js';
import {inspectFinding} from '../../src/staging/review-policy.js';
import {gradeWorkflowCase} from '../regression/workflow-core.js';
import {hash} from '../regression/findings-core.js';
import {openCallJournal,boundedModelFetch} from './current-call-budget.js';
const dir='docs/review/proposal-hash-validation',load=async p=>JSON.parse(await readFile(p,'utf8'));
const args=process.argv.slice(2).join(' '),planOnly=args==='--plan';
if(!planOnly&&args!=='--live --non-production')throw Error('explicit_live_nonproduction_opt_in_required');
const [plan,authorization,request,snapshot,priorProof]=await Promise.all([
 load(dir+'/plan.json'),load(dir+'/authorization.json'),load('src/findings-request-v0.3.3.json'),load('fixtures/reasoning-request-v0.3.3.json'),load('docs/review/current-v0.3.9/model-validation/accounting-proof.json')]);
assert(authorization.authorized);assert.equal(authorization.planHash,hash(plan));assert.equal(authorization.cumulativeCallCeiling,null);assert.equal(priorProof.cumulativeReservedCalls,242);
assert.equal(MATERIALIZATION_VERSION,plan.materializer);assert.equal(INTERNAL_PROPOSAL_VERSION,plan.proposalVersion);assert.equal(INTERNAL_PROPOSAL_HASH_POLICY,plan.hashPolicy);
assert.equal(hash(request),hash(snapshot));assert.equal(request.model,plan.model);assert.equal(request.reasoning.effort,plan.reasoningEffort);
for(const [p,sha]of Object.entries(plan.sourceHashes))assert.equal(createHash('sha256').update(await readFile(p)).digest('hex'),sha,'unplanned_runtime_change');
const suites=await Promise.all(['enterprise-v2','unseen-review-variations-v1','release-restrictions-v1'].map(n=>load('fixtures/'+n+'.json')));
const cases=new Map(suites.flatMap(s=>s.cases.map(c=>[c.id,{...c,context:c.context||{customer:'Synthetic restriction '+c.id,serviceHistory:[{timestamp:c.timestamp,note:c.note}]}}])));
const calls=plan.groups.flatMap(g=>g.cases.flatMap(caseId=>Array.from({length:g.runsPerCase},(_,i)=>({caseId,repeat:i+1})))).map((c,i)=>({...c,callId:'hash-validation-'+String(i+1).padStart(2,'0')}));
assert.equal(calls.length,plan.plannedCalls);for(const c of calls)assert(cases.has(c.caseId));
if(planOnly){console.log(JSON.stringify({kind:'OFFLINE_TASK_SCOPED_PLAN',plannedCalls:calls.length,priorCalls:242,cumulativeCallCeiling:null,model:request.model,reasoning:request.reasoning,materializer:MATERIALIZATION_VERSION,targets:calls}));process.exit(0);}
if(!process.env.EVAL_OPENAI_API_KEY)throw Error('nonproduction_evaluation_credential_missing');
const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(process.env.EVAL_VALIDATION_SOURCE_SHA!==source||!/^[a-f0-9]{40}$/.test(source))throw Error('exact_evaluation_source_commit_required');
if(execFileSync('git',['status','--porcelain','--','src','scripts/release/proposal-hash-model.js','scripts/release/current-call-budget.js',dir+'/plan.json',dir+'/authorization.json'],{encoding:'utf8'}).trim())throw Error('uncommitted_evaluation_source_changes');
await mkdir(dir,{recursive:true});
const lock=await open(dir+'/execution.lock','wx',0o600);await lock.write(JSON.stringify({sourceCommit:source,startedAt:new Date().toISOString(),authorizationHash:hash(authorization)})+'\n');await lock.sync();await lock.close();
const journal=await openCallJournal(dir+'/reservations.jsonl',calls.length),wire=await open(dir+'/provider-captures.jsonl','wx',0o600);
const report={kind:'FRESH_TASK_SCOPED_NONPRODUCTION_PROPOSAL_HASH_VALIDATION',sourceCommit:source,authorizationHash:hash(authorization),planHash:hash(plan),correctionReportHash:plan.correctionReportHash,requestHash:hash(request),promptHash:hash(request.instructions),schemaHash:hash(request.text.format.schema),model:request.model,reasoning:request.reasoning,materializationVersion:MATERIALIZATION_VERSION,proposalVersion:INTERNAL_PROPOSAL_VERSION,hashPolicy:INTERNAL_PROPOSAL_HASH_POLICY,evaluationTime:new Date().toISOString(),plannedCalls:calls.length,priorCalls:242,cumulativeCallCeiling:null,hubspotCalls:0,emailCalls:0,deployments:0,rows:[]};
const save=()=>writeFile(dir+'/fresh-model.json',JSON.stringify(report,null,2)+'\n');
const original=globalThis.fetch;let active,telemetry;
globalThis.fetch=boundedModelFetch({journal,requestHash:hash(request),credential:process.env.EVAL_OPENAI_API_KEY,current:()=>active,fetcher:(...args)=>original(...args),capture:async receipt=>{telemetry=receipt;await wire.write(JSON.stringify(receipt)+'\n');await wire.sync();}});
await save();
try{
 for(const call of calls){
  active=call;telemetry={};const c=cases.get(call.caseId);
  try{
   const actual=await reasonCorrected({EVAL_OPENAI_API_KEY:process.env.EVAL_OPENAI_API_KEY},c.context,'synthetic:'+c.id,report.evaluationTime);
   if(telemetry.returnedModel!==request.model)throw Error('returned_model_mismatch');
   const raw=JSON.parse(telemetry.rawModelOutput),graded=await gradeWorkflowCase(c,raw,report.evaluationTime),history=await prepareHistory(c.context);
   assert.equal(hash(actual),graded.outputHash,'fresh_output_replay_mismatch');
   const rawQuality=raw.findings.flatMap(f=>inspectFinding(f,history,raw.findings,report.evaluationTime).qualityFailures);
   const extraChecks={pendingHumanReview:actual.findings.every(f=>f.humanReviewRequired&&f.proposedAction.executionBlocked),noCustomerAuthority:actual.findings.every(f=>f.proposedAction.material.customerActionPermitted===false),
    ...(c.id==='UV11'?{singleCrossSell:actual.findings.length===1&&actual.findings[0].classification==='strong cross-sell opportunity'&&actual.findings[0].opportunityType==='cross-sell',currentInterestVerification:actual.findings.every(f=>f.proposedAction.actionPurpose==='internal_verification'),documentedCompletion:actual.findings.every(f=>f.proposedAction.material.documentedCompletion?.sourceTimestamp==='2025-02-13T10:00:00Z')}:{}),
    ...(['ST03','EN31','RQ02'].includes(c.id)?{immediateScopeReview:actual.findings.length===1&&actual.findings[0].proposedAction.material.reviewRouting?.queue==='immediate_review'&&actual.findings[0].proposedAction.actionPayload.properties.hs_task_priority==='HIGH'}:{})};
   report.rows.push({id:c.id,repeat:call.repeat,callId:call.callId,sourceContext:c.context,fixtureHash:hash(c),...telemetry,...graded,rawLabels:raw.findings.map(f=>({opportunityKey:f.opportunityKey,classification:f.classification,opportunityType:f.opportunityType})),rawQuality,extraChecks,passed:graded.passed&&Object.values(extraChecks).every(Boolean),humanSemanticVerdict:'PENDING',finalExecutionApproval:false});
  }catch(error){
   report.rows.push({id:c.id,repeat:call.repeat,callId:call.callId,sourceContext:c.context,...telemetry,error:error.code||'request_or_schema_processing_failure',...(error.toJSON?{blocker:error.toJSON()}:{}),passed:false,humanSemanticVerdict:'PENDING',finalExecutionApproval:false});
  }
  await save();console.log(JSON.stringify({caseId:c.id,repeat:call.repeat,attempts:journal.count,passed:report.rows.at(-1).passed,error:report.rows.at(-1).error||null}));
  if(report.rows.at(-1).error)break;
 }
}finally{globalThis.fetch=original;await journal.close();await wire.close();}
report.summary={attempted:journal.count,completed:report.rows.length,valid:report.rows.filter(r=>!r.error).length,passed:report.rows.filter(r=>r.passed).length,unrun:calls.length-report.rows.length,cumulativeReservedCalls:242+journal.count,remainingPlannedCalls:calls.length-journal.count,cumulativeCallCeiling:null,usage:{inputTokens:report.rows.reduce((n,r)=>n+(r.usage?.input_tokens||0),0),outputTokens:report.rows.reduce((n,r)=>n+(r.usage?.output_tokens||0),0),totalTokens:report.rows.reduce((n,r)=>n+(r.usage?.total_tokens||0),0)}};
await save();console.log(JSON.stringify(report.summary));if(report.rows.length!==calls.length||report.rows.some(r=>!r.passed))process.exitCode=1;
