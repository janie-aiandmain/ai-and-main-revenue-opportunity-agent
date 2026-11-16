// Local Chromium against mocked API receipts. No remote, model, CRM or email calls.
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {operatorConsole,IDENTITY_REVIEW_UI_POLICY} from '../../src/staging/operator-console.js';
const dir=await mkdtemp('/tmp/identity-browser-'),requests=[],out=process.env.IDENTITY_BROWSER_REPORT||'/tmp/identity-browser.json';
const raw=(key,noteId,quote)=>({opportunityKey:key,classification:'strong cross-sell opportunity',opportunityType:'cross-sell',confidence:'high',evidence:[{noteId,quote}],recommendedNextAction:'Internal pricing preparation only. No customer action.',proposedAction:{actionPayload:{properties:{hs_task_priority:'HIGH'}},material:{evidence:[{noteId,timestamp:'2026-11-16T12:00:00Z'}]},actionPurpose:'internal_preparation'}});
const ev=raw('ev-pricing','old-note','Pricing for one EV charger only.'),surge=raw('surge-pricing','new-note','Pricing for one surge protector only.');
const old={findingId:'op_existing',modelFinding:ev,reviewState:'PENDING',inspection:{qualityFailures:[],executionBlocks:[]},operation:{operationId:'operation_existing',state:'CONFIRMED',remoteTaskId:'task_existing'}};
let pending={generation:7,sourceHash:'synthetic-source-hash',humanReview:'PENDING',candidates:[{candidateRef:'raw_ev',finding:ev},{candidateRef:'raw_surge',finding:surge}]},findings=[old],role='Approver',submission;
let server,browser,ws;
try{
 server=createServer(async(req,res)=>{if(req.url==='/'){const r=operatorConsole({STAGING_PORTAL_ID:'synthetic',STAGING_CONTACT_ID:'synthetic'});res.writeHead(200,Object.fromEntries(r.headers));res.end(await r.text());return;}
 let body='';for await(const c of req)body+=c;requests.push({path:req.url,body:body?JSON.parse(body):null});
 let value;if(req.url==='/certification/session')value={role};else if(req.url==='/certification/general/findings')value={findings};else if(req.url==='/certification/general/identity-candidates')value={pendingIdentity:pending};else if(req.url==='/certification/general/identity-review'){
  submission=JSON.parse(body);findings=[old,{...old,findingId:'op_new',modelFinding:surge,operation:null}];pending=null;
  value={identityKind:'LOCAL_SYNTHETIC',humanSignoff:'NOT_HUMAN_SIGNOFF',semanticReviewStillRequired:true,findings};
 }else{res.writeHead(404);res.end();return;}res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(value));
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const endpoint=await new Promise((resolve,reject)=>{browser=spawn('/usr/bin/chromium',['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+dir,'about:blank'],{stdio:['ignore','ignore','pipe']});let s='';browser.stderr.on('data',b=>{s+=b;const m=s.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m)resolve(m[1]);});browser.on('error',reject);setTimeout(()=>reject(Error('chromium_start_timeout')),15000).unref();});
 const targets=await(await fetch('http://127.0.0.1:'+new URL(endpoint).port+'/json/list')).json();ws=new WebSocket(targets.find(x=>x.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 let id=0;const messages=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data),p=messages.get(m.id);if(p){messages.delete(m.id);m.error?p.reject(Error('cdp_error')):p.resolve(m.result);}};
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;messages.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}));});
 const run=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result?.value;};
 const wait=async expression=>{for(let i=0;i<100;i++){if(await run(expression))return;await new Promise(r=>setTimeout(r,30));}throw Error('browser_assertion_timeout: '+expression);};
 await cdp('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'});await wait("document.querySelectorAll('#findings article').length===1");
 await run("document.getElementById('identity-review').click()");await wait("document.querySelectorAll('#identity-panel select').length===2");
 assert.deepEqual(await run("Array.from(document.querySelectorAll('#identity-panel select'),s=>s.value)"),['','']);
 assert.match(await run("document.getElementById('identity-panel').textContent"),/CONFIRMED.*task_existing/);
 await run("document.querySelector('#identity-panel button').click()");await wait("document.getElementById('message').textContent.includes('attestation')");assert.equal(submission,undefined);
 await run("document.querySelector('#identity-panel input').checked=true;document.querySelector('#identity-panel button').click()");await wait("document.getElementById('message').textContent.includes('every candidate')");assert.equal(submission,undefined);
 await run("document.querySelectorAll('#identity-panel select').forEach(s=>s.value='op_existing');document.querySelector('#identity-panel button').click()");await wait("document.getElementById('message').textContent.includes('cannot share')");assert.equal(submission,undefined);
 await run("document.querySelectorAll('#identity-panel select')[1].value='NEW';document.querySelector('#identity-panel button').click()");await wait("document.getElementById('message').textContent.includes('Identity review complete')");
 assert.deepEqual(submission,{generation:7,sourceHash:'synthetic-source-hash',bindings:[{candidateRef:'raw_ev',resolution:'EXISTING',findingId:'op_existing'},{candidateRef:'raw_surge',resolution:'NEW'}],attestHumanReview:true,distinctNeedsConfirmed:true});
 assert.equal(findings[0].operation.remoteTaskId,'task_existing');assert.equal(requests.filter(r=>r.path.endsWith('/identity-review')).length,1);
 assert.ok(requests.every(r=>['/certification/session','/certification/general/findings','/certification/general/identity-candidates','/certification/general/identity-review'].includes(r.path)));
 // Reopen a pending receipt as Viewer: reads allowed, identity submission unavailable.
 role='Viewer';pending={generation:8,sourceHash:'synthetic-next',candidates:[{candidateRef:'raw_ev',finding:ev}]};
 await run("document.getElementById('identity-review').click()");await wait("document.querySelectorAll('#identity-panel select').length===1");
 assert.equal(await run("document.querySelector('#identity-panel button').disabled"),true);assert.equal(await run("document.querySelector('#identity-panel input').disabled"),true);
 const report={kind:'ACTUAL_LOCAL_CHROMIUM_MOCKED_IDENTITY_REVIEW_NOT_HOSTED',policy:IDENTITY_REVIEW_UI_POLICY,passed:true,assertions:['pending candidates and existing confirmed task visible','no automatic selections','attestation required','complete explicit mapping required','duplicate existing mapping rejected','exact generation/source/candidate bindings submitted once','Viewer cannot confirm','no evaluate/approve/submit/email API calls'],requestPaths:requests.map(r=>r.path),modelCalls:0,hubspotCalls:0,emailProviderCalls:0,taskCreates:0};
 await writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{ws?.close();browser?.kill();if(server)await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
