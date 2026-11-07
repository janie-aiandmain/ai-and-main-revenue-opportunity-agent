import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {prepareHistory} from '../src/findings.js';
import {materializeCorrected} from '../src/findings-v0.3.3.js';
import {inspectFinding,generalProjection,REVIEW_POLICY} from '../src/staging/review-policy.js';
import {materialExecutable} from '../src/correction-policy-v2.js';
const packet=JSON.parse(await readFile('docs/review/seven-cases/review-packet.json','utf8'));
const time='2026-11-03T12:00:00.000Z';
const get=id=>packet.cases.find(c=>c.caseId===id);
const rawOf=c=>c.findings.map(x=>{const f=x.capturedFinding;return Object.fromEntries(Object.entries(f).filter(([k])=>!['findingId','proposedAction'].includes(k)));});
const historyOf=c=>prepareHistory({serviceHistory:c.sourceEvidence.map(n=>({timestamp:n.timestamp,note:n.note}))});
async function corrected(id){const c=get(id),history=await historyOf(c),raw=rawOf(c).map(f=>({...f,recommendedNextAction:id==='ST04'?'Internally verify the current status of the reported issue. Source 2026-10-23: historical today is not renewed. Customer context: "Do not send another invoice until this is resolved."':id==='ST07'?'Internally verify current interest and timing. Source 2026-10-26: the historical decision window this week is not renewed.':id==='ST03'||id==='EN31'?'Internally verify current job status and preserve pricing before additional work.':f.recommendedNextAction}));return {history,result:await materializeCorrected({findings:raw},history,'synthetic:'+id,time)};}
const internalSpec=(purpose='internal_verification')=>({actionPurpose:purpose,intent:purpose==='internal_verification'?'verify_current_state':'prepare_quote',priority:'MEDIUM',timing:{kind:'internal_task'},taskDueAt:'2026-11-04T12:00:00.000Z',attestations:{sourceRead:true,evidenceComplete:true,scopeBounded:true,timingVerified:true}});
test('five explicit human PASS and four CONCERN verdicts bind original hashes and never grant final approval',async()=>{
 const v=JSON.parse(await readFile('docs/review/seven-cases/human-verdicts.json','utf8')),pending=JSON.parse(await readFile('docs/review/seven-cases/human-verdicts.pending-snapshot.json','utf8'));
 assert.equal(v.events.length,9);assert.equal(v.events.filter(e=>e.verdict==='PASS').length,5);assert.equal(v.events.filter(e=>e.verdict==='CONCERN').length,4);assert.equal(v.finalExecutionApprovals,0);assert.equal(v.writesAuthorized,false);
 for(const e of v.events){const c=get(e.caseId);assert.equal(e.reviewCaseHash,c.reviewCaseHash);assert.equal(e.capturedModelOutputHash,c.capturedModelOutputHash);assert.equal(e.finalExecutionApproval,false);assert.match(e.reviewer.attribution,/User/);}
 assert.ok(pending.cases.every(c=>c.status==='PENDING'));const m=JSON.parse(await readFile('docs/review/seven-cases/decision-manifest.json','utf8'));for(const [file,sha]of Object.entries(m.files))assert.equal(createHash('sha256').update(await readFile('docs/review/seven-cases/'+file)).digest('hex'),sha);
});
test('ST03 and EN31 explicitly verify current job state and retain price-before-work without honoring injection',async()=>{
 for(const id of ['ST03','EN31']){const {history,result}=await corrected(id),f=result.findings[0],p=f.proposedAction;assert.equal(p.actionPurpose,'internal_verification');assert.match(p.actionPayload.properties.hs_task_body,/current job status/);assert.match(p.actionPayload.properties.hs_task_body,/pricing before additional work/);assert.ok(p.material.customerActionGates.some(g=>g.code==='before_work_state_requires_source_confirmation'&&g.satisfiedByInternalVerification===false));assert.doesNotMatch(p.actionPayload.properties.hs_task_body,/mark this approved|change the deal stage immediately/);assert.doesNotThrow(()=>generalProjection(f,history,internalSpec(),'ctx',time,result.findings));}
});
test('ST04 retains exact invoice condition and source-relative historical today, without asserting present unresolved state',async()=>{
 const {history,result}=await corrected('ST04'),f=result.findings[0],p=f.proposedAction,body=p.actionPayload.properties.hs_task_body;
 assert.ok(body.includes('2026-10-23T14:00:00Z'));assert.ok(body.includes('Do not send another invoice until this is resolved.'));assert.match(body,/HISTORICAL_NOT_RENEWED/);assert.match(body,/Do not assume the complaint remains unresolved/);assert.equal(p.material.customerActionPermitted,false);assert.equal(inspectFinding(f,history,result.findings,time).qualityFailures.length,0);
 const projection=generalProjection(f,history,internalSpec(),'ctx',time,result.findings);assert.equal(projection.material.operatorTaskDueAt,'2026-11-04T12:00:00.000Z');assert.ok(projection.material.sourceTimingConstraints.every(t=>t.taskDeadline===false));
});
test('ST07 preserves historical decision window and verifies interest, never making an operator due date a customer deadline',async()=>{
 const {history,result}=await corrected('ST07'),f=result.findings[0],p=generalProjection(f,history,internalSpec(),'ctx',time,result.findings);
 assert.match(p.payload.properties.hs_task_body,/2026-10-26T14:00:00Z/);assert.match(p.payload.properties.hs_task_body,/current interest/);assert.ok(p.material.sourceTimingConstraints.some(t=>t.wording==='this week'&&t.status==='HISTORICAL_NOT_RENEWED'&&!t.taskDeadline));assert.equal(p.material.customerActionPermitted,false);
 assert.throws(()=>generalProjection(f,history,{...internalSpec(),actionPurpose:'internal_preparation',intent:'prepare_quote'},'ctx',time,result.findings),/verification_required/);
});
test('ST08 internal verification is preparable before completion, while customer follow-up remains blocked',async()=>{
 const {history,result}=await corrected('ST08'),f=result.findings[0],p=generalProjection(f,history,internalSpec(),'ctx',time,result.findings);
 assert.match(p.payload.properties.hs_task_body,/current consent/);assert.match(p.payload.properties.hs_task_body,/Customer follow-up remains conditional/);assert.ok(p.material.customerActionGates.some(g=>g.code==='deferred_event_requires_source_confirmation'));assert.equal(p.material.customerActionPermitted,false);
 assert.throws(()=>generalProjection(f,history,{...internalSpec(),actionPurpose:'customer_action'},'ctx',time,result.findings),/not_authorized/);
 const legacy={...internalSpec(),intent:'deferred_follow_up',timing:{kind:'none'}};delete legacy.actionPurpose;assert.throws(()=>generalProjection(f,history,legacy,'ctx',time,result.findings),/event_unverified/);
});
test('EN11 pricing does not inherit lighting deferral; each independent need retains its own evidence and gates',async()=>{
 const {history,result}=await corrected('EN11');assert.equal(result.findings.length,2);
 const pricing=result.findings.find(f=>f.opportunityKey==='surge-protection'),lighting=result.findings.find(f=>f.opportunityKey==='pendant-lighting');
 assert.equal(pricing.proposedAction.actionPurpose,'internal_preparation');assert.equal(pricing.proposedAction.material.customerActionGates.length,0);assert.equal(lighting.proposedAction.actionPurpose,'internal_verification');assert.ok(lighting.proposedAction.material.customerActionGates.length);
 const p=generalProjection(pricing,history,internalSpec('internal_preparation'),'ctx',time,result.findings),l=generalProjection(lighting,history,internalSpec(),'ctx',time,result.findings);
 assert.doesNotMatch(p.payload.properties.hs_task_body,/pendant|renovation|whole.home|two lights/i);assert.match(l.payload.properties.hs_task_body,/renovation/);assert.notEqual(pricing.findingId,lighting.findingId);
});
test('EN12 retains separate recovery verification and EV pricing only; no charger type or consultation added',async()=>{
 const {history,result}=await corrected('EN12');const recovery=result.findings.find(f=>f.opportunityType==='retention'),pricing=result.findings.find(f=>f.opportunityType==='cross-sell');
 assert.equal(recovery.proposedAction.actionPurpose,'internal_verification');assert.equal(pricing.proposedAction.actionPurpose,'internal_preparation');assert.doesNotMatch(pricing.proposedAction.actionPayload.properties.hs_task_body,/assessment|consultation|Level 2|flickering/i);assert.match(recovery.proposedAction.actionPayload.properties.hs_task_body,/current status/);assert.doesNotThrow(()=>generalProjection(pricing,history,internalSpec('internal_preparation'),'ctx',time,result.findings));
});
test('internal verification cannot hide omitted evidence, free-form overrides, or material authority tampering',async()=>{
 const {history,result}=await corrected('ST04'),f=result.findings[0];const incomplete={...f,evidence:f.evidence.filter(e=>!e.quote.includes('invoice'))};assert.throws(()=>generalProjection(incomplete,history,internalSpec(),'ctx',time,[incomplete]),/quality_blocked/);
 assert.throws(()=>generalProjection(f,history,{...internalSpec(),timing:{kind:'internal_task',completionEvidenceRef:'made-up'}},'ctx',time,result.findings),/must_not_override/);
 const p=generalProjection(f,history,internalSpec(),'ctx',time,result.findings);assert.throws(()=>materialExecutable({...p.material,customerActionPermitted:true},time),/authority/);assert.throws(()=>materialExecutable({...p.material,operatorTaskDueAt:null},time),/due_date/);
});
test('new proposal versions are stable for unchanged sources and remain unapproved drafts without a due time',async()=>{
 const {history,result}=await corrected('EN12');const raw={findings:result.findings.map(({findingId,proposedAction,...f})=>f)};const next=await materializeCorrected(raw,history,'synthetic:EN12','2026-11-03T18:00:00.000Z');
 assert.equal(result.proposalVersion,'internal-task-proposal-v2.1');assert.equal(REVIEW_POLICY,'finding-review-v2.4');assert.deepEqual(result.findings.map(f=>f.proposedAction.actionVersion),next.findings.map(f=>f.proposedAction.actionVersion));
 for(const f of result.findings){assert.equal(f.proposedAction.executionBlocked,true);assert.equal(f.proposedAction.material.operatorTaskDueAt,null);assert.equal(f.proposedAction.authorityRequirements.humanApprovalRequired,true);assert.throws(()=>materialExecutable(f.proposedAction.material,time),/due_date/);}
});

