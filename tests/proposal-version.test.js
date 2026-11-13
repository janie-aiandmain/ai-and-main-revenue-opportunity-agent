import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {canonical,prepareHistory} from '../src/findings.js';
import {materializeCorrected,MATERIALIZATION_VERSION} from '../src/release/reasoning.js';
import {proposalActionVersion,proposalVersionInputs,INTERNAL_PROPOSAL_HASH_POLICY,INTERNAL_PROPOSAL_VERSION} from '../src/staging/internal-task-policy.js';
import {REVIEW_POLICY} from '../src/staging/review-policy.js';
import {GeneralFindingLedger,contractHash} from '../src/staging/general-ledger.js';
const load=async p=>JSON.parse(await readFile(p,'utf8'));
async function specimen(){
 const report=await load('docs/review/current-v0.3.9/model-validation/fresh-model.json'),row=report.rows.find(r=>r.id==='ST03');
 const raw=JSON.parse(row.rawModelOutput),history=await prepareHistory(row.sourceContext);
 const result=await materializeCorrected(raw,history,'synthetic:ST03',report.evaluationTime),finding=result.findings[0],a=finding.proposedAction;
 return {raw,history,time:report.evaluationTime,finding,projection:{material:a.material,payload:a.actionPayload},authority:a.authorityRequirements};
}
const version=x=>proposalActionVersion(x.finding,x.projection,x.authority,REVIEW_POLICY);
const reverse=value=>Array.isArray(value)?value.map(reverse):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reverse(v)])):value;
test('proposal v2.5 hashes an explicit authoritative field set and excludes explanation/confidence/raw-ID metadata',async()=>{
 const x=await specimen(),before=version(x),inputs=proposalVersionInputs(x.finding,x.projection,x.authority,REVIEW_POLICY);
 assert.equal(INTERNAL_PROPOSAL_VERSION,'internal-task-proposal-v2.6');assert.equal(MATERIALIZATION_VERSION,'source-evidence-v0.3.11');assert.equal(inputs.hashPolicyVersion,INTERNAL_PROPOSAL_HASH_POLICY);
 assert.deepEqual(Object.keys(inputs.findingDecision).sort(),['classification','evidence','humanReviewRequired','opportunityType','recommendedNextAction']);
 const changed=structuredClone(x);Object.assign(changed.finding,{reasoningSummary:'A different explanatory paraphrase.',confidence:'low',findingId:'another-model-facing-id',opportunityKey:'another-presentation-key',displayCaption:'presentation only'});
 assert.equal(version(changed),before);assert.equal(version(reverse(x)),before);assert.equal(x.finding.proposedAction.actionVersion,before);
 // This unit comparison holds the actual payload fixed. Normal key regeneration
 // changes the subject, which the next test proves is still versioned.
});
test('captured key-derived subject differences remain preserved; new source subjects ignore raw key paraphrases',async()=>{
 const x=await specimen(),changed=structuredClone(x.raw);changed.findings[0].reasoningSummary='A synonymous explanation of the same customer request.';
 const paraphrase=await materializeCorrected(changed,x.history,'synthetic:ST03',x.time);
 assert.equal(paraphrase.findings[0].proposedAction.actionVersion,version(x));
 changed.findings[0].opportunityKey='three-added-garage-outlets';
 const renamed=await materializeCorrected(changed,x.history,'synthetic:ST03',x.time);
 assert.equal(renamed.findings[0].proposedAction.actionPayload.properties.hs_task_subject,x.projection.payload.properties.hs_task_subject);
 assert.equal(renamed.findings[0].proposedAction.actionVersion,version(x));assert.equal(renamed.findings[0].opportunityKey,'three-added-garage-outlets');
 assert.notEqual(renamed.findings[0].findingId,x.finding.findingId);
 const prior=await load('docs/review/current-v0.3.9/model-validation/fresh-model.json'),variants=prior.rows.filter(r=>r.id==='EN31').map(r=>r.actual.findings[0].proposedAction);
 assert(new Set(variants.map(a=>a.actionPayload.properties.hs_task_subject)).size>1);assert.equal(new Set(variants.map(a=>a.actionVersion)).size,3);
});
test('every authoritative decision/material/payload change remains bound, including new payload properties',async()=>{
 const x=await specimen(),before=version(x),mutations={
  classification:y=>{y.finding.classification='follow-up revenue opportunity';},
  opportunityType:y=>{y.finding.opportunityType='follow-up';},
  evidence:y=>{y.finding.evidence[0].noteId='another-source';},
  recommendation:y=>{y.finding.recommendedNextAction='Verify additional work has not started before preparing pricing.';},
  humanReview:y=>{y.finding.humanReviewRequired=false;},
  quantity:y=>{y.projection.material.scope.sourceRequests[0]='Customer requests four outlets instead of three.';},
  intent:y=>{y.projection.material.intent='prepare_quote';},
  timing:y=>{y.projection.material.operatorTaskDueAt='2099-01-01T12:00:00Z';},
  restriction:y=>{y.projection.material.sourceRestrictions.push({noteId:'n',quote:'Do not perform added work.'});},
  customerGate:y=>{y.projection.material.customerActionGates.push({code:'current_consent_required'});},
  authority:y=>{y.authority.humanApprovalRequired=false;},
  target:y=>{y.projection.payload.target.contextKey='different-context';},
  subject:y=>{y.projection.payload.properties.hs_task_subject+=' revised';},
  body:y=>{y.projection.payload.properties.hs_task_body+=' New scope.';},
  priority:y=>{y.projection.payload.properties.hs_task_priority='LOW';},
  status:y=>{y.projection.payload.properties.hs_task_status='COMPLETED';},
  taskType:y=>{y.projection.payload.properties.hs_task_type='CALL';},
  arbitraryPayloadProperty:y=>{y.projection.payload.properties.new_property='must also be bound';},
  policy:y=>{y.projection.material.policyVersion='different-policy';},
 };
 for(const [name,mutate]of Object.entries(mutations)){const changed=structuredClone(x);mutate(changed);assert.notEqual(version(changed),before,name);}
 assert.notEqual(proposalActionVersion(x.finding,x.projection,x.authority,'different-review-policy'),before);
});
function restore(fixture){
 const raw=new DatabaseSync(':memory:'),db={exec:q=>raw.exec(q),prepare:q=>raw.prepare(q),transaction:fn=>{raw.exec('BEGIN IMMEDIATE');try{const v=fn();raw.exec('COMMIT');return v;}catch(e){raw.exec('ROLLBACK');throw e;}}};
 const ledger=new GeneralFindingLedger(db,fixture.env);
 for(const [table,rows]of Object.entries(fixture.tables)){
  assert.match(table,/^[a-z0-9_]+$/);raw.exec('DELETE FROM '+table);
  for(const row of rows){const keys=Object.keys(row);for(const k of keys)assert.match(k,/^[a-z0-9_]+$/);raw.prepare('INSERT INTO '+table+' ('+keys.join(',')+') VALUES ('+keys.map(()=>'?').join(',')+')').run(...keys.map(k=>row[k]));}
 }
 return {raw,ledger};
}
test('a genuine captured local v2.4 approval is rejected, revoked on reevaluation, and never silently transferred',async t=>{
 const f=await load('fixtures/proposal-v2.4-local-approval-v1.json');t.mock.timers.enable({apis:['Date'],now:Date.parse(f.capturedAt)});
 const {raw,ledger:l}=restore(f);try{
  assert.notEqual(contractHash,f.contractHash);assert.equal(f.actor.kind,'LOCAL_SYNTHETIC');
  const source={readContext:async()=>f.context},op=raw.prepare('SELECT * FROM cert_operations WHERE id=?').get(f.reviewed.operationId);
  assert.throws(()=>l.assertReviewCurrent(op),/operator_review_stale_or_missing/);
  await assert.rejects(l.resumeApproval({operationId:op.id},f.actor,f.env,source),/invalid_internal_task_authority/);
  const reason=async(c,key)=>materializeCorrected({findings:[f.candidate]},await prepareHistory(c),key);
  const [fresh]=await l.evaluate(f.env,source,reason);assert.equal(fresh.findingId,f.input.findingId);assert.equal(fresh.reviewState,'PENDING');
  assert.equal(raw.prepare('SELECT revoked FROM cert_approvals WHERE id=?').get(f.grant.approvalId).revoked,1);
  const input={...f.input,sourceHash:fresh.sourceHash,candidateHash:fresh.candidateHash};
  const reviewed=l.finishReview(input,f.actor,await l.review(input,f.actor,f.env,source),f.env);
  assert.notEqual(reviewed.payloadHash,f.reviewed.payloadHash);assert.notEqual(reviewed.actionVersion,f.reviewed.actionVersion);
  const grant=l.approveGeneral(reviewed,f.actor),newOp=raw.prepare('SELECT * FROM cert_operations WHERE id=?').get(reviewed.operationId);
  assert(l.validate(newOp,raw.prepare('SELECT * FROM cert_approvals WHERE id=?').get(grant.approvalId),f.env));
  // A later operator-selected due time changes the complete final request.
  const changed={...input,spec:{...input.spec,taskDueAt:'2099-01-02T12:00:00.000Z'}};
  const next=l.finishReview(changed,f.actor,await l.review(changed,f.actor,f.env,source),f.env);
  assert.notEqual(next.payloadHash,reviewed.payloadHash);assert.notEqual(next.actionVersion,reviewed.actionVersion);
  assert.throws(()=>l.validate(raw.prepare('SELECT * FROM cert_operations WHERE id=?').get(next.operationId),raw.prepare('SELECT * FROM cert_approvals WHERE id=?').get(grant.approvalId),f.env),/approval_stale_or_expired/);
  assert.equal(raw.prepare('SELECT count(*) n FROM release_demo_attempts').get().n,0);
 }finally{raw.close();}
});
test('all final HubSpot request bytes remain protected independently of proposal hashing',async t=>{
 const f=await load('fixtures/proposal-v2.4-local-approval-v1.json');t.mock.timers.enable({apis:['Date'],now:Date.parse(f.capturedAt)});
 const {raw,ledger:l}=restore(f);try{
  // Final request integrity is checked by the base ledger before incompatible
  // old material/approval can proceed; test corruption without making any send.
  const original=raw.prepare('SELECT * FROM cert_operations WHERE id=?').get(f.reviewed.operationId),grant=raw.prepare('SELECT * FROM cert_approvals WHERE id=?').get(f.grant.approvalId);
  for(const mutate of [r=>{r.body.properties.hs_task_subject+=' changed';},r=>{r.body.associations[0].to.id='another-contact';},r=>{r.body.properties.additional_property='unapproved';},r=>{r.method='PATCH';}]){
   const request=JSON.parse(original.payload_json);mutate(request);const op={...original,payload_json:canonical(request)};
   assert.throws(()=>l.validate(op,grant,f.env),/final_payload_integrity_failure/);
  }
 }finally{raw.close();}
});
