import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { GeneralFindingLedger } from '../src/staging/general-ledger.js';
import { inspectFinding,generalProjection } from '../src/staging/review-policy.js';
import { materializeCorrected } from '../src/release/reasoning.js';
import { prepareHistory } from '../src/findings.js';
const env={DEPLOYMENT_ENVIRONMENT:'staging',CERTIFICATION_MODE:'local',STAGING_PORTAL_ID:'fixture-portal',STAGING_CONTACT_ID:'fixture-contact',ENABLE_LOCAL_GENERAL_TEST_EXECUTION:'true'};
const actor={role:'Approver',subject:'local-test-operator',kind:'LOCAL_SYNTHETIC'};
const now=()=>new Date().toISOString();
const note=(text='Customer requests surge protection pricing.')=>({noteId:'note1',timestamp:now(),note:text});
const candidate=(quote='Customer requests surge protection pricing.',key='surge-protection')=>({opportunityKey:key,classification:'strong cross-sell opportunity',opportunityType:'cross-sell',confidence:'high',evidence:[{noteId:'note1',quote}],reasoningSummary:'Supported synthetic request.',recommendedNextAction:'Human review and preparation of surge protection pricing only.',humanReviewRequired:true});
const spec=()=>({intent:'prepare_quote',priority:'MEDIUM',timing:{kind:'none'},taskDueAt:new Date(Date.now()+7200000).toISOString(),attestations:{sourceRead:true,evidenceComplete:true,scopeBounded:true,timingVerified:true}});
async function lab(fn){
 const raw=new DatabaseSync(':memory:');const db={exec:q=>raw.exec(q),prepare:q=>raw.prepare(q),close:()=>raw.close(),transaction:fn=>{raw.exec('BEGIN IMMEDIATE');try{const value=fn();raw.exec('COMMIT');return value;}catch(e){raw.exec('ROLLBACK');throw e;}}};
 const l=new GeneralFindingLedger(db,env);let history=[note()],findings=[candidate()],posts=0;
 const source={async readContext(){return {serviceHistory:history};}};
 const reason=async(c,k)=>materializeCorrected({findings},await prepareHistory(c),k);
 const client={async verifyIsolation(){},async create(body){posts++;return {id:'fixture-task-'+posts};},async lookup(correlation){const op=l.db.prepare('SELECT * FROM cert_operations WHERE correlation=?').get(correlation),body=JSON.parse(op.payload_json).body;return [{id:'fixture-task-'+posts,properties:body.properties,associations:{contacts:{results:[{id:env.STAGING_CONTACT_ID}]}}}];}};
 const api={l,source,reason,client,set:(h,f)=>{history=h;findings=f;},posts:()=>posts};
 api.prepare=async()=>{const [finding]=await l.evaluate(env,source,reason),input={findingId:finding.findingId,sourceHash:finding.sourceHash,candidateHash:finding.candidateHash,decision:'REVIEW',attestHumanReview:true,spec:spec()};const checked=await l.review(input,actor,env,source);const reviewed=l.finishReview(input,actor,checked,env);const grant=l.approveGeneral(reviewed,actor);return {finding,reviewed,grant};};
 try{await fn(api);}finally{raw.close();}
}
test('general notes → finding → attributable simulated review → exact approval → one task, no estimated revenue',()=>lab(async a=>{
 const {finding,reviewed,grant}=await a.prepare();assert.match(finding.findingId,/^op_/);assert.equal(reviewed.humanSignoff,'NOT_HUMAN_SIGNOFF');
 assert.equal((await a.l.executeGeneral(reviewed.operationId,grant.approvalId,actor,env,a.source,a.reason,a.client)).state,'CONFIRMED');
 await a.l.executeGeneral(reviewed.operationId,grant.approvalId,actor,env,a.source,a.reason,a.client);assert.equal(a.posts(),1);
 assert.equal(a.l.metrics().estimatedOpportunityValueMinor,0);assert.equal(a.l.metrics().revenueRescued,null);assert.equal(a.l.metrics().verifiedTestOutcomes.length,0);
}));
test('saved approval resumes with the same actor, exact request and original expiry without a new approval or task',()=>lab(async a=>{
 const {reviewed,grant}=await a.prepare(),before=a.l.db.prepare('SELECT * FROM cert_approvals WHERE id=?').get(grant.approvalId);
 const resumed=await a.l.resumeApproval({operationId:reviewed.operationId},actor,env,a.source);
 assert.equal(resumed.approval.approvalId,grant.approvalId);assert.equal(resumed.payloadHash,reviewed.payloadHash);assert.equal(resumed.actionVersion,reviewed.actionVersion);
 assert.equal(resumed.reviewId,reviewed.reviewId);assert.deepEqual(resumed.finalRequest,reviewed.finalRequest);assert.equal(Date.parse(resumed.approval.expiresAt),before.expires_at);
 assert.deepEqual(a.l.db.prepare('SELECT * FROM cert_approvals WHERE id=?').get(grant.approvalId),before);
 assert.equal(a.l.db.prepare('SELECT count(*) AS n FROM cert_approvals').get().n,1);assert.equal(a.posts(),0);
}));
test('saved approval cannot resume for another subject, role, authority domain, expired session or expired grant',()=>lab(async a=>{
 const {reviewed,grant}=await a.prepare();
 for(const patch of [{subject:'other'},{role:'Viewer'},{role:'Admin'},{issuer:'https://other.invalid'},{audience:'other'},{expiresAt:Date.now()-1}])await assert.rejects(a.l.resumeApproval({operationId:reviewed.operationId},{...actor,...patch},env,a.source));
 a.l.db.prepare('UPDATE cert_approvals SET expires_at=? WHERE id=?').run(Date.now()-1,grant.approvalId);
 await assert.rejects(a.l.resumeApproval({operationId:reviewed.operationId},actor,env,a.source));assert.equal(a.posts(),0);
}));
test('saved approval checks fresh source and rejects revoked or concurrently revoked grants',async()=>{
 await lab(async a=>{const {reviewed,grant}=await a.prepare();const history=(await a.source.readContext()).serviceHistory;a.set([{...history[0],note:history[0].note+' Customer withdrew the request.'}],[]);
  await assert.rejects(a.l.resumeApproval({operationId:reviewed.operationId},actor,env,a.source),/source_changed/);assert.equal(a.l.db.prepare('SELECT revoked FROM cert_approvals WHERE id=?').get(grant.approvalId).revoked,1);assert.equal(a.posts(),0);});
 await lab(async a=>{const {reviewed,grant}=await a.prepare();const source={async readContext(){const c=await a.source.readContext();a.l.db.prepare('UPDATE cert_approvals SET revoked=1 WHERE id=?').run(grant.approvalId);return c;}};
  await assert.rejects(a.l.resumeApproval({operationId:reviewed.operationId},actor,env,source));assert.equal(a.posts(),0);});
});
test('a materially revised prepared payload cannot resume its prior approval',()=>lab(async a=>{
 const {finding,reviewed,grant}=await a.prepare(),input={findingId:finding.findingId,sourceHash:finding.sourceHash,candidateHash:finding.candidateHash,decision:'REVIEW',attestHumanReview:true,spec:{...spec(),priority:'LOW'}};
 const changed=a.l.finishReview(input,actor,await a.l.review(input,actor,env,a.source),env);assert.notEqual(changed.payloadHash,reviewed.payloadHash);
 await assert.rejects(a.l.resumeApproval({operationId:reviewed.operationId},actor,env,a.source));assert.equal(a.l.db.prepare('SELECT revoked FROM cert_approvals WHERE id=?').get(grant.approvalId).revoked,1);assert.equal(a.posts(),0);
}));
test('a stored prior reasoning policy cannot reuse approval even when source and raw finding are unchanged',()=>lab(async a=>{
 const {finding,reviewed,grant}=await a.prepare();
 // Simulate the persisted contract from the deployment preceding this policy.
 const checkpoint=JSON.parse(await readFile('docs/review/in-progress-scope/contracts.json','utf8'));
 a.l.db.prepare('UPDATE general_contexts SET contract_hash=? WHERE context_key=?').run(checkpoint.approvalContractHash.after,a.l.contextKey(env));
 await assert.rejects(a.l.resumeApproval({operationId:reviewed.operationId},actor,env,a.source),/review_stale/);
 const [fresh]=await a.l.evaluate(env,a.source,a.reason);
 assert.equal(fresh.findingId,finding.findingId);
 assert.equal(fresh.reviewState,'PENDING');
 assert.equal(a.l.db.prepare('SELECT revoked FROM cert_approvals WHERE id=?').get(grant.approvalId).revoked,1);
 assert.throws(()=>a.l.approveGeneral(reviewed,actor),/review_stale/);
 assert.equal(a.posts(),0);
}));
test('material fresh recommendation change revokes review and approval before any POST',()=>lab(async a=>{
 const {reviewed,grant}=await a.prepare();a.set((await a.source.readContext()).serviceHistory, [{...candidate(),recommendedNextAction:'Review pricing, but first verify the revised scope with the customer.'}]);
 await assert.rejects(a.l.executeGeneral(reviewed.operationId,grant.approvalId,actor,env,a.source,a.reason,a.client));assert.equal(a.posts(),0);
 assert.equal(a.l.db.prepare('SELECT revoked FROM cert_approvals WHERE id=?').get(grant.approvalId).revoked,1);
}));
test('classification/evidence/source changes and withdrawal cannot reuse an old approval',async()=>{
 for(const replacement of [[],[{...candidate(),classification:'follow-up revenue opportunity',opportunityType:'follow-up'}],[{...candidate(),evidence:[{noteId:'note1',quote:'surge protection pricing'}]}]]) await lab(async a=>{
 const {reviewed,grant}=await a.prepare();a.set([note()],replacement);
 await assert.rejects(a.l.executeGeneral(reviewed.operationId,grant.approvalId,actor,env,a.source,a.reason,a.client));assert.equal(a.posts(),0);
 });
});
test('general approval/execute cannot bypass release/fresh-evaluation guards through legacy certification routes',()=>lab(async a=>{
 const {reviewed,grant}=await a.prepare();assert.throws(()=>a.l.approve(reviewed.operationId,reviewed.payloadHash,actor),/route_required/);
 await assert.rejects(a.l.execute(reviewed.operationId,grant.approvalId,a.client,env),/route_required/);
 await assert.rejects(a.l.executeGeneral(reviewed.operationId,grant.approvalId,actor,{...env,ENABLE_LOCAL_GENERAL_TEST_EXECUTION:'false'},a.source,a.reason,a.client),/release_blocked/);
 assert.equal(a.posts(),0);
}));
test('exact action version, latest review ID, attestations and approver role are mandatory',()=>lab(async a=>{
 const {reviewed}=await a.prepare();for(const change of [{actionVersion:'old'},{reviewId:'old'}])assert.throws(()=>a.l.approveGeneral({...reviewed,...change},actor),/exact_review/);
 assert.throws(()=>a.l.approveGeneral(reviewed,{...actor,role:'Viewer'}),/operator/);
 const [f]=a.l.findings(a.l.contextKey(env));await assert.rejects(a.l.review({findingId:f.findingId,sourceHash:f.sourceHash,candidateHash:f.candidateHash,decision:'REVIEW',spec:spec()},actor,env,a.source),/attestation/);
}));
test('simultaneous source/model evaluation suspends approvals and stale completion cannot overwrite the newer evaluation',()=>lab(async a=>{
 const {reviewed,grant}=await a.prepare(),older=a.l.beginEvaluation(env),newer=a.l.beginEvaluation(env);
 const history=await prepareHistory(await a.source.readContext()),result=await materializeCorrected({findings:[candidate()]},history,a.l.contextKey(env));
 assert.throws(()=>a.l.validate(a.l.db.prepare('SELECT * FROM cert_operations WHERE id=?').get(reviewed.operationId),a.l.db.prepare('SELECT * FROM cert_approvals WHERE id=?').get(grant.approvalId),env),/review_stale/);
 assert.throws(()=>a.l.acceptEvaluation(older,history,result),/superseded/);a.l.acceptEvaluation(newer,history,result);
}));
test('two independent findings from one note retain distinct durable IDs and exact task operations',()=>lab(async a=>{
 const first=candidate(),second={...candidate('Customer requests panel repair follow-up.','panel-repair'),classification:'retention or service-recovery opportunity',opportunityType:'retention',recommendedNextAction:'Human review the panel repair request.'};
 const h=[note(first.evidence[0].quote+' '+second.evidence[0].quote)];a.set(h,[first,second]);const both=await a.l.evaluate(env,a.source,a.reason);assert.equal(new Set(both.map(f=>f.findingId)).size,2);
 a.set(h,[{...second,opportunityKey:'repair-panel'},{...first,opportunityKey:'surge-pricing'}]);const repeated=await a.l.evaluate(env,a.source,a.reason);assert.deepEqual(new Set(repeated.map(f=>f.findingId)),new Set(both.map(f=>f.findingId)));
}));
test('omitted restrictions and unrequested assessments fail even if the model decision/type are correct',()=>{
 const h=[note('Customer requests surge protection pricing. Do not book a visit or charge a deposit without written consent.')];
 assert.ok(inspectFinding(candidate(),h).qualityFailures.some(f=>f.code==='restriction_evidence_incomplete'));
 const assessment={...candidate(),recommendedNextAction:'Schedule a site assessment to provide pricing.'};assert.ok(inspectFinding(assessment,[note()]).qualityFailures.some(f=>f.code==='unrequested_scheduling_or_assessment'));
 assert.throws(()=>generalProjection(assessment,[note()],spec(),'ctx'),/quality_blocked/);
});
test('old today/tomorrow/week/day deadlines cannot be renewed by selecting a new task due date',()=>{
 for(const deadline of ['today','tomorrow','this week','by Friday','by end of day']){
  const text='Customer requests surge protection pricing '+deadline+'.',h=[{noteId:'note1',timestamp:'2024-01-01T10:00:00Z',note:text}],f=candidate(text);
  assert.throws(()=>generalProjection(f,h,spec(),'ctx'),/historical_deadline/);
 }
});
test('deferred event and before-work state require actual source confirmation, not a boolean override',()=>{
 for(const text of ['Customer wants lighting after the remodel is finished.','Customer wants outlets priced before work continues.']){
  const h=[note(text)],f=candidate(text);assert.throws(()=>generalProjection(f,h,spec(),'ctx'),/event_unverified|state_unverified/);
 }
});
test('all original failure fixtures and baseline artifacts remain byte-identical to prior certification',async()=>{
 const manifest=JSON.parse(await readFile('docs/certification/manifest.json','utf8'));const {createHash}=await import('node:crypto');
 for(const [file,hash] of Object.entries({...manifest.preserved,...manifest.files})){assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),hash,file);}
});
test('an edited source or failed fresh model revokes the real staging approval, not only sandbox grants',()=>lab(async a=>{
 const {reviewed,grant}=await a.prepare();a.set([note('Customer no longer wants surge protection pricing.')],[]);
 await assert.rejects(a.l.executeGeneral(reviewed.operationId,grant.approvalId,actor,env,a.source,async()=>{throw Error('model_unavailable');},a.client));
 assert.equal(a.l.db.prepare('SELECT revoked FROM cert_approvals WHERE id=?').get(grant.approvalId).revoked,1);assert.equal(a.posts(),0);
}));
test('preserved ST04 review-versus-resolution weakening is detected and never approved as wording',async()=>{
 const captured=JSON.parse(await readFile('fixtures/st04-restriction-weakening-v1.json','utf8'));
 const corpus=JSON.parse(await readFile('fixtures/enterprise-v2.json','utf8')),history=await prepareHistory(corpus.cases.find(c=>c.id==='ST04').context);
 assert.ok(inspectFinding(captured.capturedExecution.actual.findings[0],history).qualityFailures.some(f=>f.code==='restriction_condition_weakened'));
});
test('a previously approved explicit task deadline cannot be reused after that deadline expires',()=>lab(async a=>{
 const {reviewed,grant}=await a.prepare();const op=a.l.db.prepare('SELECT * FROM cert_operations WHERE id=?').get(reviewed.operationId);
 const material=JSON.parse(op.material_json);material.operatorTaskDueAt='2020-01-01T00:00:00Z';a.l.db.prepare('UPDATE cert_operations SET material_json=? WHERE id=?').run(JSON.stringify(material),op.id);
 assert.throws(()=>a.l.assertReviewCurrent({...op,material_json:JSON.stringify(material)}),/deadline_expired/);assert.equal(a.posts(),0);
}));
test('new independent evidence and edited source require an attributable identity decision without merging or allocating duplicates',()=>lab(async a=>{
 const original=await a.prepare(),history=(await a.source.readContext()).serviceHistory;
 const additional={...candidate('Customer requests panel repair follow-up.','panel-repair'),classification:'retention or service-recovery opportunity',opportunityType:'retention',recommendedNextAction:'Human review the requested panel repair.'};
 a.set([{...history[0],note:history[0].note+' '+additional.evidence[0].quote}],[candidate(),additional]);
 await assert.rejects(a.l.evaluate(env,a.source,a.reason),/identity_review_required/);
 const pending=a.l.pendingIdentity(env);assert.equal(pending.candidates.length,2);
 const bindings=pending.candidates.map(c=>({candidateRef:c.candidateRef,resolution:c.finding.opportunityType==='cross-sell'?'EXISTING':'NEW',...(c.finding.opportunityType==='cross-sell'?{findingId:original.finding.findingId}:{})}));
 const input={generation:pending.generation,sourceHash:pending.sourceHash,bindings,attestHumanReview:true,distinctNeedsConfirmed:true};
 await assert.rejects(a.l.resolveIdentity(input,{...actor,role:'Viewer'},env,a.source),/operator/);
 const result=await a.l.resolveIdentity(input,actor,env,a.source);assert.equal(result.findings.length,2);assert.ok(result.findings.some(f=>f.findingId===original.finding.findingId));assert.equal(new Set(result.findings.map(f=>f.findingId)).size,2);assert.equal(result.humanSignoff,'NOT_HUMAN_SIGNOFF');
 assert.ok(result.findings.every(f=>f.reviewState==='PENDING'));assert.equal(a.posts(),0);assert.equal(a.l.db.prepare('SELECT revoked FROM cert_approvals WHERE id=?').get(original.grant.approvalId).revoked,1);
}));

