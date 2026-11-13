// Source-only closeout evidence. No provider/CRM/email/deployment requests.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {prepareHistory,canonical} from '../../src/findings.js';
import {MATERIALIZATION_VERSION,EVIDENCE_POLICY} from '../../src/release/reasoning.js';
import {INTERNAL_PROPOSAL_VERSION,INTERNAL_TASK_POLICY,SUBJECT_POLICY} from '../../src/staging/internal-task-policy.js';
import {GeneralFindingLedger,contractHash} from '../../src/staging/general-ledger.js';
import {gradeWorkflowCase} from '../regression/workflow-core.js';
import {hash} from '../regression/findings-core.js';
globalThis.fetch=async()=>{throw Error('offline_closeout_network_forbidden');};
const dir='docs/review/demo-closeout',mode=process.argv[2],load=async p=>JSON.parse(await readFile(p,'utf8'));
assert(['--replay','--package','--check'].includes(mode));assert.equal(MATERIALIZATION_VERSION,'source-evidence-v0.3.11');assert.equal(INTERNAL_PROPOSAL_VERSION,'internal-task-proposal-v2.6');
const suites=await Promise.all(['enterprise-v2','unseen-review-variations-v1','release-restrictions-v1'].map(n=>load('fixtures/'+n+'.json'))),cases=new Map(suites.flatMap(s=>s.cases.map(c=>[c.id,c])));
const sourcePaths=['src/release/reasoning.js','src/release/evidence.js','src/staging/internal-task-policy.js','src/staging/general-ledger.js','src/staging/review-policy.js','src/findings-request-v0.3.3.json'];
const sourceHashes=Object.fromEntries(await Promise.all(sourcePaths.map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));
const contracts={materializer:MATERIALIZATION_VERSION,proposal:INTERNAL_PROPOSAL_VERSION,taskPolicy:INTERNAL_TASK_POLICY,evidence:EVIDENCE_POLICY,subject:SUBJECT_POLICY,approvalContractHash:contractHash,prompt:'reasoning-v0.3.3',schema:'findings-v0.2',model:'gpt-5.6-terra',reasoningEffort:'low',sourceHashes};
const same=values=>new Set(values.map(canonical)).size===1;
function consistency(rows){
 const db=new DatabaseSync(':memory:'),adapter={exec:q=>db.exec(q),prepare:q=>db.prepare(q),transaction:fn=>{db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}},ledger=new GeneralFindingLedger(adapter,{OPERATOR_EMAIL_ENABLED:'false'}),bound=[];
 try{for(const row of rows){const env={STAGING_PORTAL_ID:'offline-closeout',STAGING_CONTACT_ID:row.id},history=row.sourceContext;
  const accepted=ledger.acceptEvaluation(ledger.beginEvaluation(env),row.history,row.actual,row.sourceTime).filter(f=>f.reviewState!=='WITHDRAWN');
  bound.push({id:row.id,callId:row.callId,source:row.source,bindings:accepted.map(f=>({durableId:f.findingId,rawKey:f.modelFinding.opportunityKey,rawId:f.modelFinding.findingId,version:f.modelFinding.proposedAction.actionVersion,payload:f.modelFinding.proposedAction.actionPayload}))});}
  const caseMetrics=[...new Set(bound.filter(r=>r.bindings.length).map(r=>r.id))].map(id=>{const runs=bound.filter(r=>r.id===id);return {id,executions:runs.length,identityStable:same(runs.map(r=>r.bindings.map(b=>b.durableId).sort())),versionStable:same(runs.map(r=>r.bindings.map(b=>[b.durableId,b.version]).sort())),rawKeysStable:same(runs.map(r=>r.bindings.map(b=>[b.durableId,b.rawKey]).sort()))};});
  const ids=[...new Set(bound.flatMap(r=>r.bindings.map(b=>b.durableId)))],findingMetrics=ids.map(id=>{const runs=bound.flatMap(r=>r.bindings.filter(b=>b.durableId===id).map(b=>({...b,caseId:r.id,callId:r.callId,source:r.source})));return {caseId:runs[0].caseId,durableId:id,versionStable:same(runs.map(r=>r.version)),rawKeys:[...new Set(runs.map(r=>r.rawKey))],rawIds:[...new Set(runs.map(r=>r.rawId))],runs};});
  return {caseVersionConsistency:{passed:caseMetrics.filter(c=>c.versionStable).length,total:caseMetrics.length},findingVersionConsistency:{passed:findingMetrics.filter(f=>f.versionStable).length,total:findingMetrics.length},identitiesStored:db.prepare('SELECT count(*) n FROM opportunities').get().n,caseMetrics,findingMetrics};
 }finally{db.close();}
}
await mkdir(dir,{recursive:true});
if(mode==='--replay'){
 const rows=[];for(const source of ['current-v0.3.9/model-validation','proposal-hash-validation']){const report=await load('docs/review/'+source+'/fresh-model.json');for(const old of report.rows){
  const history=await prepareHistory(old.sourceContext),graded=await gradeWorkflowCase({...cases.get(old.id),context:old.sourceContext},JSON.parse(old.rawModelOutput),report.evaluationTime);
  assert(graded.passed,'retained_workflow_failure:'+old.id);assert.equal(canonical(graded.actual.findings.map(f=>[f.opportunityKey,f.findingId]).sort()),canonical(old.actual.findings.map(f=>[f.opportunityKey,f.findingId]).sort()),'raw_identity_changed');
  rows.push({id:old.id,repeat:old.repeat,callId:source+'/'+old.callId,source,sourceContext:old.sourceContext,sourceTime:report.evaluationTime,providerResponseId:old.providerResponseId,beforeOutputHash:old.outputHash,outputHash:graded.outputHash,actual:graded.actual,passed:graded.passed,history,humanSemanticVerdict:'PENDING'});
 }}
 assert.equal(rows.length,64);const metrics=consistency(rows);assert.equal(metrics.identitiesStored,11);assert.equal(metrics.caseVersionConsistency.passed,9);assert.equal(metrics.findingVersionConsistency.passed,11);
 const result={kind:'OFFLINE_CLOSEOUT_CAPTURE_REPLAY_NOT_FRESH_INFERENCE',baselineCommit:'7a1241f0f93c33780d8f68149be56a95b195bb76',contracts,captures:64,passed:64,modelCalls:0,hubspotCalls:0,emailCalls:0,deployments:0,...metrics,rows:rows.map(({history,...r})=>r)};
 await writeFile(dir+'/capture-replay.json',JSON.stringify(result,null,2)+'\n');await writeFile(dir+'/contracts.json',JSON.stringify(contracts,null,2)+'\n');console.log(JSON.stringify({...result,rows:undefined,caseMetrics:undefined,findingMetrics:undefined}));
}else{
 const replay=await load(dir+'/capture-replay.json'),fresh=await load(dir+'/model-validation/fresh-model.json');assert.equal(hash(replay.contracts),hash(contracts));assert.equal(fresh.materializationVersion,MATERIALIZATION_VERSION);assert.equal(fresh.summary.passed,32);
 const rows=[];for(const old of fresh.rows){const history=await prepareHistory(old.sourceContext),graded=await gradeWorkflowCase({...cases.get(old.id),context:old.sourceContext},JSON.parse(old.rawModelOutput),fresh.evaluationTime);assert(graded.passed);assert.equal(graded.outputHash,old.outputHash);rows.push({...old,history,source:'FRESH',sourceTime:fresh.evaluationTime});}
 const metrics=consistency(rows);assert.equal(metrics.caseVersionConsistency.passed,9);assert.equal(metrics.findingVersionConsistency.passed,11);assert.equal(metrics.identitiesStored,11);
 if(mode==='--package'){
  try{const d=await load(dir+'/human-decisions.json');assert.equal(d.events.length,0,'reviewed_packet_is_immutable');}catch(e){if(e.code!=='ENOENT')throw e;}
  const groups=new Map();for(const r of rows)for(const f of r.actual.findings){const key=r.id+'|'+f.proposedAction.actionVersion,list=groups.get(key)||[];list.push({callId:r.callId,outputHash:r.outputHash,finding:f});groups.set(key,list);}
  const items=[...groups].map(([key,variants],i)=>{const r=rows.find(r=>r.callId===variants[0].callId),f=variants[0].finding;return {reviewId:r.id+'-'+(i+1),caseId:r.id,sourceContext:r.sourceContext,finding:f,variants,actionVersion:f.proposedAction.actionVersion,humanVerdict:'PENDING',finalExecutionApproval:false};});
  assert.equal(items.length,11);const negatives=rows.filter(r=>!r.actual.findings.length).map(r=>({reviewId:r.id,sourceContext:r.sourceContext,outputHash:r.outputHash,humanVerdict:'PENDING'}));assert.equal(negatives.length,5);
  for(const item of items)item.reviewItemHash=hash(item);
  const packet={kind:'COMPACT_CURRENT_CLOSEOUT_SEMANTIC_REVIEW',contracts,freshSourceReportHash:hash(fresh),replayReportHash:hash(replay),findingCards:11,negativeControls:negatives,items,humanVerdict:'PENDING',finalExecutionApproval:false,releaseAcceptance:false};
  await writeFile(dir+'/review-packet.json',JSON.stringify(packet,null,2)+'\n');await writeFile(dir+'/human-decisions.json',JSON.stringify({schemaVersion:'append-only-semantic-review-events-v1',packetHash:hash(packet),events:[],scope:'HUMAN_SEMANTIC_ONLY',finalExecutionApproval:false,releaseAcceptance:false},null,2)+'\n');
  let md='# Final source review — 11 distinct findings\n\nAll automated source gates pass. Your previous approval remains valid for its original v2.5 captures; these changed v2.6 drafts need separate semantic decisions. No final due time or execution approval is set. Reply with each card ID and PASS / FAIL / CONCERN. A PASS accepts the listed exact output hashes, not future output or customer action.\n\n';
  for(const item of items){const f=item.finding,a=f.proposedAction;md+=`## ${item.reviewId} — ${f.classification}\n\n**Internal purpose:** ${a.actionPurpose}; **priority:** ${a.actionPayload.properties.hs_task_priority}${a.material.reviewRouting?' / IMMEDIATE REVIEW':''}.\n\n**Exact task subject:** ${a.actionPayload.properties.hs_task_subject}\n\n**Exact recommendation:** ${f.recommendedNextAction}\n\n**Complete dated source:**\n\n`;for(const n of item.sourceContext.serviceHistory)md+=`- **${n.timestamp}**: ${n.note}\n`;
   md+=`\n**Finding-specific evidence:**\n\n`;for(const e of a.material.evidence)md+=`- **${e.timestamp}**: ${e.quote}\n`;
   md+=`\n**Deadline:** no customer deadline is renewed; internal task due NOT SET. **Authority:** internal verification/preparation only; no customer contact, billing, scheduling or work.\n\n**Current status / consent:** not established by this task.\n\n**Card hash:** \`${item.reviewItemHash}\`. **Action version:** \`${a.actionVersion}\`.\n\n<details><summary>Complete task body, restrictions, gates and exact variants</summary>\n\n\`\`\`json\n${JSON.stringify({action:a,variants:item.variants},null,2)}\n\`\`\`\n\n</details>\n\n**Your verdict: PENDING. Notes: ____**\n\n`;}
  md+='## Negative controls — no finding\n\n';for(const n of negatives)md+=`- **${n.reviewId}**: no finding. Output hash \`${n.outputHash}\`. **PENDING**. Source: ${n.sourceContext.serviceHistory.map(s=>s.timestamp+': '+s.note).join(' / ')}\n`;
  await writeFile(dir+'/REVIEW.md',md);
  await writeFile(dir+'/source-gates.json',JSON.stringify({kind:'EXECUTED_SOURCE_CLOSEOUT_GATES',contracts,replayPassed:64,freshModelPassed:32,freshModelCalls:32,cumulativeReservedCalls:fresh.summary.cumulativeReservedCalls,...metrics,humanSemanticReview:'PENDING',hostedCurrentVersionValidation:'PENDING',emailDelivery:'PENDING_DISABLED',hostedFaultFlushMarker:'PENDING',finalExecutionApproval:false,releaseAcceptance:false},null,2)+'\n');
 }else{const packet=await load(dir+'/review-packet.json'),decisions=await load(dir+'/human-decisions.json');assert.equal(packet.freshSourceReportHash,hash(fresh));assert.equal(packet.replayReportHash,hash(replay));assert.equal(decisions.packetHash,hash(packet));assert.equal(packet.items.length,11);for(const item of packet.items){const {reviewItemHash,...body}=item;assert.equal(reviewItemHash,hash(body));}}
 console.log(JSON.stringify({kind:'CURRENT_CLOSEOUT_SOURCE_CHECK',mode,captureReplays:64,freshModelExecutions:32,findingCards:11,...metrics,caseMetrics:undefined,findingMetrics:undefined,humanApprovalInferred:false}));
}
