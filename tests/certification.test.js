import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { StagingOperationLedger, digest } from '../src/staging/operation-ledger.js';
import { HubSpotCertificationClient, taskMatches } from '../src/staging/hubspot-client.js';
import application from '../src/index.js';

const env = { DEPLOYMENT_ENVIRONMENT:'staging', CRM_WRITEBACK_ENABLED:'false',
  ENABLE_TEST_TASK_WRITES:'true', CERTIFICATION_MODE:'local',
  STAGING_PORTAL_ID:'test-portal-001', STAGING_CONTACT_ID:'fixture-contact-001',
  LOCAL_HUBSPOT_FIXTURE_URL:'http://127.0.0.1:1',
  STAGING_HUBSPOT_READ_TOKEN:'synthetic-read', STAGING_HUBSPOT_WRITE_TOKEN:'synthetic-write' };
const actor = { role:'Approver', subject:'synthetic-approver', kind:'LOCAL_SYNTHETIC' };
const due = () => new Date(Date.now() + 7200000).toISOString();
function lab(fn) {
  const db = new DatabaseSync(':memory:');
  const adapter = {exec:q=>db.exec(q), prepare:q=>db.prepare(q), close:()=>db.close(),
    transaction(fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}};
  const ledger = new StagingOperationLedger(adapter);
  return Promise.resolve().then(()=>fn(ledger)).finally(()=>db.close());
}
async function prepared(l) {
  const op=await l.prepare({fixtureId:'CONTROL',dueAt:due()},env);
  return {op,grant:l.approve(op.operationId,op.payloadHash,actor)};
}
const receipt = (op,id='fixture-task-1') => ({id, properties:op.finalRequest.body.properties,
  associations:{contacts:{results:[{id:env.STAGING_CONTACT_ID}]}}});