test('internal renovation verification reaches exact review/approval without satisfying the customer follow-up gate',()=>lab(async a=>{
 const packet=JSON.parse(await readFile('docs/review/seven-cases/review-packet.json','utf8')),c=packet.cases.find(c=>c.caseId==='ST08');
 const h=await prepareHistory({serviceHistory:c.sourceEvidence});
 const raw=c.findings.map(({capturedFinding:f})=>Object.fromEntries(Object.entries(f).filter(([k])=>!['findingId','proposedAction'].includes(k))));
 a.set(h,raw);const [f]=await a.l.evaluate(env,a.source,a.reason);
 const input={findingId:f.findingId,sourceHash:f.sourceHash,candidateHash:f.candidateHash,decision:'REVIEW',attestHumanReview:true,spec:{...spec(),actionPurpose:'internal_verification',intent:'verify_current_state',timing:{kind:'internal_task'}}};
 const checked=await a.l.review(input,actor,env,a.source),reviewed=a.l.finishReview(input,actor,checked,env),grant=a.l.approveGeneral(reviewed,actor);
 assert.match(reviewed.finalRequest.body.properties.hs_task_body,/Customer follow-up remains conditional/);
 const material=JSON.parse(a.l.db.prepare('SELECT material_json FROM cert_operations WHERE id=?').get(reviewed.operationId).material_json);
 assert.equal(material.customerActionPermitted,false);assert.ok(material.customerActionGates.some(g=>g.code==='deferred_event_requires_source_confirmation'&&g.satisfiedByInternalVerification===false));
 await assert.rejects(a.l.executeGeneral(reviewed.operationId,grant.approvalId,actor,{...env,ENABLE_LOCAL_GENERAL_TEST_EXECUTION:'false'},a.source,a.reason,a.client),/release_blocked/);
 assert.equal(a.posts(),0);
 await assert.rejects(a.l.review({...input,spec:{...input.spec,actionPurpose:'internal_preparation',intent:'prepare_quote'}},actor,env,a.source),/verification_required/);
}));
test('a different verified subject cannot replay another operator exact approval',()=>lab(async a=>{
 const {reviewed,grant}=await a.prepare();await assert.rejects(a.l.executeGeneral(reviewed.operationId,grant.approvalId,{...actor,subject:'different-operator'},env,a.source,a.reason,a.client),/approval_identity_changed/);assert.equal(a.posts(),0);
 assert.equal(a.l.db.prepare('SELECT revoked FROM cert_approvals WHERE id=?').get(grant.approvalId).revoked,1);
}));
test('a legacy customer-action projection with an absolute source date rejects clearly rather than referencing undefined state',()=>{
 const text='Customer requests pricing by 2026-12-01.';const h=[note(text)];const c=candidate(text);
 assert.throws(()=>generalProjection(c,h,{...spec(),timing:{kind:'absolute',dueAt:'2026-12-01T12:00:00Z'}},'ctx',new Date().toISOString()),/absolute_source_date_requires_internal_verification/);
});
test('synonymous model narration cannot change a source-rendered exact internal task or duplicate its opportunity',()=>lab(async a=>{
 const {finding,reviewed,grant}=await a.prepare();a.set((await a.source.readContext()).serviceHistory,[{...candidate(),recommendedNextAction:'Internal operator: prepare requested surge protection pricing for review.'}]);
 const result=await a.l.executeGeneral(reviewed.operationId,grant.approvalId,actor,env,a.source,a.reason,a.client);assert.equal(result.state,'CONFIRMED');assert.equal(result.payloadHash,reviewed.payloadHash);assert.equal(a.posts(),1);assert.equal(a.l.findings(a.l.contextKey(env))[0].findingId,finding.findingId);
}));
test('changed issuer, audience or operator role cannot reuse an existing exact-payload approval',async()=>{
 for(const change of [{issuer:'https://another.invalid'},{audience:'another-app'},{role:'Admin'}])await lab(async a=>{const {reviewed,grant}=await a.prepare();await assert.rejects(a.l.executeGeneral(reviewed.operationId,grant.approvalId,{...actor,...change},env,a.source,a.reason,a.client),/approval_identity_changed/);assert.equal(a.posts(),0);});
});
test('operator session expiration during the fresh source check is enforced immediately before POST',()=>lab(async a=>{
 const {reviewed,grant}=await a.prepare();const session={...actor,expiresAt:Date.now()+10000};
 const client={...a.client,async verifyIsolation(){session.expiresAt=Date.now()-1;}};
 await assert.rejects(a.l.executeGeneral(reviewed.operationId,grant.approvalId,session,env,a.source,a.reason,client),/session_expired/);assert.equal(a.posts(),0);
}));
