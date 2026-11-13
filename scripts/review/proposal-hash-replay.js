// Offline reprocessing of immutable captures. Never calls a model, CRM or mailer.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {materializeCorrected,MATERIALIZATION_VERSION} from '../../src/release/reasoning.js';
import {proposalVersionInputs,INTERNAL_TASK_POLICY,INTERNAL_PROPOSAL_VERSION,INTERNAL_PROPOSAL_HASH_POLICY} from '../../src/staging/internal-task-policy.js';
import {GeneralFindingLedger,contractHash} from '../../src/staging/general-ledger.js';
import {REVIEW_POLICY} from '../../src/staging/review-policy.js';
import {canonical,prepareHistory} from '../../src/findings.js';
import {gradeWorkflowCase} from '../regression/workflow-core.js';
import {hash} from '../regression/findings-core.js';
globalThis.fetch=async()=>{throw Error('offline_replay_network_forbidden');};
if(MATERIALIZATION_VERSION!=='source-evidence-v0.3.10'||INTERNAL_PROPOSAL_VERSION!=='internal-task-proposal-v2.5')throw Error('new_contract_requires_new_correction_directory');
const dir='docs/review/proposal-hash-correction',load=async p=>JSON.parse(await readFile(p,'utf8'));
await mkdir(dir,{recursive:true});
try{const ledger=await load(dir+'/human-decisions.json');if(ledger.events.length)throw Error('reviewed_correction_packet_is_immutable');}catch(e){if(e.code!=='ENOENT')throw e;}
const before=await load('docs/review/current-v0.3.9/model-validation/fresh-model.json'),analysis=await load('docs/review/current-v0.3.9/model-validation/analysis.json'),fixture=await load('fixtures/current-model-stability-captured-variation-v1.json');
assert.equal(before.rows.length,32);assert.equal(fixture.cases.reduce((n,c)=>n+c.captures.length,0),27);
for(const c of fixture.cases)for(const capture of c.captures){const r=before.rows.find(r=>r.id===c.id&&r.repeat===capture.repeat&&r.providerResponseId===capture.providerResponseId);assert(r);assert.equal(capture.rawModelOutput,r.rawModelOutput);assert.equal(capture.outputHash,r.outputHash);}
const suites=await Promise.all(['enterprise-v2','unseen-review-variations-v1','release-restrictions-v1'].map(n=>load('fixtures/'+n+'.json')));
const cases=new Map(suites.flatMap(s=>s.cases.map(c=>[c.id,c]))),rows=[];
const effective=f=>{const c=structuredClone(f),a=c.proposedAction;delete a.actionVersion;delete a.hashPolicyVersion;delete a.schemaVersion;delete a.material.policyVersion;delete a.material.proposalVersion;delete a.authorityRequirements.policyVersion;return c;};
for(const old of before.rows){
 const c={...cases.get(old.id),context:old.sourceContext},raw=JSON.parse(old.rawModelOutput),graded=await gradeWorkflowCase(c,raw,before.evaluationTime),actual=graded.actual;
 assert.equal(canonical(actual.findings.map(effective)),canonical(old.actual.findings.map(effective)),'unapproved_business_output_change');
 assert.equal(canonical(actual.findings.map(f=>[f.opportunityKey,f.findingId])),canonical(old.actual.findings.map(f=>[f.opportunityKey,f.findingId])),'raw_identity_was_normalized');
 assert.equal(canonical(actual.findings.map(f=>f.proposedAction.actionPayload)),canonical(old.actual.findings.map(f=>f.proposedAction.actionPayload)),'task_payload_changed');
 assert(graded.passed,'workflow_regression');
 rows.push({id:old.id,repeat:old.repeat,callId:old.callId,sourceContext:old.sourceContext,sourceTime:before.evaluationTime,providerResponseId:old.providerResponseId,rawModelOutputHash:hash(raw),beforeOutputHash:old.outputHash,outputHash:graded.outputHash,actual,decisionPassed:graded.decisionPassed,quality:graded.quality,passed:graded.passed,businessOutputUnchanged:true,payloadUnchanged:true,rawIdentifiersUnchanged:true,humanSemanticVerdict:'PENDING',finalExecutionApproval:false});
}
const db=new DatabaseSync(':memory:'),adapter={exec:q=>db.exec(q),prepare:q=>db.prepare(q),transaction:fn=>{db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}},ledger=new GeneralFindingLedger(adapter,{OPERATOR_EMAIL_ENABLED:'false'}),baselineIds=new Map(),identityRows=[];
try{
 const retained=await load('docs/review/workflow-email/offline-report.json');
 for(const id of new Set(rows.map(r=>r.id))){
  const ref=retained.rows.find(r=>r.id===id),sourceRow=rows.find(r=>r.id===id),history=await prepareHistory(sourceRow.sourceContext),rawPath=ref.captureFile.startsWith('completion-correction/')?'docs/review/'+ref.captureFile:'docs/release/evidence/'+ref.captureFile;
  const captured=await load(rawPath),raw=captured.rows.find(r=>r.id===id&&r.rawModelOutput&&hash(JSON.parse(r.rawModelOutput))===ref.rawOutputHash);assert(raw);
  const current=await materializeCorrected(JSON.parse(raw.rawModelOutput),history,'synthetic:'+id,ref.sourceTime),env={STAGING_PORTAL_ID:'offline-hash-validation',STAGING_CONTACT_ID:id};
  const accepted=ledger.acceptEvaluation(ledger.beginEvaluation(env),history,current,ref.sourceTime);baselineIds.set(id,accepted.map(f=>f.findingId).sort());
 }
 for(const row of rows){
  const env={STAGING_PORTAL_ID:'offline-hash-validation',STAGING_CONTACT_ID:row.id},history=await prepareHistory(row.sourceContext);
  const accepted=ledger.acceptEvaluation(ledger.beginEvaluation(env),history,row.actual,row.sourceTime).filter(f=>f.reviewState!=='WITHDRAWN');
  const ids=accepted.map(f=>f.findingId).sort(),stable=canonical(ids)===canonical(baselineIds.get(row.id));assert(stable,'durable_identity_regression');
  identityRows.push({id:row.id,repeat:row.repeat,durableIdentityReused:stable,bindings:accepted.map(f=>({rawKey:f.modelFinding.opportunityKey,rawFindingId:f.modelFinding.findingId,durableFindingId:f.findingId})),humanSignoff:false});
 }
 const expected=[...baselineIds.values()].reduce((n,ids)=>n+ids.length,0),stored=db.prepare('SELECT count(*) n FROM opportunities').get().n;assert.equal(stored,expected);
 await writeFile(dir+'/identity-replay.json',JSON.stringify({kind:'LOCAL_ONLY_CURRENT_LEDGER_REPLAY',executions:32,expectedNeeds:expected,storedIdentities:stored,extraIdentities:stored-expected,modelCalls:0,hubspotCalls:0,emailCalls:0,hosted:false,rows:identityRows},null,2)+'\n');
}finally{db.close();}
const same=xs=>new Set(xs.map(canonical)).size===1,ratio=(n,d)=>({numerator:n,denominator:d,rate:d?n/d:null}),caseMetrics=[],findingMetrics=[],groups=[];
for(const oldCase of analysis.consistency){
 const slots=analysis.findingConsistency.filter(s=>s.caseId===oldCase.id),views=[];
 for(const slot of slots){
  const byRun=rows.filter(r=>r.id===oldCase.id).map(r=>{
   const prior=slot.byRun.find(b=>b.repeat===r.repeat),f=r.actual.findings.find(f=>f.findingId===prior.rawFindingId);assert(f);
   const old=before.rows.find(b=>b.callId===r.callId).actual.findings.find(x=>x.findingId===f.findingId),a=f.proposedAction;
   return {repeat:r.repeat,callId:r.callId,rawKey:f.opportunityKey,rawFindingId:f.findingId,beforeVersion:old.proposedAction.actionVersion,afterVersion:a.actionVersion,payloadHash:hash(a.actionPayload),authoritativeInputHash:hash(proposalVersionInputs(f,{material:a.material,payload:a.actionPayload},a.authorityRequirements,REVIEW_POLICY))};
  });
  const payloadGroups=new Map();for(const r of byRun){if(!payloadGroups.has(r.payloadHash))payloadGroups.set(r.payloadHash,[]);payloadGroups.get(r.payloadHash).push(r);}
  for(const [payloadHash,rs]of payloadGroups)if(rs.length>1&&same(rs.map(r=>r.authoritativeInputHash))){
   groups.push({caseId:oldCase.id,baselineKey:slot.baselineKey,payloadHash,runs:rs.map(r=>r.repeat),beforeDistinctVersions:new Set(rs.map(r=>r.beforeVersion)).size,afterDistinctVersions:new Set(rs.map(r=>r.afterVersion)).size});
   assert(same(rs.map(r=>r.afterVersion)),'identical_authoritative_payload_version_drift');
  }
  // Every genuinely distinct payload remains a distinct version in this capture.
  for(let i=0;i<byRun.length;i++)for(let j=i+1;j<byRun.length;j++)if(byRun[i].payloadHash!==byRun[j].payloadHash)assert.notEqual(byRun[i].afterVersion,byRun[j].afterVersion,'payload_difference_was_hidden');
  const m={caseId:oldCase.id,baselineKey:slot.baselineKey,beforeStable:same(byRun.map(r=>r.beforeVersion)),afterStable:same(byRun.map(r=>r.afterVersion)),rawKeyStable:same(byRun.map(r=>r.rawKey)),rawFindingIdStable:same(byRun.map(r=>r.rawFindingId)),payloadStable:same(byRun.map(r=>r.payloadHash)),byRun};findingMetrics.push(m);views.push(m);
 }
 caseMetrics.push({caseId:oldCase.id,beforeStable:views.every(s=>s.beforeStable),afterStable:views.every(s=>s.afterStable),rawKeysStable:views.every(s=>s.rawKeyStable),payloadStable:views.every(s=>s.payloadStable),findingSlots:views.length});
}
const summary={originalFreshCapturesReplayed:32,triplicateFixtureCapturesVerified:27,workflowPassed:rows.filter(r=>r.passed).length,businessOutputChanges:0,payloadChanges:0,rawIdentityChanges:0,
 caseVersionConsistency:{before:ratio(caseMetrics.filter(c=>c.beforeStable).length,caseMetrics.length),after:ratio(caseMetrics.filter(c=>c.afterStable).length,caseMetrics.length)},
 findingVersionConsistency:{before:ratio(findingMetrics.filter(c=>c.beforeStable).length,findingMetrics.length),after:ratio(findingMetrics.filter(c=>c.afterStable).length,findingMetrics.length)},
 identicalAuthoritativePayloadGroups:groups.length,beforeFalseVersionChurn:groups.filter(g=>g.beforeDistinctVersions>1).length,afterFalseVersionChurn:groups.filter(g=>g.afterDistinctVersions>1).length,
 remainingLegitimatePayloadVariation:caseMetrics.filter(c=>!c.payloadStable).map(c=>c.caseId),remainingRawKeyIdVariation:findingMetrics.filter(f=>!f.rawKeyStable||!f.rawFindingIdStable).map(f=>({caseId:f.caseId,baselineKey:f.baselineKey,byRun:f.byRun})),
 durableIdentities:11,extraDurableIdentities:0,modelCalls:0,hubspotCalls:0,emailCalls:0,deployments:0,freshModelValidation:'PENDING_ADDITIONAL_AUTHORIZATION_242_CALL_ALLOWANCE_EXHAUSTED',humanSemanticReview:'PENDING',finalExecutionApproval:false};