test('immutable seven-case snapshot preserves all original captures and pending human verdicts',async()=>{
  const bytes=await readFile('fixtures/certification-failures-v1.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),(await readFile('fixtures/certification-failures-v1.sha256','utf8')).trim());
  const snapshot=JSON.parse(bytes),sourceBytes=await readFile('docs/validation/findings-v0.2-five-runs.json');
  assert.equal(createHash('sha256').update(sourceBytes).digest('hex'),snapshot.sourceCaptureSha256);
  const source=JSON.parse(sourceBytes),reviews=JSON.parse(await readFile('docs/correction/semantic-review.json','utf8'));
  assert.deepEqual(snapshot.cases.map(c=>c.id),['ST03','ST04','ST07','ST08','EN11','EN12','EN31']);
  for(const c of snapshot.cases){
    assert.deepEqual(c.capturedExecutions,source.rows.filter(r=>r.id===c.id));
    assert.deepEqual(c.originalAssistantReview,reviews.cases.find(r=>r.id===c.id));
    assert.equal(c.humanReview.status,'PENDING');assert.equal(c.humanReview.verdict,null);
    assert.ok(c.requiredCorrectionOrBlock.length);assert.equal(c.executionStatus,'BLOCKED_PENDING_HUMAN_REVIEW');
    await lab(async l=>{await assert.rejects(l.prepare({fixtureId:c.id,dueAt:due(),humanReview:{status:'PASS'}},env),new RegExp('human_review_pending:'+c.id));assert.equal(l.metrics().confirmedTaskCount,0);});
  }
});

test('full final request hashing includes associations, correlation, due date and every property',async()=>lab(async l=>{
  const {op}=await prepared(l),base=op.finalRequest;
  assert.equal(digest(base),op.payloadHash);assert.match(op.actionVersion,/^final-action-v1:sha256:/);
  for(const change of [r=>{r.body.associations[0].to.id='other';},r=>{r.body.properties.hs_timestamp=due();r.body.properties.hs_timestamp+='x';},r=>{r.body.properties.hs_task_priority='HIGH';},r=>{r.body.properties.hs_task_body+='changed';},r=>{r.body.properties.hubspot_owner_id='owner';},r=>{r.portalId='other';}]){
    const mutated=structuredClone(base);change(mutated);assert.notEqual(digest(mutated),op.payloadHash);
  }
  assert.match(base.body.properties.hs_task_body,new RegExp(op.correlation));
  assert.deepEqual(base.body.associations[0].types,[{associationCategory:'HUBSPOT_DEFINED',associationTypeId:204}]);
}));

test('payload A-B-A invalidates old grants using monotonically increasing revision',async()=>lab(async l=>{
  const {op,grant}=await prepared(l),oldDue=op.finalRequest.body.properties.hs_timestamp;
  await l.prepare({fixtureId:'CONTROL',dueAt:new Date(Date.parse(oldDue)+3600000).toISOString()},env);
  const again=await l.prepare({fixtureId:'CONTROL',dueAt:oldDue},env);
  assert.equal(again.payloadHash,op.payloadHash);assert.ok(again.revision>op.revision);
  await assert.rejects(l.execute(op.operationId,grant.approvalId,{verifyIsolation(){throw Error('must_not_call');}},env),/not_approved|stale/);
}));

test('immediate pre-POST verification rejects a payload edited while isolation reads were in flight',async()=>lab(async l=>{
  const {op,grant}=await prepared(l);let posts=0;
  const client={async verifyIsolation(){const mutated=structuredClone(op.finalRequest);mutated.body.properties.hs_task_body+='unauthorized';l.db.prepare('UPDATE cert_operations SET payload_json=? WHERE id=?').run(JSON.stringify(mutated),op.operationId);},async create(){posts++;}};
  await assert.rejects(l.execute(op.operationId,grant.approvalId,client,env),/integrity/);assert.equal(posts,0);
}));

test('approval is finding/operation specific, 24 hours, and invalid after source revision changes',async()=>lab(async l=>{
  const {op,grant}=await prepared(l);
  const stored=l.db.prepare('SELECT * FROM cert_approvals WHERE id=?').get(grant.approvalId);
  assert.equal(stored.expires_at-stored.issued_at,86400000);
  const other=await l.prepare({fixtureId:'CONTROL_CHANGED',dueAt:due()},env);
  await assert.rejects(l.execute(other.operationId,grant.approvalId,{},env),/not_approved/);
  l.db.prepare('UPDATE cert_approvals SET expires_at=? WHERE id=?').run(Date.now(),grant.approvalId);
  await assert.rejects(l.execute(op.operationId,grant.approvalId,{},env),/expired/);
  l.db.prepare('UPDATE cert_approvals SET expires_at=? WHERE id=?').run(Date.now()+50000,grant.approvalId);
  l.db.prepare('UPDATE opportunities SET revision=revision+1 WHERE id=?').run(op.opportunityId);
  await assert.rejects(l.execute(op.operationId,grant.approvalId,{},env),/stale/);
}));

test('unknown results never create again on missing, unavailable, multiple or mismatched reads',async()=>lab(async l=>{
  const {op,grant}=await prepared(l);let posts=0;
  const client={async verifyIsolation(){},async create(){posts++;throw Error('response_lost');},async lookup(){return [];}};
  assert.equal((await l.execute(op.operationId,grant.approvalId,client,env)).state,'UNKNOWN');
  const variants=[async()=>[],async()=>{throw Error('lookup_down');},async()=>[receipt(op,'a'),receipt(op,'b')],async()=>[{...receipt(op),properties:{...op.finalRequest.body.properties,hs_task_priority:'HIGH'}}]];
  for(const lookup of variants){client.lookup=lookup;assert.equal((await l.execute(op.operationId,grant.approvalId,client,env)).state,'UNKNOWN');assert.equal(posts,1);}
  client.lookup=async()=>[receipt(op)];const recovered=await l.execute(op.operationId,grant.approvalId,client,env);
  assert.equal(recovered.state,'CONFIRMED');assert.equal(posts,1);
  const events=recovered.trace.map(t=>t.event);assert.ok(events.indexOf('OPERATION_PERSISTED_BEFORE_SUBMISSION')<events.indexOf('POST_INTENT_DURABLY_PERSISTED'));
  assert.ok(events.includes('MULTIPLE_MATCHES_MANUAL_RESOLUTION'));
}));

test('concurrent duplicate submissions issue at most one POST',async()=>lab(async l=>{
  const {op,grant}=await prepared(l);let posts=0,release,checks=0;
  const client={verifyIsolation:()=>++checks===1?new Promise(resolve=>{release=resolve;}):Promise.resolve(),async create(){posts++;return {id:'fixture-task-1'};},async lookup(){return [receipt(op)];}};
  const first=l.execute(op.operationId,grant.approvalId,client,env);
  assert.equal((await l.execute(op.operationId,grant.approvalId,client,env)).state,'CHECKING');
  release();assert.equal((await first).state,'CONFIRMED');assert.equal(posts,1);
  await l.execute(op.operationId,grant.approvalId,client,env);assert.equal(posts,1);
}));

test('recovery converts inflight POST intent to uncertainty and blocks instead of recreating',async()=>lab(async l=>{
  const {op,grant}=await prepared(l);l.db.prepare("UPDATE cert_operations SET state='SENDING' WHERE id=?").run(op.operationId);
  l.recoverChecking();let posts=0;
  const result=await l.execute(op.operationId,grant.approvalId,{async verifyIsolation(){},async lookup(){return [];},async create(){posts++;}},env);
  assert.equal(result.state,'UNKNOWN');assert.equal(posts,0);assert.ok(result.trace.some(t=>t.event==='RESTART_RECOVERED_UNCERTAIN_NO_CREATE'));
}));

test('task reconciliation verifies every property and designated association',()=>{
  const op={correlation:'c',finalRequest:{body:{properties:{hs_task_body:'[AI_MAIN_CORRELATION:c]',hs_timestamp:'2026-11-04T01:00:00Z'},associations:[{to:{id:env.STAGING_CONTACT_ID}}]}}};
  const task=receipt(op);assert.equal(taskMatches(task,op.finalRequest.body,'c'),true);
  task.associations.contacts.results.push({id:'other'});assert.equal(taskMatches(task,op.finalRequest.body,'c'),false);
});

test('hosted adapter fails closed without isolation, separate credentials and disabled production flag',()=>{
  assert.throws(()=>new HubSpotCertificationClient({...env,CRM_WRITEBACK_ENABLED:'true'}),/isolation/);
  assert.throws(()=>new HubSpotCertificationClient({...env,DEPLOYMENT_ENVIRONMENT:'production'}),/isolation/);
  assert.throws(()=>new HubSpotCertificationClient({...env,LOCAL_HUBSPOT_FIXTURE_URL:'https://api.hubapi.com'}),/local_fixture/);
  const remote={...env,CERTIFICATION_MODE:'remote-staging',LOCAL_HUBSPOT_FIXTURE_URL:undefined};
  assert.throws(()=>new HubSpotCertificationClient(remote),/isolation/);
  assert.throws(()=>new HubSpotCertificationClient({...remote,STAGING_ISOLATION_APPROVED:'true',PRODUCTION_PORTAL_ID:env.STAGING_PORTAL_ID}),/isolation/);
  assert.throws(()=>new HubSpotCertificationClient({...env,STAGING_HUBSPOT_WRITE_TOKEN:undefined}),/missing_credential/);
});

test('source Worker legacy writeback stays closed even when a write flag is true',async()=>{
  const response=await application.fetch(new Request('http://worker/writeback-task',{method:'POST',body:'{}'}),{CRM_WRITEBACK_ENABLED:'true'});
  assert.equal(response.status,403);
  const health=await application.fetch(new Request('http://worker/health'),{CRM_WRITEBACK_ENABLED:'true'});
  assert.equal((await health.json()).crmWritesEnabled,false);
});

test('opportunity estimates and confirmed tasks do not imply revenue; outcome source and dedupe are required',async()=>lab(async l=>{
  const {op,grant}=await prepared(l);
  await l.execute(op.operationId,grant.approvalId,{async verifyIsolation(){},async create(){return {id:'fixture-task-1'};},async lookup(){return [receipt(op)];}},env);
  assert.equal(l.metrics().confirmedTaskCount,1);assert.equal(l.metrics().verifiedTestOutcomes.length,0);assert.equal(l.metrics().revenueRescued,null);
  const event={verified:true,externalRef:'invoice-1',taskId:'fixture-task-1',amountMinor:25000,currency:'USD'};
  const client={async verifiedFixtureOutcome(){return event;}};
  assert.equal((await l.recordVerifiedOutcome(op.operationId,'invoice-1',client)).recorded,true);
  assert.equal((await l.recordVerifiedOutcome(op.operationId,'invoice-1',client)).recorded,false);
  event.amountMinor++;await assert.rejects(l.recordVerifiedOutcome(op.operationId,'invoice-1',client),/conflict/);
  event.verified=false;await assert.rejects(l.recordVerifiedOutcome(op.operationId,'invoice-1',client),/unverified/);
  assert.equal(l.metrics().revenueRescued,null);assert.equal(l.metrics().verifiedTestOutcomes.length,1);
}));

test('fresh ST04 failure remains immutable, source-grounded and blocked rather than graded away',async()=>{
  const bytes=await readFile('fixtures/certification-fresh-failures-v1.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),(await readFile('fixtures/certification-fresh-failures-v1.sha256','utf8')).trim());
  const snapshot=JSON.parse(bytes),freshBytes=await readFile('docs/certification/fresh-model-v0.2.json');
  assert.equal(createHash('sha256').update(freshBytes).digest('hex'),snapshot.sourceCaptureSha256);
  const captured=snapshot.cases[0];assert.deepEqual(captured.capturedExecution,JSON.parse(freshBytes).rows.find(r=>r.id==='ST04'));
  assert.equal(captured.humanReview.status,'PENDING');assert.equal(captured.humanReview.verdict,null);
  assert.ok(/bill/i.test(captured.capturedExecution.actual.findings[0].recommendedNextAction));
  assert.ok(!/invoic|bill/i.test(captured.capturedExecution.actual.findings[0].evidence.map(e=>e.quote).join(' ')));
});

test('unknown recommendation changes invalidate approval even when source and classification are unchanged',async()=>lab(async l=>{
  const {op,grant}=await prepared(l);
  l.db.prepare('UPDATE opportunities SET candidate_hash=? WHERE id=?').run('unknown-materiality-candidate',op.opportunityId);
  let posts=0;await assert.rejects(l.execute(op.operationId,grant.approvalId,{async create(){posts++;}},env),/stale/);assert.equal(posts,0);
}));

test('fresh EN12 scope concern preserves the exact captured recommendation with human review pending',async()=>{
  const bytes=await readFile('fixtures/certification-fresh-scope-concern-v1.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),(await readFile('fixtures/certification-fresh-scope-concern-v1.sha256','utf8')).trim());
  const captured=JSON.parse(bytes),fresh=JSON.parse(await readFile('docs/certification/fresh-model-v0.2.json','utf8'));
  assert.deepEqual(captured.capturedExecution,fresh.rows.find(r=>r.id==='EN12'));
  assert.equal(captured.humanReview.status,'PENDING');assert.equal(captured.humanReview.verdict,null);
  assert.ok(captured.capturedExecution.actual.findings.some(f=>/assessment/i.test(f.recommendedNextAction)));
});

test('separate write credential tenant is verified by a read-only identity check before any POST',async t=>{
  const fixture=JSON.parse(await readFile('fixtures/staging-credential-isolation-v1.json','utf8'));
  const calls=[];
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    calls.push({method:options.method,url:String(url)});
    return Response.json({portalId:options.headers.Authorization==='Bearer synthetic-write'?fixture.writeCredentialPortalId:fixture.readCredentialPortalId});
  });
  const client=new HubSpotCertificationClient(env);
  await assert.rejects(client.verifyIsolation(),error=>error.code==='portal_mismatch'&&error.details.check==='write_credential_portal_mismatch');
  assert.equal(calls.length,2);assert.ok(calls.every(c=>c.method==='GET'&&c.url.endsWith('/account-info/v3/details')));
  assert.throws(()=>new HubSpotCertificationClient({...env,STAGING_HUBSPOT_WRITE_TOKEN:env.STAGING_HUBSPOT_READ_TOKEN}),/separate/);
});
test('one exact and one mismatched correlated task are ambiguous and stay UNKNOWN',async()=>lab(async l=>{
 const {op}=await prepared(l);l.db.prepare("UPDATE cert_operations SET state='UNKNOWN' WHERE id=?").run(op.operationId);
 const correct=receipt(op),mismatch={...receipt(op,'fixture-task-2'),properties:{...op.finalRequest.body.properties,hs_task_priority:'LOW'}};
 const client={async verifyIsolation(){},async lookup(){return [correct,mismatch];}};
 assert.equal((await l.reconcileRemote(op.operationId,client)).state,'UNKNOWN');
}));
test('administrator can audit and abandon an uncertain operation without asserting no remote effect or permitting another create',async()=>lab(async l=>{
 const {op,grant}=await prepared(l);l.db.prepare("UPDATE cert_operations SET state='UNKNOWN' WHERE id=?").run(op.operationId);
 assert.throws(()=>l.resolveUncertain(op.operationId,{resolution:'ABANDON_UNCERTAIN',reference:'ticket-001'},{...actor,role:'Approver'}),/admin_required/);
 const closed=l.resolveUncertain(op.operationId,{resolution:'ABANDON_UNCERTAIN',reference:'ticket-001'},{...actor,role:'Admin'});assert.equal(closed.state,'ABANDONED');assert.equal(closed.remoteTaskId,null);assert.ok(closed.trace.some(t=>t.event==='ADMIN_ABANDONED_UNCERTAIN_NO_RETRY'));
 await assert.rejects(l.execute(op.operationId,grant.approvalId,{async create(){throw Error('must_not_post');}},env));
 await assert.rejects(l.prepare({fixtureId:'CONTROL',dueAt:due()},env),/existing_effect/);
}));
