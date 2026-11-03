import {createHash,randomUUID} from 'node:crypto';
import {canonical} from '../findings.js';
export const DEMO_CONTRACT='demo-remote-recovery-control-v1';
export const DEMO_CASES=Object.freeze(['NORMAL','LOSS','CHANGED']);
export const hash=value=>'sha256:'+createHash('sha256').update(typeof value==='string'?value:canonical(value)).digest('hex');
export class DemoRecoveryLedger {
 constructor(db){
  this.db=db;this.bootId=randomUUID();
  db.exec(`CREATE TABLE IF NOT EXISTS demo_run(id TEXT PRIMARY KEY,closed INTEGER NOT NULL DEFAULT 0,attempts INTEGER NOT NULL DEFAULT 0,boots INTEGER NOT NULL DEFAULT 0);
   CREATE TABLE IF NOT EXISTS demo_ops(id TEXT PRIMARY KEY,case_id TEXT NOT NULL UNIQUE,correlation TEXT NOT NULL UNIQUE,request TEXT NOT NULL,payload_hash TEXT NOT NULL,source_hash TEXT NOT NULL,revision INTEGER NOT NULL,state TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,remote_id TEXT,fault INTEGER NOT NULL DEFAULT 0);
   CREATE TABLE IF NOT EXISTS demo_approvals(id TEXT PRIMARY KEY,operation_id TEXT NOT NULL,payload_hash TEXT NOT NULL,action_version TEXT NOT NULL,source_hash TEXT NOT NULL,revision INTEGER NOT NULL,expires INTEGER NOT NULL,revoked INTEGER NOT NULL DEFAULT 0,actor TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS demo_trace(seq INTEGER PRIMARY KEY,operation_id TEXT,event TEXT NOT NULL,detail TEXT NOT NULL,boot TEXT NOT NULL,at TEXT NOT NULL);`);
  this.tx(()=>{for(const op of db.prepare("SELECT * FROM demo_ops WHERE state='SENDING'").all()){
   db.prepare("UPDATE demo_ops SET state='UNKNOWN' WHERE id=?").run(op.id);this.trace(op.id,'RESTART_RECOVERED_UNCERTAIN_NO_CREATE',{payloadHash:op.payload_hash});
  }db.prepare('UPDATE demo_run SET boots=boots+1').run();});
 }
 tx(fn){return this.db.transaction(fn);}
 trace(id,event,detail={}){this.db.prepare('INSERT INTO demo_trace(operation_id,event,detail,boot,at) VALUES(?,?,?,?,?)').run(id,event,canonical(detail),this.bootId,new Date().toISOString());}
 initialize(runId){if(!/^demo-[a-f0-9-]{36}$/.test(runId))throw Error('invalid_demo_run');return this.tx(()=>{
  const row=this.db.prepare('SELECT * FROM demo_run').get();if(row&&row.id!==runId)throw Error('run_mismatch');
  if(!row)this.db.prepare('INSERT INTO demo_run(id,boots) VALUES(?,1)').run(runId);return this.summary();
 });}
 summary(){const r=this.db.prepare('SELECT * FROM demo_run').get();return {contract:DEMO_CONTRACT,runId:r?.id,closed:!!r?.closed,totalCreateAttempts:r?.attempts||0,maxCreateAttempts:3,bootId:this.bootId,bootNumber:r?.boots||0,operations:this.db.prepare('SELECT id,case_id,state,attempts,remote_id FROM demo_ops ORDER BY case_id').all(),verifiedRevenueOutcomes:[],revenueRescued:null};}
 open(){const r=this.db.prepare('SELECT * FROM demo_run').get();if(!r||r.closed)throw Error('demo_run_closed');return r;}
 version(op){return 'demo-final-action-v1:'+hash({payloadHash:op.payload_hash,sourceHash:op.source_hash});}
 op(id){const op=this.db.prepare('SELECT * FROM demo_ops WHERE id=?').get(id);if(!op)throw Error('unknown_demo_operation');return op;}
 status(id){const o=this.op(id);return {operationId:o.id,caseId:o.case_id,correlation:o.correlation,payloadHash:o.payload_hash,actionVersion:this.version(o),sourceHash:o.source_hash,revision:o.revision,state:o.state,createAttempts:o.attempts,remoteTaskId:o.remote_id,request:JSON.parse(o.request),bootId:this.bootId,bootNumber:this.summary().bootNumber,trace:this.db.prepare('SELECT event,detail,boot,at FROM demo_trace WHERE operation_id=? ORDER BY seq').all(id).map(t=>({...t,detail:JSON.parse(t.detail)}))};}
 prepare({caseId,dueAt,priority='MEDIUM',sourceHash}){return this.tx(()=>{
  const run=this.open();if(!DEMO_CASES.includes(caseId))throw Error('synthetic_control_only_seven_reviews_remain_pending');
  if(!Number.isFinite(Date.parse(dueAt))||Date.parse(dueAt)<=Date.now()||!['MEDIUM','HIGH'].includes(priority)||typeof sourceHash!=='string'||!sourceHash.startsWith('sha256:'))throw Error('invalid_control_spec');
  const old=this.db.prepare('SELECT * FROM demo_ops WHERE case_id=?').get(caseId);
  const id=old?.id||'demo-op-'+randomUUID(),correlation=old?.correlation||'ai-main-demo-'+randomUUID();
  const request={contractVersion:DEMO_CONTRACT,method:'POST',url:'https://api.hubapi.com/crm/v3/objects/tasks',portalId:'247646122',body:{properties:{hs_task_subject:'[AI & MAIN SYNTHETIC RECOVERY DEMO] '+caseId+' '+run.id.slice(5,13),hs_task_body:'Synthetic control scenario '+caseId+'. No customer communication, scheduling, billing or service work. Not a finding semantic approval or revenue outcome.\n[AI_MAIN_CORRELATION:'+correlation+']',hs_task_priority:priority,hs_task_status:'NOT_STARTED',hs_task_type:'TODO',hs_timestamp:new Date(dueAt).toISOString()},associations:[{to:{id:'582095692487'},types:[{associationCategory:'HUBSPOT_DEFINED',associationTypeId:204}]}]}};
  const json=canonical(request),payloadHash=hash(json);
  if(old){
   const changed=old.payload_hash!==payloadHash||old.source_hash!==sourceHash;
   if(changed&&(old.attempts||!['PREPARED','APPROVED'].includes(old.state)))throw Error('existing_effect_requires_reconciliation');
   if(changed){this.db.prepare('UPDATE demo_approvals SET revoked=1 WHERE operation_id=?').run(id);this.db.prepare("UPDATE demo_ops SET request=?,payload_hash=?,source_hash=?,revision=revision+1,state='PREPARED' WHERE id=?").run(json,payloadHash,sourceHash,id);this.trace(id,'MATERIAL_CHANGE_REVOKED_OLD_APPROVAL',{oldHash:old.payload_hash,newHash:payloadHash});}
  }else{this.db.prepare("INSERT INTO demo_ops(id,case_id,correlation,request,payload_hash,source_hash,revision,state) VALUES(?,?,?,?,?,?,1,'PREPARED')").run(id,caseId,correlation,json,payloadHash,sourceHash);this.trace(id,'OPERATION_CORRELATION_PAYLOAD_PERSISTED',{payloadHash,sourceHash,correlation});}
  return this.status(id);
 });}
 approve({operationId,payloadHash,actionVersion,revision,sourceHash}){return this.tx(()=>{
  this.open();const o=this.op(operationId);
  if(!['PREPARED','APPROVED'].includes(o.state)||o.payload_hash!==payloadHash||this.version(o)!==actionVersion||o.revision!==revision||o.source_hash!==sourceHash||hash(o.request)!==payloadHash)throw Error('exact_approval_mismatch');
  const id='demo-approval-'+randomUUID(),expires=Date.now()+86400000;
  this.db.prepare('INSERT INTO demo_approvals(id,operation_id,payload_hash,action_version,source_hash,revision,expires,actor) VALUES(?,?,?,?,?,?,?,?)').run(id,o.id,payloadHash,actionVersion,sourceHash,revision,expires,'USER_AUTHORIZED_SYNTHETIC_CONTROL_RUN');
  this.db.prepare("UPDATE demo_ops SET state='APPROVED' WHERE id=?").run(o.id);this.trace(o.id,'EXACT_PAYLOAD_APPROVED',{payloadHash,actionVersion,revision,expires,approvalKind:'USER_AUTHORIZED_SYNTHETIC_CONTROL_NOT_SEVEN_CASE_SIGNOFF'});return {approvalId:id,payloadHash,actionVersion,revision,expiresAt:new Date(expires).toISOString()};
 });}
 invalidate(id,reason){return this.tx(()=>{const o=this.op(id);if(!o.attempts){this.db.prepare('UPDATE demo_approvals SET revoked=1 WHERE operation_id=?').run(id);this.db.prepare("UPDATE demo_ops SET state='PREPARED' WHERE id=?").run(id);this.trace(id,'SOURCE_CHECK_FAILURE_REVOKED_APPROVAL',{reason});}return this.status(id);});}
 armFault(id){return this.tx(()=>{this.open();const o=this.op(id);if(o.case_id!=='LOSS'||o.state!=='APPROVED'||o.attempts)throw Error('fault_control_not_permitted');this.db.prepare('UPDATE demo_ops SET fault=1 WHERE id=?').run(id);this.trace(id,'OPERATOR_ARMED_APPLICATION_RESPONSE_DISCARD',{genuineNetworkOutage:false});return this.status(id);});}
 begin({operationId,approvalId,payloadHash,actionVersion,revision,sourceHash}){return this.tx(()=>{
  const o=this.op(operationId);
  if(o.attempts||['SENDING','UNKNOWN','CONFIRMED'].includes(o.state))return {mode:'RECONCILE_ONLY',...this.status(o.id)};
  const run=this.open(),a=this.db.prepare('SELECT * FROM demo_approvals WHERE id=?').get(approvalId);
  if(o.state!=='APPROVED'||!a||a.revoked||a.operation_id!==o.id||a.payload_hash!==payloadHash||a.action_version!==actionVersion||a.revision!==revision||a.source_hash!==sourceHash||a.expires<=Date.now()||o.payload_hash!==payloadHash||this.version(o)!==actionVersion||o.revision!==revision||o.source_hash!==sourceHash||hash(o.request)!==payloadHash)throw Error('approval_stale_or_payload_or_source_changed');
  const req=JSON.parse(o.request);if(Date.parse(req.body.properties.hs_timestamp)<=Date.now())throw Error('approved_due_date_expired');
  if(run.attempts>=3)throw Error('three_create_budget_exhausted');
  this.db.prepare("UPDATE demo_ops SET state='SENDING',attempts=attempts+1 WHERE id=?").run(o.id);this.db.prepare('UPDATE demo_run SET attempts=attempts+1').run();
  this.trace(o.id,'SUBMISSION_INTENT_DURABLY_PERSISTED',{payloadHash,actionVersion,revision,correlation:o.correlation,attempt:1});
  return {mode:'CREATE_ONCE',discardResponse:o.fault===1,...this.status(o.id)};
 });}
 unknown(id,reason){const o=this.op(id);if(o.state!=='CONFIRMED'){this.db.prepare("UPDATE demo_ops SET state='UNKNOWN' WHERE id=?").run(id);this.trace(id,'UNCERTAIN_NO_SECOND_CREATE',{reason});}return this.status(id);}
 reconciled({operationId,candidates,matchedTaskId,matchProofHash}){return this.tx(()=>{
  const o=this.op(operationId);if(!o.attempts)throw Error('no_remote_submission_to_reconcile');
  if(candidates!==1||!matchedTaskId||!matchProofHash){this.db.prepare("UPDATE demo_ops SET state='UNKNOWN' WHERE id=?").run(o.id);this.trace(o.id,'RECONCILIATION_BLOCKED_NO_CREATE',{candidateCount:candidates,reason:matchedTaskId?'mismatch':'absent_ambiguous_or_unavailable'});return this.status(o.id);}
  this.db.prepare("UPDATE demo_ops SET state='CONFIRMED',remote_id=? WHERE id=?").run(matchedTaskId,o.id);this.trace(o.id,'EXISTING_TASK_EXACTLY_RECONCILED_NO_CREATE',{remoteTaskId:matchedTaskId,payloadHash:o.payload_hash,matchProofHash,candidateCount:candidates});return this.status(o.id);
 });}
 beforeRestart(id){const o=this.op(id);if(o.case_id!=='LOSS'||!['SENDING','UNKNOWN'].includes(o.state)||!o.fault)throw Error('restart_control_not_permitted');this.trace(id,'OPERATOR_REQUESTED_HOSTED_RESTART',{bootId:this.bootId});}
 close(){this.db.prepare('UPDATE demo_run SET closed=1').run();return this.summary();}
 dispatch(input){this.initialize(input.runId);switch(input.action){case 'summary':return this.summary();case 'prepare':return this.prepare(input);case 'approve':return this.approve(input);case 'status':return this.status(input.operationId);case 'arm-fault':return this.armFault(input.operationId);case 'begin':return this.begin(input);case 'invalidate':return this.invalidate(input.operationId,input.reason);case 'unknown':return this.unknown(input.operationId,input.reason);case 'reconciled':return this.reconciled(input);case 'close':return this.close();default:throw Error('unsupported_demo_ledger_action');}}
}