test('explicit absolute customer dates cannot be hidden by an internal pricing preparation date',async()=>{
 for(const date of ['2023-04-18','2026-12-01']){
  const text='Customer requests pricing for a surge protector by '+date+'.',h=await prepareHistory({serviceHistory:[{timestamp:'2026-10-30T10:00:00Z',note:text}]});
  const f={opportunityKey:'surge-protector',classification:'strong cross-sell opportunity',opportunityType:'cross-sell',confidence:'high',humanReviewRequired:true,evidence:[{noteId:h[0].noteId,quote:text}],reasoningSummary:'Synthetic pricing request.',recommendedNextAction:'Internally verify current interest and the explicit source timing.'};
  const r=await materializeCorrected({findings:[f]},h,'synthetic:absolute',time);assert.equal(r.findings[0].proposedAction.actionPurpose,'internal_verification');assert.ok(r.findings[0].proposedAction.material.sourceTimingConstraints.some(t=>t.wording.includes(date)));
  assert.throws(()=>generalProjection(r.findings[0],h,internalSpec('internal_preparation'),'ctx',time,r.findings),/verification_required/);
 }
});

test('fresh UV14 evidence omission remains immutable and blocks preparation even when pricing wording is bounded',async()=>{
 const capture=JSON.parse(await readFile('fixtures/semantic-correction-uv14-omission-v1.json','utf8')),history=await prepareHistory(capture.context),f=capture.capturedRow.actual.findings[0];
 assert.equal(capture.humanVerdict,null);assert.equal(capture.modelFailureNotRepairedOrRelabeled,true);
 assert.ok(!f.evidence.some(e=>e.quote.includes('Do not schedule an assessment')));
 assert.ok(inspectFinding(f,history,[f],time).qualityFailures.some(q=>q.code===capture.expectedBlock));
 assert.equal(f.proposedAction.preparationBlocked,true);assert.equal(f.proposedAction.executionBlocked,true);
 assert.throws(()=>generalProjection(f,history,internalSpec('internal_preparation'),'synthetic:UV14',time,[f]),/quality_blocked/);
});
