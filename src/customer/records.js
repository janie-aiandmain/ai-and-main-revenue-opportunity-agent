import {DesignatedNoteSource} from '../staging/note-source.js';
import {GeneralFindingLedger} from '../staging/general-ledger.js';
import {reasonCorrected} from '../release/reasoning.js';
import {customerConfiguration,requireRole,numeric} from './policy.js';

export class PermittedHubSpotRecords {
 constructor(db,env,connection,{flush=async()=>{},reason=reasonCorrected}={}){this.db=db;this.env=env;this.connection=connection;this.flush=flush;this.reason=reason;db.exec('CREATE TABLE IF NOT EXISTS hubspot_record_evaluations(contact_id TEXT PRIMARY KEY,generation INTEGER NOT NULL,permission_version TEXT NOT NULL)');}
 scope(id,actor,roles=['Viewer','Approver','Admin']){
  requireRole(actor,roles);if(!numeric(id))throw Error('permitted_contact_id_required');const cfg=customerConfiguration(this.env),s=this.connection.state(),p=this.connection.membership(id,s.generation);
  const env={...this.env,DEPLOYMENT_ENVIRONMENT:'customer',CERTIFICATION_MODE:'remote-single-tenant',STAGING_PORTAL_ID:s.portalId,STAGING_CONTACT_ID:id,APPROVED_PORTAL_ID:s.portalId,APPROVED_CONTACT_ID:id,TENANT_CONFIGURATION_APPROVED:'true',SYNTHETIC_RECORDS_ONLY:String(cfg.synthetic)};
  const guard=()=>{requireRole(actor,roles);this.connection.membership(id,s.generation,p.permission_version);};
  const ledger=new GeneralFindingLedger(this.db,env),source=new DesignatedNoteSource(env,{get:async path=>{guard();const result=await this.connection.get(path,s.generation);guard();return result;}});
  return {env,ledger,source,guard,generation:s.generation,permissionVersion:p.permission_version};
 }
 findings(id,actor){const c=this.scope(id,actor),stamp=this.db.prepare('SELECT * FROM hubspot_record_evaluations WHERE contact_id=?').get(id),context=this.db.prepare('SELECT state FROM general_contexts WHERE context_key=?').get(c.ledger.contextKey(c.env)),current=context?.state==='READY'&&stamp?.generation===c.generation&&stamp?.permission_version===c.permissionVersion;return {contactId:id,findings:current?c.ledger.findings(c.ledger.contextKey(c.env)):[],needsEvaluation:!current,executionApproved:false};}
 async evaluate(id,actor){
  const c=this.scope(id,actor,['Approver','Admin']);
  const findings=await c.ledger.evaluate(c.env,c.source,async(ctx,k)=>{c.guard();const result=await this.reason(c.env,ctx,k);c.guard();return result;});c.guard();this.db.prepare('INSERT INTO hubspot_record_evaluations VALUES(?,?,?) ON CONFLICT(contact_id) DO UPDATE SET generation=excluded.generation,permission_version=excluded.permission_version').run(id,c.generation,c.permissionVersion);await this.flush();c.guard();
  return {contactId:id,findings,providerCallMade:true,executionApproved:false};
 }
 invalidate(id){
  const s=this.connection.state(),key='hubspot:'+s.portalId+':contact:'+id,ledger=new GeneralFindingLedger(this.db,this.env);
  for(const row of this.db.prepare('SELECT op_id FROM general_findings WHERE context_key=?').all(key))ledger.revokeForFinding(row.op_id,'CUSTOMER_RECORD_PERMISSION_OR_CONNECTION_REVOKED');
  this.db.prepare("UPDATE general_contexts SET state='FAILED',generation=generation+1 WHERE context_key=?").run(key);
  this.db.prepare("UPDATE general_findings SET review_state='PENDING' WHERE context_key=?").run(key);
 }
 invalidateAll(){const s=this.connection.state();for(const row of this.db.prepare('SELECT contact_id FROM hubspot_permitted_records WHERE generation=?').all(s.generation))this.invalidate(row.contact_id);}
}
