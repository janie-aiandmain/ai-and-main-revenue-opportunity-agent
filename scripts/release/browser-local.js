// Actual Chromium -> actual local workerd -> separate HTTP/SQLite fixture.
// All identities, model responses and remote effects are synthetic/local.
import {mkdtemp,rm,writeFile,mkdir} from 'node:fs/promises';
import {generateKeyPairSync,sign} from 'node:crypto';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare,Log,LogLevel,convertV4MiniflareOptions} from 'miniflare';
import {startFixture} from '../../certification/http-fixture.js';
const dir=await mkdtemp('/tmp/release-browser-'),evidence={kind:'EXECUTED_LOCAL_CHROMIUM_WORKER_FIXTURE_NOT_HOSTED',humanSignoffs:0,hubspotCalls:0,modelCalls:0,assertions:[]};let mf,fixture,browser,ws;let visibleText=async()=>null;
try{
 await mkdir('reports',{recursive:true});const pair=generateKeyPairSync('rsa',{modulusLength:2048}),jwk={...pair.publicKey.export({format:'jwk'}),kid:'browser-local',alg:'RS256'};
 const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url'),tokenBody=enc({alg:'RS256',kid:jwk.kid})+'.'+enc({sub:'browser-local-approver',iss:'https://certification.invalid',aud:'browser-local',exp:Math.floor(Date.now()/1000)+3600}),token=tokenBody+'.'+sign('RSA-SHA256',Buffer.from(tokenBody),pair.privateKey).toString('base64url');
 const bundle=dir+'/worker.mjs';await build({entryPoints:['src/staging/worker.js'],outfile:bundle,bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers','node:*'],logLevel:'silent'});
 fixture=await startFixture(dir+'/effects.sqlite');const text='Customer requests EV charger pricing. Do not schedule an assessment; internal pricing review only.';
 fixture.setContext([{noteId:'browser-note',timestamp:'2026-11-07T12:00:00.000Z',note:text}],[{opportunityKey:'ev-charger-pricing',classification:'strong cross-sell opportunity',opportunityType:'cross-sell',confidence:'high',evidence:[{noteId:'browser-note',quote:'Customer requests EV charger pricing.'}],reasoningSummary:'Synthetic pricing request.',recommendedNextAction:'Internal requested pricing preparation only.',humanReviewRequired:true}]);
 mf=new Miniflare(convertV4MiniflareOptions({name:'release-browser-local',host:'127.0.0.1',port:0,modules:true,modulesRoot:dir,scriptPath:bundle,compatibilityDate:'2026-10-09',compatibilityFlags:['nodejs_compat'],durableObjects:{CERTIFICATION_LEDGER:{className:'CertificationLedger',useSQLite:true}},resourcePersistencePath:dir+'/state',log:new Log(LogLevel.ERROR),bindings:{DEPLOYMENT_ENVIRONMENT:'staging',CERTIFICATION_MODE:'local',CRM_WRITEBACK_ENABLED:'false',ENABLE_TEST_TASK_WRITES:'true',ENABLE_LOCAL_GENERAL_TEST_EXECUTION:'true',STAGING_PORTAL_ID:'test-portal-001',STAGING_CONTACT_ID:'fixture-contact-001',LOCAL_HUBSPOT_FIXTURE_URL:fixture.base,STAGING_HUBSPOT_READ_TOKEN:'local-read',STAGING_HUBSPOT_WRITE_TOKEN:'local-write',ACCESS_ISSUER:'https://certification.invalid',ACCESS_AUDIENCE:'browser-local',LOCAL_TEST_JWKS_JSON:JSON.stringify({keys:[jwk]}),APPROVER_SUBJECTS_JSON:JSON.stringify({'browser-local-approver':'Approver'}),EVAL_OPENAI_API_KEY:'local-eval',LOCAL_MODEL_FIXTURE_URL:fixture.base}}));
 const address=await mf.ready;evidence.transport='Actual Chromium HTTP to Miniflare/workerd, no bridge';
 const debug=await new Promise((resolve,reject)=>{browser=spawn('/usr/bin/chromium',['--headless=new','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+dir+'/chrome','about:blank'],{stdio:['ignore','ignore','pipe']});let tail='';browser.stderr.on('data',b=>{tail+=b;const match=tail.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(match)resolve(match[1]);});browser.on('error',()=>reject(Error('chromium_start_failed')));setTimeout(()=>reject(Error('chromium_debug_start_timeout')),15000).unref();});
 const targets=await (await fetch('http://127.0.0.1:'+new URL(debug).port+'/json/list')).json();const target=targets.find(t=>t.type==='page');ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=()=>reject(Error('cdp_connect_failed'));});
 let sequence=0;const pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error('browser_cdp_error')):p.resolve(m.result);}};
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>(await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result?.value;
 visibleText=()=>evaluate('document.body.innerText');
 const until=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100));}throw Error('browser_condition_timeout');};
 const click=label=>evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent===${JSON.stringify(label)}).click()`);
 await cdp('Page.enable');await cdp('Network.enable');await cdp('Network.setExtraHTTPHeaders',{headers:{Authorization:'Bearer '+token}});await cdp('Page.navigate',{url:new URL('/operator',address).href});await until("document.body.innerText.includes('No findings.')");evidence.assertions.push('console_loaded_with_ephemeral_signed_test_identity');
 await click('Evaluate designated notes');await until("document.querySelectorAll('article').length===1");
 assert.equal(await evaluate("Array.from(document.querySelectorAll('blockquote')).some(x=>x.innerText.includes('Do not schedule an assessment'))"),true);evidence.assertions.push('source_restriction_completed_and_visible');
 const due=new Date(Date.now()+7200000).toISOString().slice(0,16);await evaluate(`document.querySelector('input[type=checkbox]').checked=true;document.querySelector('input[type=datetime-local]').value=${JSON.stringify(due)};`);await click('Prepare for review');await until("document.body.innerText.includes('Final task for your approval')");
 assert.equal(await evaluate("document.body.innerText.includes('No customer action is authorized')"),true);evidence.assertions.push('ordinary_preview_shows_exact_due_scope_and_authority');
 const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile('reports/release-browser-preview.png',Buffer.from(shot.data,'base64'));
 // A click near the bottom of a long preview must expose both rejection and
 // success locally. A message elsewhere in document.body is insufficient.
 await evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Approve exact task').scrollIntoView({block:'center'})");
 const expiredBody=enc({alg:'RS256',kid:jwk.kid})+'.'+enc({sub:'browser-local-approver',iss:'https://certification.invalid',aud:'browser-local',exp:Math.floor(Date.now()/1000)-60}),expiredToken=expiredBody+'.'+sign('RSA-SHA256',Buffer.from(expiredBody),pair.privateKey).toString('base64url');
 await cdp('Network.setExtraHTTPHeaders',{headers:{Authorization:'Bearer '+expiredToken}});
 await click('Approve exact task');await until("document.getElementById('message').textContent.includes('rejected_credential')");
 assert.equal(fixture.allTasks().length,0);evidence.assertions.push('expired_identity_approval_creates_no_task');
 assert.equal(await evaluate("Array.from(document.querySelector('article').querySelectorAll('[role=status]')).some(e=>e.textContent.includes('rejected_credential')&&e.getBoundingClientRect().bottom>0&&e.getBoundingClientRect().top<innerHeight)"),true,'approval rejection must be visible beside the finding controls');
 evidence.assertions.push('approval_rejection_visible_beside_controls');
 await cdp('Network.setExtraHTTPHeaders',{headers:{Authorization:'Bearer '+token}});
 await click('Approve exact task');await until("document.body.innerText.includes('Exact task approved')");
 assert.equal(await evaluate("Array.from(document.querySelector('article').querySelectorAll('[role=status]')).some(e=>e.textContent.includes('Exact task approved')&&e.getBoundingClientRect().bottom>0&&e.getBoundingClientRect().top<innerHeight)"),true,'approval confirmation must be visible beside the finding controls');
 assert.equal(await evaluate("document.querySelector('article').innerText.includes('Approval receipt')"),true);
 assert.equal(fixture.allTasks().length,0);evidence.assertions.push('approval_success_visible_with_receipt_and_no_create');
 const firstReceipt=await evaluate("JSON.parse(document.querySelector('details[data-approval-receipt] pre').textContent)");
 await cdp('Page.reload');await until("document.body.innerText.includes('Resume saved approval')");
 await click('Resume saved approval');await until("document.body.innerText.includes('Saved approval resumed')");
 const resumedReceipt=await evaluate("JSON.parse(document.querySelector('details[data-approval-receipt] pre').textContent)");
 assert.equal(resumedReceipt.approvalId,firstReceipt.approvalId);assert.equal(resumedReceipt.payloadHash,firstReceipt.payloadHash);assert.equal(resumedReceipt.actionVersion,firstReceipt.actionVersion);assert.equal(fixture.allTasks().length,0);
 evidence.assertions.push('reload_resumes_same_approval_and_exact_payload_without_new_grant_or_task');
 await click('Submit approved task');await until("document.body.innerText.includes('Task confirmed in HubSpot')");await click('Submit approved task');await new Promise(r=>setTimeout(r,200));assert.equal(fixture.allTasks().length,1);evidence.assertions.push('approve_submit_repeat_creates_one_local_fixture_task');
 evidence.fixtureTaskIds=fixture.allTasks().map(x=>x.id);evidence.fixtureCreateCount=1;evidence.browser='Chromium headless';evidence.complete=true;
}catch(error){evidence.failure=error.message;evidence.visibleUiText=await visibleText().catch(()=>null);evidence.fixtureModelCalls=fixture?.modelCalls();process.exitCode=1;}
finally{ws?.close();if(browser&&browser.exitCode===null){const exited=new Promise(resolve=>browser.once('exit',resolve));browser.kill('SIGTERM');await Promise.race([exited,new Promise(resolve=>setTimeout(resolve,3000))]);}await mf?.dispose();await fixture?.close();try{await rm(dir,{recursive:true,force:true,maxRetries:8,retryDelay:200});}catch{evidence.cleanupWarning='temporary_chrome_profile_removal_deferred';}await writeFile(process.env.RELEASE_BROWSER_EVIDENCE_PATH||'reports/release-browser-local.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));}
