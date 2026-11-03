import { createHash,randomUUID } from 'node:crypto';
import { CorrectionLedger } from '../correction-ledger.js';
import { prepareHistory,canonical } from '../findings.js';
import { reviewedProjection,materialExecutable,TASK_CLASS } from '../correction-policy.js';
import { BLOCKED_CASES,CONTROL_CASES,FINAL_PAYLOAD_CONTRACT } from './policy.js';
import { taskMatches } from './hubspot-client.js';
const digest=value=>'sha256:'+createHash('sha256').update(typeof value==='string'?value:canonical(value)).digest('hex');
export class StagingOperationLedger extends CorrectionLedger {
  constructor(db){super(db);db.exec(`
    CREATE TABLE IF NOT EXISTS cert_operations(id TEXT PRIMARY KEY,op_id TEXT NOT NULL UNIQUE,correlation TEXT NOT NULL UNIQUE,payload_json TEXT NOT NULL,payload_hash TEXT NOT NULL,material_json TEXT NOT NULL,material_hash TEXT NOT NULL,source_hash TEXT NOT NULL,source_candidate_hash TEXT NOT NULL,source_revision INTEGER NOT NULL,revision INTEGER NOT NULL,state TEXT NOT NULL,remote_id TEXT,estimated_minor INTEGER NOT NULL DEFAULT 100000);
    CREATE TABLE IF NOT EXISTS cert_approvals(id TEXT PRIMARY KEY,operation_id TEXT NOT NULL,payload_hash TEXT NOT NULL,revision INTEGER NOT NULL,actor TEXT NOT NULL,kind TEXT NOT NULL,issued_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,revoked INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS cert_trace(sequence INTEGER PRIMARY KEY,operation_id TEXT NOT NULL,event TEXT NOT NULL,payload_hash TEXT,remote_id TEXT,at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS cert_outcomes(external_ref TEXT PRIMARY KEY,operation_id TEXT NOT NULL,remote_task_id TEXT NOT NULL,amount_minor INTEGER NOT NULL,currency TEXT NOT NULL,verification_kind TEXT NOT NULL);
  `);}
  trace(id,event,hash=null,remote=null){this.db.prepare('INSERT INTO cert_trace(operation_id,event,payload_hash,remote_id,at) VALUES(?,?,?,?,?)').run(id,event,hash,remote,new Date().toISOString());}
  blockedCase(id){return BLOCKED_CASES.includes(id);}
  status(id){const op=this.db.prepare('SELECT * FROM cert_operations WHERE id=?').get(id);if(!op)throw Error('unknown_operation');return {operationId:op.id,opportunityId:op.op_id,correlation:op.correlation,state:op.state,payloadContract:FINAL_PAYLOAD_CONTRACT,payloadHash:op.payload_hash,actionVersion:'final-action-v1:'+digest({payloadHash:op.payload_hash,materialHash:op.material_hash}),revision:op.revision,remoteTaskId:op.remote_id,finalRequest:JSON.parse(op.payload_json),trace:this.db.prepare('SELECT event,payload_hash,remote_id,at FROM cert_trace WHERE operation_id=? ORDER BY sequence').all(id)};}
  async prepare({fixtureId,dueAt},env){
    if(this.blockedCase(fixtureId))throw Error('human_review_pending:'+fixtureId);
    if(!CONTROL_CASES.includes(fixtureId))throw Error('designated_fixture_only');
    if(!env.STAGING_PORTAL_ID||!env.STAGING_CONTACT_ID)throw Error('designated_test_record_missing');
    if(!Number.isFinite(Date.parse(dueAt))||Date.parse(dueAt)<=Date.now())throw Error('explicit_future_operator_due_date_required');
    const context='certification:'+env.STAGING_PORTAL_ID+':'+env.STAGING_CONTACT_ID+':'+fixtureId;
    const history=await prepareHistory({serviceHistory:[{noteId:'certification-control-v1',timestamp:'2026-01-01T00:00:00Z',note:'Synthetic certification contact requests surge protection pricing. This designated test record must never trigger customer communications.'}]});
    const finding={opportunityKey:'surge-protection',classification:'strong cross-sell opportunity',opportunityType:'cross-sell',humanReviewRequired:true,evidence:[{noteId:history[0].noteId,quote:'Synthetic certification contact requests surge protection pricing.'}],recommendedNextAction:'Review pricing for the designated synthetic test record.'};
    const identity=this.reconcile(context,history,[finding])[0];
    const projection=reviewedProjection({actionClass:TASK_CLASS,targetContext:context,classification:finding.classification,opportunityType:finding.opportunityType,intent:'prepare_quote',scope:{service:'surge_protection',recordPurpose:'certification_only'},priority:'MEDIUM',evidence:finding.evidence,timing:{kind:'absolute',dueAt:new Date(dueAt).toISOString(),basisRef:'explicit_certification_operator_due_date'},constraints:['No customer communication; designated certification task only.'],humanApprovalRequired:true},history);
    return this.tx(()=>{
      const existing=this.db.prepare('SELECT * FROM cert_operations WHERE op_id=?').get(identity.opportunityId);
      if(existing&&!['PREPARED','APPROVED'].includes(existing.state))throw Error('existing_effect_must_be_reconciled');
      const id=existing?.id||'operation_'+randomUUID(),correlation=existing?.correlation||'ai-main-'+randomUUID();
      const body={properties:{...projection.payload.properties,hs_task_body:projection.payload.properties.hs_task_body+'\n[AI_MAIN_CORRELATION:'+correlation+']'},associations:[{to:{id:env.STAGING_CONTACT_ID},types:[{associationCategory:'HUBSPOT_DEFINED',associationTypeId:204}]}]};
      const request={contractVersion:FINAL_PAYLOAD_CONTRACT,method:'POST',url:'https://api.hubapi.com/crm/v3/objects/tasks',portalId:env.STAGING_PORTAL_ID,body},json=canonical(request),payloadHash=digest(json),materialHash=digest(projection.material);
      const source=this.db.prepare('SELECT * FROM opportunities WHERE id=?').get(identity.opportunityId);
      if(existing){
        const changed=existing.payload_hash!==payloadHash||existing.material_hash!==materialHash||existing.source_hash!==identity.sourceHash||existing.source_candidate_hash!==identity.candidateHash||existing.source_revision!==source.revision;
        if(changed){this.db.prepare('UPDATE cert_approvals SET revoked=1 WHERE operation_id=?').run(id);this.trace(id,'APPROVAL_INVALIDATED',payloadHash);}
        this.db.prepare('UPDATE cert_operations SET payload_json=?,payload_hash=?,material_json=?,material_hash=?,source_hash=?,source_candidate_hash=?,source_revision=?,revision=revision+?,state=? WHERE id=?').run(json,payloadHash,JSON.stringify(projection.material),materialHash,identity.sourceHash,identity.candidateHash,source.revision,changed?1:0,changed?'PREPARED':existing.state,id);
      }else{
        this.db.prepare('INSERT INTO cert_operations(id,op_id,correlation,payload_json,payload_hash,material_json,material_hash,source_hash,source_candidate_hash,source_revision,revision,state) VALUES(?,?,?,?,?,?,?,?,?,?,1,?)').run(id,identity.opportunityId,correlation,json,payloadHash,JSON.stringify(projection.material),materialHash,identity.sourceHash,identity.candidateHash,source.revision,'PREPARED');
        this.trace(id,'OPERATION_PERSISTED_BEFORE_SUBMISSION',payloadHash);
      }
      return this.status(id);
    });
  }
  approve(id,payloadHash,actor){return this.tx(()=>{
    if(!['Approver','Admin'].includes(actor.role))throw Error('approver_required');
    const op=this.db.prepare('SELECT * FROM cert_operations WHERE id=?').get(id);
    if(!op||!['PREPARED','APPROVED'].includes(op.state)||op.payload_hash!==payloadHash||digest(op.payload_json)!==payloadHash)throw Error('approval_payload_mismatch');
    materialExecutable(JSON.parse(op.material_json),new Date().toISOString());
    const grant='approval_'+randomUUID(),now=Date.now();
    this.db.prepare('INSERT INTO cert_approvals(id,operation_id,payload_hash,revision,actor,kind,issued_at,expires_at) VALUES(?,?,?,?,?,?,?,?)').run(grant,id,payloadHash,op.revision,actor.subject,actor.kind,now,now+86400000);
    this.db.prepare("UPDATE cert_operations SET state='APPROVED' WHERE id=?").run(id);this.trace(id,'EXACT_FINAL_PAYLOAD_APPROVED',payloadHash);return {approvalId:grant,payloadHash,kind:actor.kind};
  });}
  validate(op,a,env){
    const source=this.db.prepare('SELECT * FROM opportunities WHERE id=?').get(op.op_id);
    if(!a||a.revoked||a.operation_id!==op.id||a.revision!==op.revision||a.payload_hash!==op.payload_hash||a.expires_at<=Date.now()||a.issued_at>Date.now()||!source||source.source_hash!==op.source_hash||source.candidate_hash!==op.source_candidate_hash||source.revision!==op.source_revision)throw Error('approval_stale_or_expired');
    if(digest(op.payload_json)!==op.payload_hash||digest(JSON.parse(op.material_json))!==op.material_hash)throw Error('final_payload_integrity_failure');
    const request=JSON.parse(op.payload_json);
    if(request.contractVersion!==FINAL_PAYLOAD_CONTRACT||request.method!=='POST'||request.url!=='https://api.hubapi.com/crm/v3/objects/tasks'||request.portalId!==env.STAGING_PORTAL_ID||request.body.associations.length!==1||request.body.associations[0].to.id!==env.STAGING_CONTACT_ID)throw Error('target_or_scope_changed');
    materialExecutable(JSON.parse(op.material_json),new Date().toISOString());return request;
  }
  async execute(id,approvalId,client,env){
    let op=this.db.prepare('SELECT * FROM cert_operations WHERE id=?').get(id);if(!op)throw Error('unknown_operation');
    if(op.state==='CONFIRMED')return this.status(id);
    if(['SENDING','UNKNOWN'].includes(op.state))return this.reconcileRemote(id,client);
    if(op.state==='CHECKING')return this.status(id);
    this.tx(()=>{op=this.db.prepare('SELECT * FROM cert_operations WHERE id=?').get(id);if(op.state!=='APPROVED')throw Error('operation_not_approved');this.validate(op,this.db.prepare('SELECT * FROM cert_approvals WHERE id=?').get(approvalId),env);this.db.prepare("UPDATE cert_operations SET state='CHECKING' WHERE id=?").run(id);});
    try{await client.verifyIsolation();}catch{this.db.prepare("UPDATE cert_operations SET state='APPROVED' WHERE id=? AND state='CHECKING'").run(id);this.trace(id,'ISOLATION_READ_FAILED_NO_POST');throw Error('isolation_not_verified');}
    const body=this.tx(()=>{
      op=this.db.prepare('SELECT * FROM cert_operations WHERE id=?').get(id);if(op.state!=='CHECKING')throw Error('operation_changed');
      const request=this.validate(op,this.db.prepare('SELECT * FROM cert_approvals WHERE id=?').get(approvalId),env);
      this.db.prepare("UPDATE cert_operations SET state='SENDING' WHERE id=?").run(id);this.trace(id,'POST_INTENT_DURABLY_PERSISTED',op.payload_hash);return canonical(request.body);
    });
    try{
      const created=await client.create(body);
      if(!created.id)throw Error('unconfirmed_response');
      this.db.prepare('UPDATE cert_operations SET remote_id=? WHERE id=?').run(String(created.id),id);
      this.trace(id,'REMOTE_ID_RECEIVED',op.payload_hash,String(created.id));
      return await this.reconcileRemote(id,client);
    }catch{
      this.db.prepare("UPDATE cert_operations SET state='UNKNOWN' WHERE id=? AND state!='CONFIRMED'").run(id);this.trace(id,'RESPONSE_LOST_OR_UNCONFIRMED_BLOCKED',op.payload_hash);return this.status(id);
    }
  }
  async reconcileRemote(id,client){
    const op=this.db.prepare('SELECT * FROM cert_operations WHERE id=?').get(id);if(!op)throw Error('unknown_operation');
    if(op.state==='CONFIRMED')return this.status(id);
    if(!['SENDING','UNKNOWN'].includes(op.state))throw Error('no_uncertain_submission');
    this.db.prepare("UPDATE cert_operations SET state='UNKNOWN' WHERE id=?").run(id);this.trace(id,'RECONCILIATION_STARTED',op.payload_hash);
    if(digest(op.payload_json)!==op.payload_hash)throw Error('corrupt_operation_manual_resolution_required');
    try{
      await client.verifyIsolation();
      const matches=(await client.lookup(op.correlation,op.remote_id)).filter(t=>taskMatches(t,JSON.parse(op.payload_json).body,op.correlation));
      if(matches.length!==1){this.trace(id,matches.length?'MULTIPLE_MATCHES_MANUAL_RESOLUTION':'NO_PROVEN_MATCH_BLOCKED',op.payload_hash);return this.status(id);}
      this.db.prepare("UPDATE cert_operations SET state='CONFIRMED',remote_id=? WHERE id=?").run(String(matches[0].id),id);this.trace(id,'EXISTING_TASK_RECONCILED_NO_CREATE',op.payload_hash,String(matches[0].id));
    }catch{this.trace(id,'LOOKUP_UNAVAILABLE_BLOCKED',op.payload_hash);}
    return this.status(id);
  }
  recoverChecking(){for(const op of this.db.prepare("SELECT * FROM cert_operations WHERE state IN ('CHECKING','SENDING')").all()){this.db.prepare('UPDATE cert_operations SET state=? WHERE id=?').run(op.state==='SENDING'?'UNKNOWN':'APPROVED',op.id);this.trace(op.id,op.state==='SENDING'?'RESTART_RECOVERED_UNCERTAIN_NO_CREATE':'RESTART_RECOVERED_CHECKING_BEFORE_POST',op.payload_hash);}}
  async recordVerifiedOutcome(id,externalRef,client){
    const op=this.db.prepare('SELECT * FROM cert_operations WHERE id=?').get(id);if(!op||op.state!=='CONFIRMED')throw Error('confirmed_task_required_for_certification_outcome');
    const event=await client.verifiedFixtureOutcome(externalRef);
    if(event.verified!==true||event.externalRef!==externalRef||event.taskId!==op.remote_id||!Number.isSafeInteger(event.amountMinor)||event.amountMinor<0||!/^[A-Z]{3}$/.test(event.currency))throw Error('outcome_unverified');
    return this.tx(()=>{
      const old=this.db.prepare('SELECT * FROM cert_outcomes WHERE external_ref=?').get(externalRef);
      if(old){if(old.operation_id!==id||old.amount_minor!==event.amountMinor||old.currency!==event.currency)throw Error('outcome_conflict');return {recorded:false};}
      this.db.prepare('INSERT INTO cert_outcomes VALUES(?,?,?,?,?,?)').run(externalRef,id,op.remote_id,event.amountMinor,event.currency,'LOCAL_FIXTURE_NOT_BUSINESS_REVENUE');return {recorded:true};
    });
  }
  metrics(){return {estimateKind:'SYNTHETIC_TEST_ESTIMATE_NOT_REVENUE',estimateCurrency:'USD',estimatedOpportunityValueMinor:this.db.prepare('SELECT coalesce(sum(estimated_minor),0) AS n FROM cert_operations').get().n,confirmedTaskCount:this.db.prepare("SELECT count(*) AS n FROM cert_operations WHERE state='CONFIRMED'").get().n,verifiedTestOutcomes:this.db.prepare('SELECT external_ref,remote_task_id,amount_minor,currency,verification_kind FROM cert_outcomes').all(),revenueRescued:null};}
}
export { digest };
