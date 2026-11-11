import {Miniflare,Log,LogLevel,convertV4MiniflareOptions} from '/workspace/ai-and-main-revenue-opportunity-agent/node_modules/miniflare/dist/src/index.js';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/ai-main-flush-probe-');let mf;const rows=[];
try{
 const path=dir+'/worker.mjs';await writeFile(path,`import {DurableObject} from 'cloudflare:workers';export class Probe extends DurableObject {constructor(ctx,e){super(ctx,e);this.ctx=ctx;this.boot=crypto.randomUUID();ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS markers(stage TEXT)');}async fetch(r){const u=new URL(r.url);if(u.pathname==='/intent'){this.ctx.storage.sql.exec('INSERT INTO markers VALUES(?)','INTENT_DURABLE');return Response.json({boot:this.boot});}if(u.pathname==='/abort'){this.ctx.storage.sql.exec('INSERT INTO markers VALUES(?)','POST_CREATE_DISCARD_SIMULATED_NO_REMOTE_CALL');if(u.searchParams.get('flush')==='yes')await this.ctx.storage.sync();this.ctx.abort('Synthetic local durability probe');}return Response.json({boot:this.boot,syncSupported:typeof this.ctx.storage.sync==='function',markers:this.ctx.storage.sql.exec('SELECT stage FROM markers').toArray()});}}export default {fetch(r,e){const n=new URL(r.url).searchParams.get('flush')||'no';return e.PROBE.get(e.PROBE.idFromName(n)).fetch(r);}}`);
 mf=new Miniflare(convertV4MiniflareOptions({name:'fault-flush-local-probe',modules:true,modulesRoot:dir,scriptPath:path,compatibilityDate:'2026-10-09',durableObjects:{PROBE:{className:'Probe',useSQLite:true}},resourcePersistencePath:dir+'/state',log:new Log(LogLevel.NONE)}));
 for(const flush of ['no','yes']){
  const before=await(await mf.dispatchFetch('http://local.test/intent?flush='+flush)).json();let interruption;
  try{const response=await mf.dispatchFetch('http://local.test/abort?flush='+flush);interruption='http_'+response.status;await response.text();}catch{interruption='transport_interrupted';}
  const after=await(await mf.dispatchFetch('http://local.test/status?flush='+flush)).json();rows.push({flush,interruption,beforeBoot:before.boot,...after,bootChanged:before.boot!==after.boot});
 }
 const result={kind:'LOCAL_ACTUAL_WORKER_SQLITE_ABORT_DURABILITY_PROBE_NOT_HOSTED',hubspotCalls:0,modelCalls:0,rows};await writeFile('/workspace/ai-and-main-revenue-opportunity-agent/reports/fault-flush-probe.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await mf?.dispose();await rm(dir,{recursive:true,force:true});}
