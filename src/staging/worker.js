import { StagingBlocker,identityBlocker } from './blockers.js';
import { DurableObject } from 'cloudflare:workers';
import { DemoRecoveryLedger,DEMO_CONTRACT } from '../demo/recovery-ledger.js';
import application from '../index.js';
import { verifyOperator } from './auth.js';
import { durableDatabase } from './sql-adapter.js';
import { GeneralFindingLedger } from './general-ledger.js';
import { DesignatedNoteSource } from './note-source.js';
import { reasonCorrected } from '../findings-v0.3.3.js';
import { operatorConsole } from './operator-console.js';
import { HubSpotCertificationClient } from './hubspot-client.js';
const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
export class CertificationLedger extends DurableObject {
  constructor(ctx,env){super(ctx,env);this.demoContext=ctx;this.env=env;this.ledger=new GeneralFindingLedger(durableDatabase(ctx.storage),env);this.ledger.recoverChecking();}
  async fetch(request){
    const path=new URL(request.url).pathname;
    let input;try{input=await request.json();}catch{return json({status:'invalid_json'},400);}
    // Private namespace binding only. The public owner Worker never forwards this path.
    if(path==='/internal/demo-recovery-v1'){
      if(input.contract!==DEMO_CONTRACT)return json({status:'demo_contract_mismatch'},403);
      try{
        this.demoLedger??=new DemoRecoveryLedger(durableDatabase(this.demoContext.storage));
        this.demoLedger.initialize(input.runId);
        if(input.action==='restart'){
          this.demoLedger.beforeRestart(input.operationId);
          this.demoContext.abort('Operator-authorized synthetic recovery restart');
        }
        return json(this.demoLedger.dispatch(input));
      }catch(error){return json({status:/^[a-z0-9_]+$/.test(error.message)?error.message:'demo_ledger_blocked'},409);}
    }
    const actor=input.actor;
    if(!actor||!['Viewer','Approver','Admin'].includes(actor.role))return json({status:'verified_actor_required'},403);
    const l=this.ledger;
    try{
      if(path==='/certification/status')return json(l.status(input.operationId));
      if(path==='/certification/metrics')return json(l.metrics());
      if(path==='/certification/preflight'){
        const client=new HubSpotCertificationClient(this.env,{readOnly:true});
        await client.verifyIsolation();
        const context=await new DesignatedNoteSource(this.env).readContext();
        await client.request('/crm/v3/objects/tasks?limit=1&properties=hs_task_body');
        return json({kind:'READ_ONLY_ISOLATION_AND_IDENTITY_PREFLIGHT',identityKind:actor.kind,role:actor.role,portalId:this.env.STAGING_PORTAL_ID,contactId:this.env.STAGING_CONTACT_ID,readCredentialPortalVerified:true,writeCredentialPortalVerified:true,noteCount:context.serviceHistory.length,taskReadVerified:true,writesEnabled:this.env.ENABLE_TEST_TASK_WRITES==='true',generalExecutionEnabled:this.env.ENABLE_GENERAL_EXECUTION==='true',semanticApproval:false,productionCertification:false});
      }
      if(path==='/certification/general/findings')return json({findings:l.findings(l.contextKey(this.env))});
      if(path==='/certification/general/identity-candidates')return json({pendingIdentity:l.pendingIdentity(this.env)});
      if(!['Approver','Admin'].includes(actor.role))return json({status:'approver_required'},403);
      if(path.startsWith('/certification/general/')){
        const source=new DesignatedNoteSource(this.env);
        const reason=(context,key)=>reasonCorrected(this.env,context,key);
        if(path==='/certification/general/evaluate')return json({findings:await l.evaluate(this.env,source,reason)});
        if(path==='/certification/general/identity-review')return json(await l.resolveIdentity(input,actor,this.env,source));
        if(path==='/certification/general/review'){
          const checked=await l.review(input,actor,this.env,source);
          return json(l.finishReview(input,actor,checked,this.env));
        }
        if(path==='/certification/general/approve')return json(l.approveGeneral(input,actor));
        if(path==='/certification/general/execute')return json(await l.executeGeneral(input.operationId,input.approvalId,actor,this.env,source,reason,new HubSpotCertificationClient(this.env)));
        return json({status:'not_found'},404);
      }
      if(path==='/certification/prepare')return json(await l.prepare(input,this.env));
      if(path==='/certification/approve')return json(l.approve(input.operationId,input.payloadHash,actor));
      const client=new HubSpotCertificationClient(this.env);
      if(path==='/certification/execute')return json(await l.execute(input.operationId,input.approvalId,client,this.env));
      if(path==='/certification/reconcile')return json(await l.reconcileRemote(input.operationId,client));
      if(path==='/certification/outcome')return json(await l.recordVerifiedOutcome(input.operationId,input.externalRef,client));
      return json({status:'not_found'},404);
    }catch(e){
      if(e instanceof StagingBlocker)return json({status:e.code,blocker:e.toJSON()},e.code==='rejected_credential'?401:e.code==='insufficient_permission'?403:409);
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
    if(request.method==='POST'&&request.headers.get('Origin')&&request.headers.get('Origin')!==new URL(request.url).origin)return json({status:'cross_origin_request_forbidden'},403);
    let actor;try{actor=await verifyOperator(request,env);}catch(error){const blocker=identityBlocker(error);return json({status:blocker.code,blocker:blocker.toJSON()},blocker.code==='insufficient_permission'?403:401);}
    if(path==='/operator')return request.method==='GET'?operatorConsole(env):json({status:'get_required'},405);
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
