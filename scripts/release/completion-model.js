// Two fresh affected-case calls only. This runner cannot contact HubSpot or deploy.
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {reasonCorrected,MATERIALIZATION_VERSION} from '../../src/release/reasoning.js';
import {prepareHistory} from '../../src/findings.js';
import {inspectFinding} from '../../src/staging/review-policy.js';
import {hash} from '../regression/findings-core.js';
const load=async p=>JSON.parse(await readFile(p,'utf8'));
const planOnly=process.argv.slice(2).join(' ')==='--plan';
if(!planOnly&&process.argv.slice(2).join(' ')!=='--live --non-production')throw Error('explicit_live_nonproduction_opt_in_required');
if(!planOnly&&!process.env.EVAL_OPENAI_API_KEY)throw Error('nonproduction_evaluation_credential_missing');
if(!planOnly&&!/^[a-f0-9]{40}$/.test(process.env.CORRECTION_SOURCE_SHA||''))throw Error('exact_source_commit_required');
const dir='docs/review/completion-correction',budgetFile=dir+'/model-budget.json',resultFile=dir+'/fresh-model.json';
try{await readFile(budgetFile);throw Error('budget_already_reserved_no_automatic_rerun');}catch(e){if(e.code!=='ENOENT')throw e;}
const fixture=await load('fixtures/documented-completion-captured-variation-v1.json');
const contract=await load('src/findings-request-v0.3.3.json'),baseline=await load('docs/release/evidence/manifest.json'),snapshot=await load('fixtures/reasoning-request-v0.3.3.json');
assert.equal(hash(contract),baseline.requestHash);assert.equal(hash(contract.instructions),baseline.promptHash);assert.equal(hash(contract.text.format.schema),hash(snapshot.text.format.schema));
if(planOnly){console.log(JSON.stringify({kind:'OFFLINE_EVALUATION_PLAN',plannedCalls:2,caseId:'UV11',priorCalls:208,cycleLimit:210,unchangedRequest:true,requestHash:hash(contract),schemaHash:hash(contract.text.format.schema)}));process.exit(0);}
const evaluationTime=fixture.capturedVariants[0].sourceTime;
assert(fixture.capturedVariants.every(v=>v.sourceTime===evaluationTime));
const report={kind:'FRESH_NONPRODUCTION_UV11_EVALUATIONS_NOT_HUMAN_APPROVAL',sourceCommit:process.env.CORRECTION_SOURCE_SHA,runStartedAt:new Date().toISOString(),evaluationTime,materializationVersion:MATERIALIZATION_VERSION,promptVersion:'reasoning-v0.3.3',schemaVersion:'findings-v0.2',requestHash:hash(contract),promptHash:hash(contract.instructions),schemaHash:hash(contract.text.format.schema),model:contract.model,reasoning:contract.reasoning,plannedCalls:2,hubspotCalls:0,deployments:0,newHumanApprovals:0,rows:[]};
const budget={kind:'PERSISTED_PRE_REQUEST_CALL_RESERVATIONS',recordedPriorCalls:208,cycleLimit:210,reservations:[]};
const save=async()=>{await writeFile(resultFile,JSON.stringify(report,null,2)+'\n');await writeFile(budgetFile,JSON.stringify(budget,null,2)+'\n');};
const original=globalThis.fetch;let telemetry,repeat;
globalThis.fetch=async(url,options)=>{
 assert.equal(url,'https://api.openai.com/v1/responses','unexpected_destination');
 const {input,...request}=JSON.parse(options.body);assert.equal(hash(request),baseline.requestHash,'unchanged_request_required');
 assert.equal(budget.reservations.length,repeat-1);assert(budget.recordedPriorCalls+budget.reservations.length<budget.cycleLimit,'model_budget_exhausted');
 budget.reservations.push({caseId:'UV11',repeat,reservedBeforeRequestAt:new Date().toISOString(),requestBodyHash:hash(options.body)});await save();
 const response=await original(url,options);
 if(response.ok){const b=await response.clone().json();telemetry={responseId:b.id,providerCreatedAt:b.created_at,returnedModel:b.model,usage:b.usage,rawModelOutput:(b.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]).find(x=>x.type==='output_text')?.text};}
 return response;
};
await save();
try{for(repeat=1;repeat<=2;repeat++){
 telemetry={};
 try{
  const actual=await reasonCorrected({EVAL_OPENAI_API_KEY:process.env.EVAL_OPENAI_API_KEY},fixture.case.context,'synthetic:UV11',evaluationTime);
  const history=await prepareHistory(fixture.case.context),quality=actual.findings.flatMap(f=>inspectFinding(f,history,actual.findings,evaluationTime).qualityFailures);
  const checks={oneIndependentFinding:actual.findings.length===1,currentInterestVerification:actual.findings.every(f=>f.proposedAction.actionPurpose==='internal_verification'),documentedCompletionRetained:actual.findings.every(f=>f.proposedAction.material.documentedCompletion?.sourceTimestamp==='2025-02-13T10:00:00Z'),historicalNowNotRenewed:actual.findings.every(f=>f.proposedAction.material.sourceTimingConstraints.some(t=>t.wording==='now'&&t.status==='HISTORICAL_NOT_RENEWED'&&!t.taskDeadline)),noCustomerAuthority:actual.findings.every(f=>f.proposedAction.material.customerActionPermitted===false),pendingReviewAndExecutionBlocked:actual.findings.every(f=>f.humanReviewRequired&&f.proposedAction.executionBlocked),qualityClear:quality.length===0};
  report.rows.push({id:'UV11',repeat,...telemetry,actual,outputHash:hash(actual),quality,checks,passed:Object.values(checks).every(Boolean),humanSemanticVerdict:'PENDING',finalExecutionApproval:false});
 }catch(e){report.rows.push({id:'UV11',repeat,...telemetry,error:e.code||'request_or_output_failure',...(e.toJSON?{blocker:e.toJSON()}:{}),passed:false,humanSemanticVerdict:'PENDING',finalExecutionApproval:false});}
 await save();console.log(JSON.stringify({caseId:'UV11',repeat,passed:report.rows.at(-1).passed,attempts:budget.reservations.length}));
 if(report.rows.at(-1).error)break;
}}finally{globalThis.fetch=original;}
report.summary={attempted:budget.reservations.length,valid:report.rows.filter(r=>!r.error).length,passed:report.rows.filter(r=>r.passed).length,cycleCalls:208+budget.reservations.length,remainingBudget:210-208-budget.reservations.length};
await save();console.log(JSON.stringify(report.summary));
if(report.rows.length!==2||report.rows.some(r=>!r.passed))process.exitCode=1;
