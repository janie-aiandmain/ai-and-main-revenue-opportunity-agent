import {DurableObject} from 'cloudflare:workers';
import {durableDatabase} from '../staging/sql-adapter.js';
import {HubSpotConnection} from './connection.js';
import {PermittedHubSpotRecords} from './records.js';
import {customerConfiguration,requireRole,numeric} from './policy.js';
import {customerFetch,json,safeFailure} from './http.js';
export class HubSpotCustomerLedger extends DurableObject {
 constructor(ctx,env){super(ctx,env);this.ctx=ctx;this.env=env;this.db=durableDatabase(ctx.storage);this.connection=new HubSpotConnection(this.db,env,{flush:()=>ctx.storage.sync()});this.connection.recover();this.records=new PermittedHubSpotRecords(this.db,env,this.connection,{flush:()=>ctx.storage.sync()});}
 async fetch(request){
  try{
   const cfg=customerConfiguration(this.env),expected=this.env.HUBSPOT_CUSTOMER_LEDGER.idFromName('hubspot-installation:'+cfg.installationId);if(expected.toString()!==this.ctx.id.toString())throw Error('installation_storage_identity_mismatch');
   const {actor,body}=await request.json(),action=new URL(request.url).pathname.slice(1);requireRole(actor,['Viewer','Approver','Admin']);const alarm=await this.ctx.storage.getAlarm();if(alarm===null)await this.ctx.storage.setAlarm(Date.now()+86400000);requireRole(actor,['Viewer','Approver','Admin']);let result;
   if(action==='status'||action==='records')result={...this.connection.status(),role:actor.role,syntheticRecordsOnly:cfg.synthetic};
   else if(action==='connect')result=await this.connection.begin(actor);
   else if(action==='callback'){const oldIds=this.connection.records().map(r=>r.contactId);result=await this.connection.callback(body,actor);for(const id of oldIds)this.records.invalidate(id);}
   else if(action==='disconnect'){requireRole(actor,['Admin']);this.records.invalidateAll();result=await this.connection.disconnect(actor);}
   else if(action==='permit')result=await this.connection.add(body.recordLink,actor);
   else if(action==='remove'){if(!numeric(body.contactId))throw Error('permitted_contact_id_required');result=await this.connection.remove(body.contactId,actor);this.records.invalidate(body.contactId);}
   else if(action==='findings')result=this.records.findings(body.contactId,actor);
   else if(action==='evaluate')result=await this.records.evaluate(body.contactId,actor);
   else return json({status:'private_action_not_supported'},404);
   return json(result);
  }catch(error){return safeFailure(error);}
 }
 async alarm(){
  const days=Number(this.env.AUDIT_RETENTION_DAYS??365);if(!Number.isInteger(days)||days<1||days>3650)throw Error('invalid_audit_retention');
  this.db.prepare('DELETE FROM hubspot_oauth_states WHERE expires_at<=?').run(Date.now());this.db.prepare('DELETE FROM hubspot_connection_audit WHERE at<?').run(new Date(Date.now()-days*86400000).toISOString());
  // Reuse the existing minimal operation-audit retention implementation.
  const {GeneralFindingLedger}=await import('../staging/general-ledger.js');new GeneralFindingLedger(this.db,this.env).pruneAuditMetadata(days);
  await this.ctx.storage.setAlarm(Date.now()+86400000);
 }
}
export default {fetch:customerFetch};
