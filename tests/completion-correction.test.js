import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {prepareHistory} from '../src/findings.js';
import {materializeCorrected} from '../src/release/reasoning.js';
import {generalProjection} from '../src/staging/review-policy.js';
import {documentedCompletion} from '../src/staging/completion-policy.js';
import {materialExecutable} from '../src/correction-policy-v2.js';
import {createHash} from 'node:crypto';
const captured=JSON.parse(await readFile('fixtures/documented-completion-captured-variation-v1.json','utf8'));
const time='2026-11-11T12:00:00Z';
const raw=f=>Object.fromEntries(Object.entries(f).filter(([k])=>!['findingId','proposedAction'].includes(k)));
const spec={actionPurpose:'internal_verification',intent:'verify_current_state',priority:'MEDIUM',timing:{kind:'internal_task'},taskDueAt:'2026-11-12T12:00:00Z',attestations:{sourceRead:true,evidenceComplete:true,scopeBounded:true,timingVerified:true}};
test('all three captured UV11 variants retain documented completion but require current-interest verification',async()=>{
 const history=await prepareHistory(captured.case.context);
 for(const old of captured.capturedVariants){
  const r=await materializeCorrected({findings:old.actual.findings.map(raw)},history,'synthetic:UV11',time),f=r.findings[0],p=f.proposedAction;
  assert.equal(p.actionPurpose,'internal_verification');
  assert.equal(f.classification,'strong cross-sell opportunity');assert.equal(f.opportunityType,'cross-sell');
  assert.equal(p.material.documentedCompletion.sourceTimestamp,'2025-02-13T10:00:00Z');
  assert.match(f.recommendedNextAction,/verify current interest/i);
  assert.match(f.recommendedNextAction,/documented renovation completion/);
  assert.ok(p.material.sourceTimingConstraints.some(t=>t.wording==='now'&&t.status==='HISTORICAL_NOT_RENEWED'&&!t.taskDeadline));
  assert.ok(p.material.customerActionGates.some(g=>g.code==='current_interest_requires_source_confirmation'&&!g.satisfiedByInternalVerification));
  assert.ok(!p.material.customerActionGates.some(g=>g.code==='deferred_event_requires_source_confirmation'));
  assert.equal(p.material.customerActionPermitted,false);assert.equal(p.executionBlocked,true);
  assert.throws(()=>generalProjection(f,history,{...spec,actionPurpose:'internal_preparation',intent:'prepare_quote'},'synthetic:UV11',time,r.findings),/verification_required/);
 }
});

