// A temporary, authenticated synthetic-test exception. Never customer authority.
export const DEMO_EXECUTION_POLICY='authenticated-synthetic-task-test-v1';
export const DEMO_RESPONSE_LOSS_POLICY='durable-discard-before-reset-v1';
export async function commitDemoFaultAndRestart(ctx){
 // ctx.abort() rolls back unflushed SQLite writes. Preserve the consumed
 // one-use control and post-create discard trace before deliberately resetting.
 await ctx.storage.sync();
 ctx.abort('Operator-authorized injected response discard; not a network outage ['+DEMO_RESPONSE_LOSS_POLICY+']');
}
export function demoExecution(env){
 if(env.DEMO_ONLY_EXECUTION_ENABLED!=='true')return null;
 if(env.CERTIFICATION_MODE!=='remote-demo'||env.CRM_WRITEBACK_ENABLED!=='false'||env.ENABLE_GENERAL_EXECUTION!=='false'||env.GENERAL_RELEASE_APPROVED!=='false'||env.ENABLE_TEST_TASK_WRITES!=='false'||env.STAGING_PORTAL_ID!=='247646122'||env.STAGING_CONTACT_ID!=='582095692487')throw Error('bounded_demo_only_configuration_required');
 if(!/^release-[a-f0-9-]{36}$/.test(env.DEMO_RELEASE_RUN_ID||''))throw Error('explicit_demo_run_required');
 const maximum=Number(env.DEMO_RELEASE_MAX_CREATES),expiry=Date.parse(env.DEMO_RELEASE_EXPIRES_AT);
 if(!Number.isInteger(maximum)||maximum<1||maximum>3||!Number.isFinite(expiry)||expiry<=Date.now()||expiry>Date.now()+7200000)throw Error('bounded_unexpired_demo_run_required');
 return {policyVersion:DEMO_EXECUTION_POLICY,runId:env.DEMO_RELEASE_RUN_ID,maximum,expiry};
}
export function demoTables(db){db.exec(`CREATE TABLE IF NOT EXISTS release_demo_runs(id TEXT PRIMARY KEY,attempts INTEGER NOT NULL DEFAULT 0,max_attempts INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS release_demo_attempts(operation_id TEXT PRIMARY KEY,run_id TEXT NOT NULL,payload_hash TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS release_demo_faults(operation_id TEXT PRIMARY KEY,payload_hash TEXT NOT NULL,consumed INTEGER NOT NULL DEFAULT 0);`);}
export function reserveDemoAttempt(ledger,op,env){
 const c=demoExecution(env);if(!c)return;
 if(env.executionActor?.kind!=='EXTERNAL_VERIFIED')throw Error('verified_demo_operator_required');
 const db=ledger.db;db.prepare('INSERT OR IGNORE INTO release_demo_runs(id,max_attempts) VALUES(?,?)').run(c.runId,c.maximum);
 const run=db.prepare('SELECT * FROM release_demo_runs WHERE id=?').get(c.runId);if(run.max_attempts!==c.maximum||run.attempts>=run.max_attempts)throw Error('demo_create_budget_exhausted');
 if(db.prepare('SELECT * FROM release_demo_attempts WHERE operation_id=?').get(op.id))throw Error('existing_demo_attempt_reconcile_only');
 const fault=db.prepare('SELECT * FROM release_demo_faults WHERE operation_id=?').get(op.id);
 if(fault&&(fault.payload_hash!==op.payload_hash||env.DEMO_RESPONSE_LOSS_TEST_ENABLED!=='true'))throw Error('demo_fault_requires_fresh_arm');
 db.prepare('INSERT INTO release_demo_attempts VALUES(?,?,?)').run(op.id,c.runId,op.payload_hash);db.prepare('UPDATE release_demo_runs SET attempts=attempts+1 WHERE id=?').run(c.runId);
 ledger.trace(op.id,'BOUNDED_DEMO_ATTEMPT_RESERVED_BEFORE_POST',op.payload_hash);
}
export function armDemoFault(ledger,op,env){
 if(!demoExecution(env)||env.DEMO_RESPONSE_LOSS_TEST_ENABLED!=='true'||op.state!=='APPROVED')throw Error('demo_response_loss_control_disabled');
 ledger.db.prepare('INSERT INTO release_demo_faults(operation_id,payload_hash) VALUES(?,?) ON CONFLICT(operation_id) DO UPDATE SET payload_hash=excluded.payload_hash,consumed=0').run(op.id,op.payload_hash);
 ledger.trace(op.id,'OPERATOR_ARMED_SYNTHETIC_RESPONSE_LOSS',op.payload_hash);return ledger.status(op.id);
}
export function consumeDemoFault(ledger,op,env){
 const fault=ledger.db.prepare('SELECT * FROM release_demo_faults WHERE operation_id=?').get(op.id);if(!fault||fault.consumed)return false;
 if(!demoExecution(env)||env.DEMO_RESPONSE_LOSS_TEST_ENABLED!=='true'||fault.payload_hash!==op.payload_hash)throw Error('invalid_demo_response_loss_control');
 ledger.db.prepare('UPDATE release_demo_faults SET consumed=1 WHERE operation_id=?').run(op.id);ledger.trace(op.id,'INJECTED_CREATE_RESPONSE_DISCARDED_BEFORE_SUCCESS_NOT_NETWORK_OUTAGE',op.payload_hash);return true;
}
