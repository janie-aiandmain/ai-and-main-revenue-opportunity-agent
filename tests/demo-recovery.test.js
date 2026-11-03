import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {DemoRecoveryLedger,DEMO_CONTRACT,hash} from '../src/demo/recovery-ledger.js';
import {demoFetch} from '../src/demo/worker.js';
import {exactTaskMatch,PORTAL,CONTACT,MARKER} from '../src/demo/hubspot.js';
const runId='demo-11111111-1111-4111-8111-111111111111';
const due=()=>new Date(Date.now()+86400000).toISOString();
function setup(){const db=new DatabaseSync(':memory:');const adapter={exec:q=>db.exec(q),prepare:q=>db.prepare(q),transaction(fn){db.exec('BEGIN IMMEDIATE');try{const v=fn();db.exec('COMMIT');return v;}catch(e){db.exec('ROLLBACK');throw e;}}};let ledger=new DemoRecoveryLedger(adapter);ledger.initialize(runId);return {db,adapter,get ledger(){return ledger;},restart(){ledger=new DemoRecoveryLedger(adapter);ledger.initialize(runId);return ledger;}};}
const prepare=(l,caseId='NORMAL',extra={})=>l.prepare({caseId,dueAt:due(),sourceHash:hash('source'),...extra});
const binding=o=>({operationId:o.operationId,payloadHash:o.payloadHash,actionVersion:o.actionVersion,sourceHash:o.sourceHash,revision:o.revision});
const begin=(l,o,g,extra={})=>l.begin({...binding(o),approvalId:g.approvalId,...extra});
test('durable operation/correlation/full-payload approval precede one submission and survive restart',()=>{
 const s=setup();try{const o=prepare(s.ledger,'LOSS'),a=s.ledger.approve(binding(o));s.ledger.armFault(o.operationId);const sent=begin(s.ledger,o,a);assert.equal(sent.mode,'CREATE_ONCE');assert.equal(hash(sent.request),o.payloadHash);assert.equal(sent.state,'SENDING');assert.ok(sent.trace.some(t=>t.event==='SUBMISSION_INTENT_DURABLY_PERSISTED'));const boot=sent.bootId;s.restart();const recovered=s.ledger.status(o.operationId);assert.notEqual(recovered.bootId,boot);assert.equal(recovered.state,'UNKNOWN');assert.equal(recovered.remoteTaskId,null);assert.equal(recovered.createAttempts,1);assert.equal(begin(s.ledger,o,a).mode,'RECONCILE_ONLY');assert.ok(recovered.trace.some(t=>t.event==='RESTART_RECOVERED_UNCERTAIN_NO_CREATE'));}finally{s.db.close();}
});
test('changed payload or source and A-B-A cannot reuse a prior approval',()=>{
 const s=setup();try{const o=prepare(s.ledger,'CHANGED'),a=s.ledger.approve(binding(o));const changed=prepare(s.ledger,'CHANGED',{dueAt:o.request.body.properties.hs_timestamp,priority:'HIGH'});assert.notEqual(changed.payloadHash,o.payloadHash);assert.throws(()=>begin(s.ledger,changed,a),/stale/);const again=prepare(s.ledger,'CHANGED',{dueAt:o.request.body.properties.hs_timestamp});assert.equal(again.payloadHash,o.payloadHash);assert.throws(()=>begin(s.ledger,again,a),/stale/);const grant=s.ledger.approve(binding(again));assert.throws(()=>begin(s.ledger,again,grant,{sourceHash:hash('edited source')}),/stale/);assert.equal(s.ledger.summary().totalCreateAttempts,0);}finally{s.db.close();}
});
test('payload corruption and association/due/priority changes are covered by the exact request hash',()=>{
 const s=setup();try{const o=prepare(s.ledger),a=s.ledger.approve(binding(o));for(const change of [r=>r.body.associations[0].to.id='other',r=>r.body.properties.hs_timestamp=due(),r=>r.body.properties.hs_task_body+='x',r=>r.body.properties.hs_task_priority='HIGH']){const r=structuredClone(o.request);change(r);if(JSON.stringify(r)===JSON.stringify(o.request))continue;assert.notEqual(hash(r),o.payloadHash);}s.db.prepare('UPDATE demo_ops SET request=? WHERE id=?').run(JSON.stringify({...o.request,portalId:'other'}),o.operationId);assert.throws(()=>begin(s.ledger,o,a),/stale/);assert.equal(s.ledger.summary().totalCreateAttempts,0);}finally{s.db.close();}
});
test('unknown absent/ambiguous/mismatched outcomes never create again; close and budget are durable',()=>{
 const s=setup();try{for(const id of ['NORMAL','LOSS','CHANGED']){const o=prepare(s.ledger,id),a=s.ledger.approve(binding(o));begin(s.ledger,o,a);for(const candidates of [0,1,2]){assert.equal(s.ledger.reconciled({operationId:o.operationId,candidates,matchedTaskId:null}).state,'UNKNOWN');assert.equal(begin(s.ledger,o,a).mode,'RECONCILE_ONLY');}assert.throws(()=>prepare(s.ledger,id,{priority:'HIGH'}),/reconciliation/);}assert.equal(s.ledger.summary().totalCreateAttempts,3);s.ledger.close();s.restart();assert.equal(s.ledger.summary().closed,true);assert.throws(()=>prepare(s.ledger),/closed/);}finally{s.db.close();}
});
test('all seven semantic cases remain unavailable to synthetic-control preparation',()=>{const s=setup();try{for(const id of ['ST03','ST04','ST07','ST08','EN11','EN12','EN31'])assert.throws(()=>prepare(s.ledger,id),/seven_reviews/);assert.equal(s.ledger.summary().totalCreateAttempts,0);}finally{s.db.close();}});
test('task readback requires all approved properties, correlation and exactly the designated contact',()=>{const s=setup();try{const o=prepare(s.ledger);const t={id:'task',properties:{...o.request.body.properties},associations:{contacts:{results:[{id:CONTACT}]}}};assert.equal(exactTaskMatch(t,o.request,o.correlation),true);for(const bad of [{...t,properties:{...t.properties,hs_task_priority:'HIGH'}},{...t,associations:{contacts:{results:[{id:'other'}]}}},{...t,associations:{contacts:{results:[{id:CONTACT},{id:'other'}]}}},{...t,associations:{contacts:{results:[{id:CONTACT}],paging:{next:{after:'2'}}}}}])assert.equal(exactTaskMatch(bad,o.request,o.correlation),false);}finally{s.db.close();}});
test('actual HTTP controller verifies both identities/marker, drops success before ledger records it, and reconciles without another POST',async t=>{
 const s=setup(),tasks=[];let posts=0,wrongWriter=false;
 const env={CRM_WRITEBACK_ENABLED:'false',ENABLE_TEST_TASK_WRITES:'false',ENABLE_GENERAL_EXECUTION:'false',GENERAL_RELEASE_APPROVED:'false',DEMO_RECOVERY_ENABLED:'true',DEMO_RECOVERY_EXECUTION_ENABLED:'true',DEMO_RECOVERY_FAULT_ENABLED:'true',DEMO_RECOVERY_CAPABILITY:'synthetic-capability',DEMO_RECOVERY_RUN_ID:runId,DEMO_RECOVERY_EXPIRES_AT:due(),HUBSPOT_ACCESS_TOKEN:'synthetic-reader',HUBSPOT_WRITE_TOKEN:'synthetic-writer'};
 env.DEMO_RECOVERY_LEDGER={idFromName:x=>x,get(){return {async fetch(request){const input=await request.json();assert.equal(input.contract,DEMO_CONTRACT);try{return Response.json(s.ledger.dispatch(input));}catch(e){return Response.json({status:e.message},{status:409});}}};}};
 t.mock.method(globalThis,'fetch',async(url,options={})=>{
  const u=new URL(url);assert.equal(u.hostname,'api.hubapi.com');
  if(u.pathname==='/account-info/v3/details')return Response.json({portalId:wrongWriter&&options.headers.Authorization==='Bearer synthetic-writer'?'999':PORTAL});
  if(u.pathname==='/crm/v3/objects/contacts/'+CONTACT)return Response.json({id:CONTACT,properties:{firstname:MARKER}});
  if(options.method==='POST'){posts++;assert.equal(s.ledger.summary().totalCreateAttempts,posts);assert.equal(s.ledger.summary().operations.find(o=>o.state==='SENDING').attempts,1);tasks.push({id:'real-fixture-task-'+posts,properties:JSON.parse(options.body).properties,associations:{contacts:{results:[{id:CONTACT}]}}});return Response.json({id:tasks.at(-1).id},{status:201});}
  if(u.pathname==='/crm/v3/objects/tasks')return Response.json({results:tasks});
  return Response.json(tasks.find(x=>u.pathname.endsWith('/'+x.id)));
 });
 const call=async(action,body={},token=env.DEMO_RECOVERY_CAPABILITY)=>{const r=await demoFetch(new Request('https://demo/demo-recovery/'+action,{method:'POST',headers:{'content-type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)}),env);return {status:r.status,data:await r.json()};};
 try{
  assert.equal((await call('summary',{},null)).status,403);wrongWriter=true;assert.equal((await call('preflight')).data.status,'write_credential_portal_mismatch');assert.equal(posts,0);wrongWriter=false;
  const o=(await call('prepare',{caseId:'LOSS',dueAt:due()})).data;const a=(await call('approve',binding(o))).data;
  env.DEMO_RECOVERY_FAULT_ENABLED='false';assert.equal((await call('arm-fault',{operationId:o.operationId})).status,503);env.DEMO_RECOVERY_FAULT_ENABLED='true';await call('arm-fault',{operationId:o.operationId});
  const lost=await call('execute',{...binding(o),approvalId:a.approvalId});assert.equal(lost.status,503);assert.equal(lost.data.kind,'INJECTED_APPLICATION_RESPONSE_LOSS_NOT_NETWORK_OUTAGE');assert.equal(s.ledger.status(o.operationId).remoteTaskId,null);assert.equal(s.ledger.status(o.operationId).state,'SENDING');assert.equal(posts,1);
  s.restart();const recovered=await call('reconcile',{operationId:o.operationId});assert.equal(recovered.data.state,'CONFIRMED');assert.equal(recovered.data.remoteTaskId,tasks[0].id);assert.equal(posts,1);
  env.DEMO_RECOVERY_EXECUTION_ENABLED='false';assert.equal((await call('execute',{...binding(o),approvalId:a.approvalId})).data.state,'CONFIRMED');assert.equal(posts,1);
  tasks.push({...tasks[0],id:'ambiguous-extra',properties:{...tasks[0].properties,hs_task_priority:'HIGH'}});assert.equal((await call('reconcile',{operationId:o.operationId})).data.state,'UNKNOWN');assert.equal(posts,1);
 }finally{s.db.close();}
});

test('failed source checks revoke approval even if the marker/source later returns to its original value',()=>{const s=setup();try{const o=prepare(s.ledger),a=s.ledger.approve(binding(o));s.ledger.invalidate(o.operationId,'fresh_marker_failed');const same=prepare(s.ledger,'NORMAL',{dueAt:o.request.body.properties.hs_timestamp});assert.equal(same.payloadHash,o.payloadHash);assert.throws(()=>begin(s.ledger,same,a),/stale/);assert.equal(s.ledger.summary().totalCreateAttempts,0);}finally{s.db.close();}});
