import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {build} from 'esbuild';
import {Miniflare,Log,LogLevel,convertV4MiniflareOptions} from 'miniflare';
test('actual workerd accepts guarded HTTP fetch and rejects redirects without forwarding credentials',async()=>{
 const dir=await mkdtemp('/tmp/release-native-fetch-');let mf;const paths=[];
 const server=createServer((req,res)=>{paths.push(req.url);if(req.url==='/redirect'){res.writeHead(302,{location:'/must-not-follow'});res.end();}else{res.writeHead(200,{'content-type':'application/json'});res.end('{"synthetic":true}');}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
 const script=dir+'/worker.mjs';await build({stdin:{contents:`import {checkedJsonFetch} from './src/staging/blockers.js';export default {async fetch(r,e){try{return Response.json(await checkedJsonFetch(e.BASE+new URL(r.url).pathname,{headers:{Authorization:'Bearer synthetic-only'}},'TEST','native fetch'));}catch(x){return Response.json({code:x.code},{status:409});}}}`,resolveDir:process.cwd()},outfile:script,bundle:true,format:'esm',platform:'browser',logLevel:'silent'});
 mf=new Miniflare(convertV4MiniflareOptions({modules:true,modulesRoot:dir,scriptPath:script,compatibilityDate:'2026-10-09',log:new Log(LogLevel.ERROR),bindings:{BASE:'http://127.0.0.1:'+server.address().port}}));
 const normal=await mf.dispatchFetch('http://worker.test/ok');assert.equal(normal.status,200);assert.deepEqual(await normal.json(),{synthetic:true});const redirect=await mf.dispatchFetch('http://worker.test/redirect');assert.equal((await redirect.json()).code,'upstream_redirect_rejected');assert.deepEqual(paths,['/ok','/redirect']);
 }finally{await mf?.dispose();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
});