const sourcePaths=['src/staging/internal-task-policy.js','src/staging/general-ledger.js','src/release/reasoning.js','src/staging/review-policy.js','src/findings-request-v0.3.3.json'];
const sourceHashes=Object.fromEntries(await Promise.all(sourcePaths.map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));
const result={kind:'OFFLINE_PROPOSAL_HASH_CORRECTION_REPLAY_NOT_FRESH_INFERENCE',baselineCommit:'e9c0c57654938714c49d579204abb97f09716915',materializer:MATERIALIZATION_VERSION,taskPolicy:INTERNAL_TASK_POLICY,proposalVersion:INTERNAL_PROPOSAL_VERSION,hashPolicy:INTERNAL_PROPOSAL_HASH_POLICY,reviewPolicy:REVIEW_POLICY,approvalContractHash:contractHash,sourceHashes,beforeReportHash:hash(before),variationFixtureHash:hash(fixture),summary,caseMetrics,findingMetrics,identicalPayloadGroups:groups,rows};
await writeFile(dir+'/replay.json',JSON.stringify(result,null,2)+'\n');
await writeFile(dir+'/human-decisions.json',JSON.stringify({schemaVersion:'append-only-semantic-review-events-v1',replayReportHash:hash(result),scope:'HUMAN_SEMANTIC_ONLY',events:[],finalExecutionApproval:false,releaseAcceptance:false},null,2)+'\n');
let md='# Revised proposal contracts — pending human review\n\nThis is offline replay, not new model inference. Provider outputs, names, source evidence, recommendations and task payloads are unchanged from their corresponding captured executions. Only proposal/hash/policy metadata changed. Old semantic acceptance and execution approval do not transfer. Final task timing/association/correlation and approval remain absent.\n\n';
md+=`**Materializer:** ${MATERIALIZATION_VERSION}. **Proposal:** ${INTERNAL_PROPOSAL_VERSION}. **Hash policy:** ${INTERNAL_PROPOSAL_HASH_POLICY}.\n\n| Execution | Findings | Revised output hash | Verdict / notes |\n| --- | --- | --- | --- |\n`;
for(const row of rows)md+=`| [${row.callId} / ${row.id} / ${row.repeat}](#${row.callId}) | ${row.actual.findings.length} | \`${row.outputHash}\` | **PENDING**; ____ |\n`;
for(const row of rows){md+=`\n<a id="${row.callId}"></a>\n\n## ${row.callId} — ${row.id}, repeat ${row.repeat}\n\n**Source:**\n\n`;for(const n of row.sourceContext.serviceHistory)md+=`- **${n.timestamp}**: ${n.note}\n`;
 if(!row.actual.findings.length)md+='\nNo finding proposed. **Human verdict: PENDING.**\n';
 for(const f of row.actual.findings){const a=f.proposedAction;md+=`\n### ${f.opportunityKey}\n\n${f.classification} / ${f.opportunityType} / ${f.confidence}; ${a.actionPurpose}; ${a.actionPayload.properties.hs_task_priority}.\n\n**Exact recommendation:**\n\n> ${f.recommendedNextAction}\n\n**Evidence:**\n\n`;for(const e of a.material.evidence)md+=`- **${e.timestamp}**: ${e.quote}\n`;
 md+=`\n**New proposal version:** \`${a.actionVersion}\`\n\n**Raw finding ID:** \`${f.findingId}\`\n\n**Review item hash:** \`${hash({callId:row.callId,outputHash:row.outputHash,finding:f})}\`\n\n<details><summary>Complete unchanged task draft, timing and authority</summary>\n\n\`\`\`json\n${JSON.stringify(a,null,2)}\n\`\`\`\n\n</details>\n\n**Human verdict: PENDING. Notes: ____** Final execution approval: absent.\n`;}
}
await writeFile(dir+'/REVIEW.md',md);console.log(JSON.stringify(summary,null,2));
