import { DurableObject } from 'cloudflare:workers';
import application from '../index.js';
import { verifyOperator } from './auth.js';
import { durableDatabase } from './sql-adapter.js';
import { StagingOperationLedger } from './operation-ledger.js';
import { HubSpotCertificationClient } from './hubspot-client.js';
const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
export class CertificationLedger extends DurableObject {
  constructor(ctx,env){super(ctx,env);this.env=env;this.ledger=new StagingOperationLedger(durableDatabase(ctx.storage));this.ledger.recoverChecking();}
  async fetch(request){
    const path=new URL(request.url).pathname;
    let input;try{input=await request.json();}catch{return json({status:'invalid_json'},400);}
    const actor=input.actor;
    if(!actor||!['Viewer','Approver','Admin'].includes(actor.role))return json({status:'verified_actor_required'},403);
    const l=this.ledger;
    try{
      if(path==='/certification/status')return json(l.status(input.operationId));
      if(path==='/certification/metrics')return json(l.metrics());
      if(!['Approver','Admin'].includes(actor.role))return json({status:'approver_required'},403);
      if(path==='/certification/prepare')return json(await l.prepare(input,this.env));
      if(path==='/certification/approve')return json(l.approve(input.operationId,input.payloadHash,actor));
      const client=new HubSpotCertificationClient(this.env);
      if(path==='/certification/execute')return json(await l.execute(input.operationId,input.approvalId,client,this.env));
      if(path==='/certification/reconcile')return json(await l.reconcileRemote(input.operationId,client));
      if(path==='/certification/outcome')return json(await l.recordVerifiedOutcome(input.operationId,input.externalRef,client));
      return json({status:'not_found'},404);
    }catch(e){
      const message=String(e.message);
      const safe=/^[a-z0-9_:]+$/i.test(message)?message:'certification_operation_blocked';
      return json({status:safe,humanReview:safe.startsWith('human_review_pending')?'PENDING':undefined},safe.startsWith('human_review_pending')?423:409);
    }
  }
}
export default {
  async fetch(request,env){
    const path=new URL(request.url).pathname;
    if(path==='/health')return json({service:'AI & MAIN isolated staging certification',environment:env.DEPLOYMENT_ENVIRONMENT,productionWritebackEnabled:false,hostedCertified:false});
    if(path==='/writeback-task')return json({status:'legacy_writeback_disabled'},403);
    if(env.DEPLOYMENT_ENVIRONMENT!=='staging'||env.CRM_WRITEBACK_ENABLED!=='false')return json({status:'staging_only_production_writeback_must_be_false'},403);
    let actor;try{actor=await verifyOperator(request,env);}catch{return json({status:'identity_missing_invalid_or_unconfigured'},401);}
    if(!path.startsWith('/certification/')){
      if(request.method!=='GET')return json({status:'read_only_application'},405);
      return application.fetch(request,env);
    }
    if(request.method!=='POST')return json({status:'post_required'},405);
    const content=await request.text();if(content.length>16000)return json({status:'request_too_large'},413);
    let body;try{body=JSON.parse(content);}catch{return json({status:'invalid_json'},400);}
    if(!env.CERTIFICATION_LEDGER||!env.STAGING_PORTAL_ID)return json({status:'durable_staging_not_configured'},503);
    const stub=env.CERTIFICATION_LEDGER.get(env.CERTIFICATION_LEDGER.idFromName('isolated-portal:'+env.STAGING_PORTAL_ID));
    return stub.fetch(new Request('https://private-ledger'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...body,actor})}));
  },
};
