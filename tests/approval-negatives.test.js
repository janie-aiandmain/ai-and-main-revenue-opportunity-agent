import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {runApprovalNegativeMatrix,assertNegativeDiagnostics} from '../src/staging/approval-negatives.js';
import {GeneralFindingLedger} from '../src/staging/general-ledger.js';

function database(){
 const raw=new DatabaseSync(':memory:');
 return {raw,db:{exec:q=>raw.exec(q),prepare:q=>raw.prepare(q),transaction:fn=>{raw.exec('BEGIN IMMEDIATE');try{const value=fn();raw.exec('COMMIT');return value;}catch(e){raw.exec('ROLLBACK');throw e;}}}};
}
test('negative matrix reaches the actual approval guards with no network client or real effects',async()=>{
 const {raw,db}=database(),saved=globalThis.fetch;let networkAttempts=0;
 globalThis.fetch=async()=>{networkAttempts++;throw Error('network_forbidden_in_approval_fixtures');};
 try{
  const report=await runApprovalNegativeMatrix(db,{runId:'negative-'+randomUUID()});
  assert.deepEqual(report.summary,{cases:38,passed:38,failed:0,negativeCases:37,negativeSimulatedCreateEscapes:0,positiveControlSimulatedCreates:1,liveTaskCreates:0,fixtureOperationalRowsRetained:0});
  assert.equal(networkAttempts,0);assert.equal(report.modelCalls,0);assert.equal(report.emailProviderCalls,0);
  assert.equal(report.testApprovalsAreHumanSignoff,false);
  for(const r of report.rows.filter(r=>r.expected==='REJECTED'))assert.equal(r.rejection,r.expectedRejection,r.caseId);
  for(const r of report.rows.filter(r=>r.expected==='UNKNOWN_NO_CREATE')){assert.equal(r.disposition,'UNKNOWN');assert.ok(r.trace.includes(r.expectedUncertainTrace));}
  assert.equal(report.rows.find(r=>r.caseId==='positive-repeat').simulatedCreateCalls,1);
 }finally{globalThis.fetch=saved;raw.close();}
});
test('matrix refuses populated operational storage without deleting it, including approval-only remnants',async()=>{
 const {raw,db}=database();try{
  new GeneralFindingLedger(db,{});
  db.exec("CREATE TABLE IF NOT EXISTS general_approval_identity(approval_id TEXT PRIMARY KEY)");
  const columns=db.prepare('PRAGMA table_info(general_approval_identity)').all();
  // This table's required fields come from the actual runtime schema.
  const values=columns.map(c=>c.name==='approval_id'?'preserved-real-grant':c.type==='INTEGER'?1:'preserved');
  db.prepare('INSERT INTO general_approval_identity VALUES('+columns.map(()=>'?').join(',')+')').run(...values);
  await assert.rejects(runApprovalNegativeMatrix(db,{runId:'negative-'+randomUUID()}),/diagnostic_storage_not_empty/);
  assert.equal(db.prepare('SELECT count(*) AS n FROM general_approval_identity').get().n,1);
  await assert.rejects(runApprovalNegativeMatrix(db,{runId:'not-a-run'}),/invalid_negative_run_id/);
 }finally{raw.close();}
});
test('hosted diagnostics require the exact demo tenant and every execution switch explicitly closed',()=>{
 const flags=['CRM_WRITEBACK_ENABLED','ENABLE_TEST_TASK_WRITES','ENABLE_GENERAL_EXECUTION','GENERAL_RELEASE_APPROVED','DEMO_RECOVERY_ENABLED','DEMO_RECOVERY_EXECUTION_ENABLED','DEMO_RECOVERY_FAULT_ENABLED','DEMO_ONLY_EXECUTION_ENABLED','DEMO_RESPONSE_LOSS_TEST_ENABLED'];
 const demo={CERTIFICATION_MODE:'remote-demo',STAGING_PORTAL_ID:'247646122',STAGING_CONTACT_ID:'582095692487',...Object.fromEntries(flags.map(f=>[f,'false']))};
 assert.doesNotThrow(()=>assertNegativeDiagnostics(demo));
 for(const flag of flags){assert.throws(()=>assertNegativeDiagnostics({...demo,[flag]:'true'}),/closed_execution/);assert.throws(()=>assertNegativeDiagnostics({...demo,[flag]:undefined}),/closed_execution/);}
 assert.throws(()=>assertNegativeDiagnostics({...demo,STAGING_CONTACT_ID:'another'}),/demo_only/);
 assert.throws(()=>assertNegativeDiagnostics({...demo,CERTIFICATION_MODE:'remote-single-tenant'}),/demo_only/);
});
