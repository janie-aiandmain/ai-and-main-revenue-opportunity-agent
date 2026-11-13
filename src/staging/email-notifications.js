// Operator alerts only. No customer content, CRM write authority or model calls.
import {digest} from './operation-ledger.js';
export const NOTIFICATION_POLICY='operator-email-alerts-v1.1';
const WINDOW=23*60*60*1000; // Below Resend's documented 24h idempotency retention.
const address=s=>typeof s==='string'&&/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(s)&&s.length<255;
export function emailConfig(env){
 if(env.OPERATOR_EMAIL_ENABLED!=='true')return null;
 if(env.OPERATOR_EMAIL_PROVIDER!=='resend'||!address(env.OPERATOR_EMAIL_FROM)||!address(env.OPERATOR_EMAIL_TO)||!env.OPERATOR_EMAIL_API_KEY)throw Error('operator_email_configuration_incomplete');
 if(env.OPERATOR_EMAIL_REPLY_TO!==undefined&&!address(env.OPERATOR_EMAIL_REPLY_TO))throw Error('operator_email_reply_to_invalid');
 const url=new URL(env.OPERATOR_CONSOLE_URL);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/operator')throw Error('operator_email_console_url_invalid');
 return {from:env.OPERATOR_EMAIL_FROM,to:env.OPERATOR_EMAIL_TO,consoleUrl:url.href,...(env.OPERATOR_EMAIL_REPLY_TO?{replyTo:env.OPERATOR_EMAIL_REPLY_TO}:{})};
}
function snapshot(finding,priority){
 const f=finding.modelFinding,a=f.proposedAction,m=a.material,urgent=m.reviewRouting?.queue==='immediate_review';
 const p=priority||a.actionPayload.properties.hs_task_priority;
 const sort=xs=>[...xs].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 const evidence=sort(m.evidence.map(e=>({noteId:e.noteId,timestamp:e.timestamp,quote:e.quote})));
 return {eligible:p==='HIGH'||urgent,urgent,priority:p,classification:f.classification,opportunityType:f.opportunityType,
   // Ignore synonymous provider keys/summary prose and contract-version-only changes.
   materialHash:digest({classification:f.classification,opportunityType:f.opportunityType,priority:p,urgent,evidence,actionPurpose:m.actionPurpose,scope:{...m.scope,sourceRequests:[...m.scope.sourceRequests].sort()},restrictions:sort(m.sourceRestrictions),gates:sort(m.customerActionGates),quality:sort(finding.inspection.qualityFailures)}),
   sourceTimestamps:[...new Set(evidence.map(e=>e.timestamp))].sort(),qualityBlocked:finding.inspection.qualityFailures.length>0};
}
export class OperatorEmailOutbox {
 constructor(db){this.db=db;db.exec(`
  CREATE TABLE IF NOT EXISTS operator_email_state(finding_id TEXT PRIMARY KEY,context_key TEXT NOT NULL,fingerprint TEXT NOT NULL,revision INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS operator_email_outbox(id TEXT PRIMARY KEY,finding_id TEXT NOT NULL,context_key TEXT NOT NULL,revision INTEGER NOT NULL,fingerprint TEXT NOT NULL,route_hash TEXT NOT NULL,request_json TEXT NOT NULL,state TEXT NOT NULL,attempts INTEGER NOT NULL,first_attempt_at INTEGER,next_attempt_at INTEGER NOT NULL,provider_id TEXT,error_code TEXT,created_at INTEGER NOT NULL);
 `);}
 observe(finding,contextKey,env,now=Date.now(),priority){
  // Called inside the same transaction that commits an accepted finding/review.
  const s=snapshot(finding,priority),fingerprint=digest({policy:NOTIFICATION_POLICY,...s});
  const old=this.db.prepare('SELECT * FROM operator_email_state WHERE finding_id=?').get(finding.findingId);
  if(old?.fingerprint===fingerprint)return;
  const revision=(old?.revision||0)+1;
  this.db.prepare('INSERT INTO operator_email_state VALUES(?,?,?,?) ON CONFLICT(finding_id) DO UPDATE SET fingerprint=excluded.fingerprint,revision=excluded.revision').run(finding.findingId,contextKey,fingerprint,revision);
  this.cancel(finding.findingId);
  // Disabled events are not backfilled on enable or on unchanged reevaluation.
  if(!s.eligible||env.OPERATOR_EMAIL_ENABLED!=='true')return;
  let config;try{config=emailConfig(env);}catch{return;}
  const id='alert_'+digest({contextKey,findingId:finding.findingId,revision,fingerprint}).slice(7);
  const request={from:config.from,to:[config.to],...(config.replyTo?{reply_to:config.replyTo}:{}),subject:'AI & MAIN — '+(s.urgent?'IMMEDIATE REVIEW':'HIGH priority')+' finding',text:[
   s.urgent?'Immediate internal review: source reports a scope-change request during in-progress work.':'A HIGH-priority agent finding needs operator review.',
   'Finding: '+finding.findingId,'Classification: '+s.classification,'Source timestamps (UTC): '+s.sourceTimestamps.join(', '),
   'Historical evidence does not establish current job status, current interest or a new deadline.',
   s.qualityBlocked?'Evidence/scope concerns are present. Execution remains blocked.':'Human semantic review remains required.',
   'This alert approves no task, customer contact, scheduling, billing or additional work.',
   'Review: '+config.consoleUrl+'#'+encodeURIComponent(finding.findingId)
  ].join('\n')};
  const routeHash=digest(config);
  this.db.prepare("INSERT INTO operator_email_outbox VALUES(?,?,?,?,?,?,?,'PENDING',0,NULL,?,NULL,NULL,?)").run(id,finding.findingId,contextKey,revision,fingerprint,routeHash,JSON.stringify(request),now,now);
 }
 cancel(findingId){this.db.prepare("UPDATE operator_email_outbox SET state='CANCELLED',error_code='finding_changed_or_withdrawn' WHERE finding_id=? AND state IN ('PENDING','RETRY','UNKNOWN')").run(findingId);}
 cancelContext(key){for(const r of this.db.prepare('SELECT finding_id FROM operator_email_state WHERE context_key=?').all(key))this.cancel(r.finding_id);}
 recover(now=Date.now()){
  // A restarted process never claims an in-flight email was delivered.
  this.db.prepare("UPDATE operator_email_outbox SET state='UNKNOWN',error_code='restart_after_send_intent',next_attempt_at=? WHERE state='SENDING'").run(now);
 }
 status(){return this.db.prepare('SELECT id,finding_id AS findingId,state,attempts,provider_id AS providerId,error_code AS errorCode FROM operator_email_outbox ORDER BY created_at,id').all();}
 prune(days,now=Date.now()){
  if(!Number.isInteger(days)||days<1||days>3650)throw Error('invalid_audit_retention_days');
  // Keep deduplication tombstones; discard terminal email bodies/addresses at retention.
  this.db.prepare("UPDATE operator_email_outbox SET request_json='{}' WHERE created_at<? AND state IN ('SENT','CANCELLED','BLOCKED')").run(now-days*86400000);
 }
 nextDue(now=Date.now()){
  const r=this.db.prepare("SELECT MIN(next_attempt_at) AS due FROM operator_email_outbox WHERE state IN ('PENDING','RETRY','UNKNOWN')").get();
  return r?.due==null?null:Math.max(now+1000,r.due);
 }
 async deliver(env,{fetcher=(...args)=>globalThis.fetch(...args),flush=async()=>{},now=()=>Date.now(),limit=10}={}){
  if(env.OPERATOR_EMAIL_ENABLED!=='true')return {enabled:false,processed:0};
  let config;try{config=emailConfig(env);}catch{return {enabled:true,processed:0,blocker:'operator_email_configuration_incomplete'};}
  const rows=this.db.prepare("SELECT * FROM operator_email_outbox WHERE state IN ('PENDING','RETRY','UNKNOWN') AND next_attempt_at<=? ORDER BY created_at,id LIMIT ?").all(now(),limit);
  let processed=0;
  for(const row of rows){
   const current=this.db.prepare('SELECT * FROM operator_email_state WHERE finding_id=?').get(row.finding_id);
   const finding=this.db.prepare('SELECT * FROM general_findings WHERE op_id=?').get(row.finding_id);
   const context=this.db.prepare('SELECT * FROM general_contexts WHERE context_key=?').get(row.context_key);
   if(!current||current.fingerprint!==row.fingerprint||current.revision!==row.revision||finding?.review_state==='WITHDRAWN'||['DEFER','DECLINE'].includes(finding?.review_state)){
    this.db.prepare("UPDATE operator_email_outbox SET state='CANCELLED',error_code='stale_finding' WHERE id=?").run(row.id);continue;
   }
   // An incomplete/failed/new evaluation cannot release stale alerts.
   if(context?.state!=='READY'||!finding){this.db.prepare('UPDATE operator_email_outbox SET next_attempt_at=? WHERE id=?').run(now()+60000,row.id);continue;}
   if(row.route_hash!==digest(config)){this.db.prepare("UPDATE operator_email_outbox SET state='BLOCKED',error_code='email_route_changed' WHERE id=?").run(row.id);continue;}
   if(row.first_attempt_at!==null&&now()-row.first_attempt_at>=WINDOW){this.db.prepare("UPDATE operator_email_outbox SET state='BLOCKED',error_code='idempotency_window_expired_manual_resolution' WHERE id=?").run(row.id);continue;}
   // Reserve before I/O, and flush DO storage before handing data to a provider.
   this.db.prepare("UPDATE operator_email_outbox SET state='SENDING',attempts=attempts+1,first_attempt_at=COALESCE(first_attempt_at,?),error_code=NULL WHERE id=? AND state IN ('PENDING','RETRY','UNKNOWN')").run(now(),row.id);
   await flush();processed++;
   try{
    const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{authorization:'Bearer '+env.OPERATOR_EMAIL_API_KEY,'content-type':'application/json','Idempotency-Key':row.id},body:row.request_json,redirect:'manual',signal:AbortSignal.timeout(15000)});
    if(response.ok){
     const data=await response.json();if(typeof data.id!=='string'||!data.id||data.id.length>200)throw Error('uncertain_provider_receipt');
     this.db.prepare("UPDATE operator_email_outbox SET state='SENT',provider_id=?,error_code=NULL WHERE id=?").run(data.id,row.id);
    }else if(response.status===429||response.status>=500){
     await response.body?.cancel();this.defer(row,'RETRY','provider_temporary_failure',now());
    }else{
     await response.body?.cancel();this.db.prepare("UPDATE operator_email_outbox SET state='BLOCKED',error_code=? WHERE id=?").run('provider_rejected_'+response.status,row.id);
    }
   }catch{this.defer(row,'UNKNOWN','delivery_outcome_unknown',now());}
  }
  return {enabled:true,processed};
 }
 defer(row,state,code,now){const backoff=Math.min(3600000,60000*2**Math.min(row.attempts,6));this.db.prepare('UPDATE operator_email_outbox SET state=?,error_code=?,next_attempt_at=? WHERE id=?').run(state,code,now+backoff,row.id);}
}
