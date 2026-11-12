// Actual local Chromium rendering; fixture reads only, no Worker/CRM/model calls.
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {operatorConsole} from '../../src/staging/operator-console.js';
import {materializeCorrected} from '../../src/release/reasoning.js';
import {prepareHistory} from '../../src/findings.js';
import {inspectFinding} from '../../src/staging/review-policy.js';
const out='docs/review/in-progress-scope/',dir=await mkdtemp('/tmp/scope-browser-');let browser,ws,server;
const evidence={kind:'ACTUAL_LOCAL_CHROMIUM_FIXTURE_RENDER_NOT_HOSTED',modelCalls:0,hubspotCalls:0,taskCreates:0,assertions:[]};
try{
 const packet=JSON.parse(await readFile('docs/review/semantic-diagnostic-cycle/review-packet.json','utf8'));
 const source=packet.items.find(x=>x.caseId==='ST03'),history=await prepareHistory(source.sourceContext),{findingId,proposedAction,...raw}=source.finding;
 const scoped=(await materializeCorrected({findings:[raw]},history,'synthetic:ST03','2026-11-12T12:00:00Z')).findings[0];
 const normalHistory=await prepareHistory({serviceHistory:[{noteId:'normal',timestamp:'2026-10-22T14:00:00Z',note:'Customer requests pricing for a water filter.'}]});
 const normal=(await materializeCorrected({findings:[{opportunityKey:'water-filter',classification:'strong cross-sell opportunity',opportunityType:'cross-sell',confidence:'high',evidence:[{noteId:'normal',quote:normalHistory[0].note}],reasoningSummary:'Synthetic pricing request.',recommendedNextAction:'Internal pricing preparation only.',humanReviewRequired:true}]},normalHistory,'synthetic:normal','2026-11-12T12:00:00Z')).findings[0];
 const view=(f,h)=>({findingId:f.findingId,reviewState:'PENDING',modelFinding:f,inspection:inspectFinding(f,h,[f],'2026-11-12T12:00:00Z')});
 const findings=[view(normal,normalHistory),view(scoped,history)],reads=[];
 server=createServer(async(req,res)=>{if(req.url==='/'){const r=operatorConsole({STAGING_PORTAL_ID:'synthetic',STAGING_CONTACT_ID:'synthetic'});res.writeHead(200,Object.fromEntries(r.headers));res.end(await r.text());return;}
  if(req.url==='/certification/session'||req.url==='/certification/general/findings'){reads.push(req.url);res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(req.url.endsWith('/session')?{role:'Viewer',syntheticDemoTestEnabled:false,syntheticResponseLossEnabled:false}:{findings}));return;}
  res.writeHead(404);res.end();});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const endpoint=await new Promise((resolve,reject)=>{browser=spawn('/usr/bin/chromium',['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+dir,'about:blank'],{stdio:['ignore','ignore','pipe']});let text='';browser.stderr.on('data',b=>{text+=b;const m=text.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m)resolve(m[1]);});browser.on('error',reject);setTimeout(()=>reject(Error('chromium_start_timeout')),15000).unref();});
 const targets=await(await fetch('http://127.0.0.1:'+new URL(endpoint).port+'/json/list')).json();
 ws=new WebSocket(targets.find(x=>x.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 let id=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error('cdp_error')):p.resolve(m.result);}};
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}));});
 const evaluate=async expression=>(await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result?.value;
 await cdp('Page.enable');await cdp('Emulation.setDeviceMetricsOverride',{width:1100,height:1000,deviceScaleFactor:1,mobile:false});
 await cdp('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'});
 let ready=false;for(let i=0;i<100;i++){if(await evaluate("document.querySelectorAll('article').length===2")){ready=true;break;}await new Promise(r=>setTimeout(r,50));}assert(ready,'console did not render');
 assert.equal(await evaluate("document.querySelector('article').classList.contains('immediate-review')"),true);
 assert.equal(await evaluate("document.querySelector('article .urgent-badge').innerText"),'IMMEDIATE REVIEW · In-progress scope request');
 assert.equal(await evaluate("document.querySelector('article select').value"),'HIGH');
 assert.equal(await evaluate("document.querySelector('article').innerText.includes('crew/team reported onsite')"),true);
 assert.equal(await evaluate("document.querySelector('article').innerText.includes('Historical source')"),true);
 assert.equal(await evaluate("document.querySelector('article').innerText.includes('Current job/onsite status remains unverified')"),true);
 assert.equal(await evaluate("document.querySelectorAll('article.immediate-review').length"),1);
 evidence.assertions=['urgent scope card sorted ahead of ordinary pricing','immediate-review badge and count visible','HIGH priority selected from proposed payload','onsite source context and historical timestamp visible','current job status remains unverified','ordinary pricing card is not tagged','no approve/submit/preflight/evaluate action invoked'];
 const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(out+'console-preview.png',Buffer.from(shot.data,'base64'));
 evidence.fixtureReads=reads;evidence.complete=true;
}catch(error){evidence.failure=error.message;process.exitCode=1;}
finally{ws?.close();if(browser&&browser.exitCode===null){const exited=new Promise(resolve=>browser.once('exit',resolve));browser.kill('SIGTERM');await Promise.race([exited,new Promise(resolve=>setTimeout(resolve,2000))]);}if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}await rm(dir,{recursive:true,force:true,maxRetries:5,retryDelay:100});await writeFile(out+'browser.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));}
