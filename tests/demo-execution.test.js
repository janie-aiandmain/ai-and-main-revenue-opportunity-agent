// Offline simulated actors only; signature checks have separate gateway tests.
import {GeneralFindingLedger} from '../src/staging/general-ledger.js';
import {materializeCorrected} from '../src/release/reasoning.js';
import {prepareHistory} from '../src/findings.js';
import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';
import {StagingOperationLedger} from '../src/staging/operation-ledger.js';import {demoExecution} from '../src/release/demo-execution.js';
const actor={role:'Approver',subject:'synthetic-verified-test-actor',kind:'EXTERNAL_VERIFIED'};
const env=()=>({DEPLOYMENT_ENVIRONMENT:'staging',CERTIFICATION_MODE:'remote-demo',CRM_WRITEBACK_ENABLED:'false',ENABLE_GENERAL_EXECUTION:'false',GENERAL_RELEASE_APPROVED:'false',ENABLE_TEST_TASK_WRITES:'false',STAGING_PORTAL_ID:'247646122',STAGING_CONTACT_ID:'582095692487',DEMO_ONLY_EXECUTION_ENABLED:'true',DEMO_RESPONSE_LOSS_TEST_ENABLED:'true',DEMO_RELEASE_RUN_ID:'release-11111111-1111-4111-8111-111111111111',DEMO_RELEASE_MAX_CREATES:'1',DEMO_RELEASE_EXPIRES_AT:new Date(Date.now()+3600000).toISOString(),executionActor:actor});
async function lab(fn,Type=StagingOperationLedger){const raw=new DatabaseSync(':memory:'),db={exec:q=>raw.exec(q),prepare:q=>raw.prepare(q),transaction:fn=>{raw.exec('BEGIN IMMEDIATE');try{const r=fn();raw.exec('COMMIT');return r;}catch(e){raw.exec('ROLLBACK');throw e;}}};try{await fn(new Type(db,env()));}finally{raw.close();}}
const prepare=(l,e,id='CONTROL')=>l.prepare({fixtureId:id,dueAt:new Date(Date.now()+86400000).toISOString()},e);
const task=op=>({id:'synthetic-task-1',properties:op.finalRequest.body.properties,associations:{contacts:{results:[{id:'582095692487'}]}}});
test('synthetic execution is disabled by default, exact-record only and cannot enable general flags',()=>{
 assert.equal(demoExecution({...env(),DEMO_ONLY_EXECUTION_ENABLED:'false'}),null);
 for(const patch of [{CERTIFICATION_MODE:'remote-single-tenant'},{STAGING_CONTACT_ID:'other'},{ENABLE_GENERAL_EXECUTION:'true'},{GENERAL_RELEASE_APPROVED:'true'},{DEMO_RELEASE_MAX_CREATES:'4'},{DEMO_RELEASE_EXPIRES_AT:new Date(Date.now()-1).toISOString()}])assert.throws(()=>demoExecution({...env(),...patch}));
});
test('synthetic label is inside the approved hash; durable budget prevents another opportunity or repeat from creating again',()=>lab(async l=>{
 const e=env(),op=await prepare(l,e),grant=l.approve(op.operationId,op.payloadHash,actor);assert.match(op.finalRequest.body.properties.hs_task_subject,/SYNTHETIC DEMO/);let posts=0;
 const client={async verifyIsolation(){},async create(){posts++;return{id:'synthetic-task-1'};},async lookup(){return[task(op)];}};
 assert.equal((await l.execute(op.operationId,grant.approvalId,client,e)).state,'CONFIRMED');await l.execute(op.operationId,grant.approvalId,client,e);assert.equal(posts,1);assert.equal(l.status(op.operationId).demoCreateAttempts,1);
 const other=await prepare(l,e,'CONTROL_CHANGED'),otherGrant=l.approve(other.operationId,other.payloadHash,actor);await assert.rejects(l.execute(other.operationId,otherGrant.approvalId,client,e),/budget_exhausted/);assert.equal(posts,1);
}));
test('injected loss persists intent with no remote ID; disabled execution can still reconcile read-only without another create',()=>lab(async l=>{
 const e=env(),op=await prepare(l,e),grant=l.approve(op.operationId,op.payloadHash,actor);l.db.prepare('INSERT INTO release_demo_faults(operation_id,payload_hash) VALUES(?,?)').run(op.operationId,op.payloadHash);let posts=0;
 const client={async verifyIsolation(){},async create(){posts++;return{id:'synthetic-task-1'};},async restartAfterInjectedLoss(){throw Error('synthetic_restart_transport_termination');},async lookup(){return[task(op)];}};
 const unknown=await l.execute(op.operationId,grant.approvalId,client,e);assert.equal(unknown.state,'UNKNOWN');assert.equal(unknown.remoteTaskId,null);assert.equal(posts,1);assert.ok(unknown.trace.some(t=>t.event==='INJECTED_CREATE_RESPONSE_DISCARDED_BEFORE_SUCCESS_NOT_NETWORK_OUTAGE'));
 const recovered=await l.reconcileRemote(op.operationId,client);assert.equal(recovered.remoteTaskId,'synthetic-task-1');assert.equal(recovered.state,'CONFIRMED');assert.equal(recovered.demoCreateAttempts,1);assert.equal(posts,1);
}));
test('response-loss arming binds the exact approved general finding, identity and complete final payload',()=>lab(async l=>{
 const e=env(),context={serviceHistory:[{noteId:'demo-source',timestamp:'2026-11-01T12:00:00Z',note:'Customer requests charger pricing. No site visits.'}]};
 const source={async readContext(){return context;}},raw={findings:[{opportunityKey:'charger-pricing',classification:'strong cross-sell opportunity',opportunityType:'cross-sell',confidence:'high',evidence:[{noteId:'demo-source',quote:'Customer requests charger pricing.'}],reasoningSummary:'Synthetic request.',recommendedNextAction:'Internal pricing preparation only.',humanReviewRequired:true}]};const reason=async(c,key)=>materializeCorrected(raw,await prepareHistory(c),key);
 const [finding]=await l.evaluate(e,source,reason),input={findingId:finding.findingId,sourceHash:finding.sourceHash,candidateHash:finding.candidateHash,decision:'REVIEW',attestHumanReview:true,spec:{actionPurpose:'internal_preparation',intent:'prepare_quote',priority:'MEDIUM',timing:{kind:'internal_task'},taskDueAt:new Date(Date.now()+86400000).toISOString(),attestations:{sourceRead:true,evidenceComplete:true,scopeBounded:true,timingVerified:true}}};const review=l.finishReview(input,actor,await l.review(input,actor,e,source),e),grant=l.approveGeneral(review,actor);
 assert.throws(()=>l.armDemoResponseLoss({operationId:review.operationId,approvalId:grant.approvalId},{...actor,subject:'other'},e),/identity_changed/);
 const armed=l.armDemoResponseLoss({operationId:review.operationId,approvalId:grant.approvalId},actor,e);assert.equal(armed.demoCreateAttempts,0);assert.ok(armed.trace.some(t=>t.event==='OPERATOR_ARMED_SYNTHETIC_RESPONSE_LOSS'));
 l.db.prepare("UPDATE cert_operations SET payload_json='{}' WHERE id=?").run(review.operationId);assert.throws(()=>l.armDemoResponseLoss({operationId:review.operationId,approvalId:grant.approvalId},actor,e),/integrity/);
},GeneralFindingLedger));