const completion='Customer confirms the renovation is complete and asks for pendant-light pricing now.';
const deferral='Customer wanted pendant-light follow-up after the renovation was complete.';
async function sample(notes){
 const history=await prepareHistory({serviceHistory:notes.map((n,i)=>({noteId:'n'+i,timestamp:i?'2025-02-13T10:00:00Z':'2025-02-12T10:00:00Z',...(typeof n==='string'?{note:n}:n)}))});
 const finding={opportunityKey:'pendant-light-pricing',classification:'follow-up revenue opportunity',opportunityType:'follow-up',confidence:'high',evidence:history.map(n=>({noteId:n.noteId,quote:n.note})),reasoningSummary:'Synthetic dated request.',recommendedNextAction:'Internal verification only. No customer action.',humanReviewRequired:true};
 return {history,finding,result:await materializeCorrected({findings:[finding]},history,'synthetic:completion-variation',time)};
}
test('missing, third-party, negated or conditional completion does not clear the renovation gate',async()=>{
 for(const text of [null,'Technician thinks the renovation is complete and asks for pendant-light pricing now.','Customer confirms the renovation is not complete and asks for pendant-light pricing now.','Customer says if the renovation is complete, request pendant-light pricing.']){
  const {result}=await sample(text?[deferral,text]:[deferral]),p=result.findings[0].proposedAction;
  assert.equal(p.actionPurpose,'internal_verification');assert.equal(p.material.documentedCompletion,undefined);
  assert.ok(p.material.customerActionGates.some(g=>g.code==='deferred_event_requires_source_confirmation'));
  assert.equal(p.material.customerActionPermitted,false);
 }
});
test('unseen direct customer completion phrasings retain the fact without inferring current interest',async()=>{
 for(const text of ['Client reports their remodel has been finished and requests pendant-light pricing now.','Homeowner confirms the renovation was done and asks for pendant-light pricing now.','Customer reports their renovation is completed and requests a pendant-light quote now.']){
  const {result}=await sample([deferral,text]),p=result.findings[0].proposedAction;
  assert.equal(p.material.documentedCompletion.quote,text);
  assert.equal(p.material.documentedCompletion.status,'DOCUMENTED_AT_SOURCE_NOT_CURRENT_CONSENT');
  assert.equal(p.actionPurpose,'internal_verification');assert.equal(p.material.customerActionPermitted,false);
  assert.ok(!p.material.customerActionGates.some(g=>g.code==='deferred_event_requires_source_confirmation'));
 }
});
test('completion for another need or completion older than deferral cannot satisfy the finding gate',async()=>{
 for(const notes of [[deferral,completion.replace('pendant-light','panel')],[completion,deferral]]){
  const {result}=await sample(notes),p=result.findings[0].proposedAction;
  assert.equal(p.material.documentedCompletion,undefined);
  assert.ok(p.material.customerActionGates.some(g=>g.code==='deferred_event_requires_source_confirmation'));
  assert.equal(p.actionPurpose,'internal_verification');
 }
});
test('a later contradictory or ambiguous renovation statement prevents automatic completion resolution',async()=>{
 const {history,finding}=await sample([deferral,completion]);
 for(const text of ['Customer reports renovation work has restarted.','Renovation status needs checking.','Customer no longer wants pendant-light pricing.']){
  assert.equal(documentedCompletion(finding,[...history,{noteId:'newer',timestamp:'2025-02-14T10:00:00Z',note:text}],time),null);
 }
});
test('future or uncited completion cannot supply a current-interest verification fact',async()=>{
 const {history,finding}=await sample([deferral,completion]);
 const oldOnly={...finding,evidence:[finding.evidence[0]]};assert.equal(documentedCompletion(oldOnly,history,time),null);
 const future=history.map(n=>n.noteId==='n1'?{...n,timestamp:'2027-02-13T10:00:00Z'}:n);
 assert.equal(documentedCompletion(finding,future,time),null);
 await assert.rejects(materializeCorrected({findings:[finding]},future,'synthetic:future',time),/future_source/);
});
test('old now is source-relative timing even without renovation wording and cannot become pricing preparation',async()=>{
 const {result,history}=await sample(['Customer requests pendant-light pricing now.']),f=result.findings[0];
 assert.equal(f.proposedAction.actionPurpose,'internal_verification');
 assert.match(f.recommendedNextAction,/historical, not renewed/);
 assert.throws(()=>generalProjection(f,history,{...spec,actionPurpose:'internal_preparation',intent:'prepare_quote'},'ctx',time,result.findings),/verification_required/);
});
test('EN30 chronological now requests is not misread as an urgent customer deadline',async()=>{
 const {result}=await sample(['Customer now requests pricing for surge protection and asks for a quote.']);
 const p=result.findings[0].proposedAction;
 assert.equal(p.actionPurpose,'internal_preparation');
 assert.equal(p.material.sourceTimingConstraints.length,0);
 assert.equal(p.material.customerActionPermitted,false);
});
test('policy and final material changes require new versions; old internal policy or customer authority is rejected',async()=>{
 const {result,history}=await sample([deferral,completion]),f=result.findings[0];
 const final=generalProjection(f,history,spec,'ctx',time,result.findings);
 assert.equal(final.material.customerActionPermitted,false);
 assert.throws(()=>materialExecutable({...final.material,policyVersion:'internal-task-policy-v1.2'},time),/invalid_internal_task_authority/);
 assert.throws(()=>materialExecutable({...final.material,customerActionPermitted:true},time),/invalid_internal_task_authority/);
});
test('original fixtures, provider captures and human decisions remain byte-for-byte unchanged',async()=>{
 const protectedFiles=JSON.parse(await readFile('docs/review/completion-correction/preserved-evidence-sha256.json','utf8'));
 for(const [file,expected]of Object.entries(protectedFiles))assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),expected,file);
 const name='fixtures/documented-completion-captured-variation-v1.json';
 const expected=(await readFile(name.replace('.json','.sha256'),'utf8')).split(' ')[0];
 assert.equal(createHash('sha256').update(await readFile(name)).digest('hex'),expected);
});
