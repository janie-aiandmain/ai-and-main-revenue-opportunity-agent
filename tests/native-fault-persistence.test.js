import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {build} from 'esbuild';
import {Miniflare,Log,LogLevel,convertV4MiniflareOptions} from 'miniflare';

test('actual workerd retains consumed fault and discard trace before intentional reset only after explicit storage flush',async()=>{
 const dir=await mkdtemp('/tmp/ai-main-fault-durability-');let mf;
 try{
  const file=dir+'/worker.mjs';
  await build({stdin:{resolveDir:process.cwd(),contents:`
   import {DurableObject} from 'cloudflare:workers';
   import {demoTables,consumeDemoFault,commitDemoFaultAndRestart} from './src/release/demo-execution.js';
   import {durableDatabase} from './src/staging/sql-adapter.js';
   export class Probe extends DurableObject {
    constructor(ctx,e){super(ctx,e);this.ctx=ctx;this.boot=crypto.randomUUID();this.db=durableDatabase(ctx.storage);demoTables(this.db);this.db.exec('CREATE TABLE IF NOT EXISTS traces(event TEXT)');}
    async fetch(r){
     const u=new URL(r.url),op={id:'synthetic-operation',payload_hash:'sha256:synthetic-only'};
     if(u.pathname==='/arm'){this.db.prepare('INSERT INTO release_demo_faults VALUES(?,?,0)').run(op.id,op.payload_hash);return Response.json({boot:this.boot});}
     if(u.pathname==='/discard'){
      const env={CERTIFICATION_MODE:'remote-demo',CRM_WRITEBACK_ENABLED:'false',ENABLE_GENERAL_EXECUTION:'false',GENERAL_RELEASE_APPROVED:'false',ENABLE_TEST_TASK_WRITES:'false',STAGING_PORTAL_ID:'247646122',STAGING_CONTACT_ID:'582095692487',DEMO_ONLY_EXECUTION_ENABLED:'true',DEMO_RESPONSE_LOSS_TEST_ENABLED:'true',DEMO_RELEASE_RUN_ID:'release-11111111-1111-4111-8111-111111111111',DEMO_RELEASE_MAX_CREATES:'1',DEMO_RELEASE_EXPIRES_AT:new Date(Date.now()+3600000).toISOString()};
      if(!consumeDemoFault({db:this.db,trace:(_id,event)=>this.db.prepare('INSERT INTO traces VALUES(?)').run(event)},op,env))throw Error('synthetic_fault_not_armed');
      if(u.searchParams.get('mode')==='fixed')await commitDemoFaultAndRestart(this.ctx);else this.ctx.abort('Synthetic unflushed local control');
     }
     return Response.json({boot:this.boot,fault:this.db.prepare('SELECT consumed FROM release_demo_faults WHERE operation_id=?').get(op.id),trace:this.db.prepare('SELECT event FROM traces').all()});
    }
   }
   export default {fetch(r,e){const mode=new URL(r.url).searchParams.get('mode');return e.PROBE.get(e.PROBE.idFromName(mode)).fetch(r);}}
  `},outfile:file,bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers'],logLevel:'silent'});
  mf=new Miniflare(convertV4MiniflareOptions({name:'fault-durability-local',modules:true,modulesRoot:dir,scriptPath:file,compatibilityDate:'2026-10-09',durableObjects:{PROBE:{className:'Probe',useSQLite:true}},resourcePersistencePath:dir+'/state',log:new Log(LogLevel.NONE)}));
  for(const mode of ['unflushed','fixed']){
   const before=await(await mf.dispatchFetch('http://local.test/arm?mode='+mode)).json();
   try{const response=await mf.dispatchFetch('http://local.test/discard?mode='+mode);assert.equal(response.status,500);await response.text();}catch(error){if(error.code==='ERR_ASSERTION')throw error;}
   const after=await(await mf.dispatchFetch('http://local.test/status?mode='+mode)).json();
   assert.notEqual(after.boot,before.boot);
   assert.equal(after.fault.consumed,mode==='fixed'?1:0);
   assert.deepEqual(after.trace,mode==='fixed'?[{event:'INJECTED_CREATE_RESPONSE_DISCARDED_BEFORE_SUCCESS_NOT_NETWORK_OUTAGE'}]:[]);
  }
 }finally{await mf?.dispose();await rm(dir,{recursive:true,force:true});}
});
