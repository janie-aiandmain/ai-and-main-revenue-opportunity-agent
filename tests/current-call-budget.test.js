import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {openCallJournal,boundedModelFetch} from '../scripts/release/current-call-budget.js';
import {hash} from '../scripts/regression/findings-core.js';
const request={model:'synthetic-model',reasoning:{effort:'low'}},credential='synthetic-not-a-real-key';
const options=()=>({method:'POST',redirect:'manual',headers:{Authorization:'Bearer '+credential},body:JSON.stringify({...request,input:'synthetic'})});
test('a finite task matrix may exceed 32 without disabling reservation or per-run bounds',async()=>{
 const dir=await mkdtemp('/tmp/current-eval-continuation-');let journal;
 try{
  for(const limit of [0,-1,1.5,Infinity,Number.MAX_SAFE_INTEGER+1])await assert.rejects(openCallJournal(dir+'/invalid.jsonl',limit),/invalid_additional_call_limit/);
  journal=await openCallJournal(dir+'/reservations.jsonl',33);
  for(let i=1;i<=33;i++)assert.equal((await journal.reserve({callId:'local-only-'+i})).sequence,i);
  await assert.rejects(journal.reserve({callId:'outside-plan'}),/budget_exhausted/);
  assert.equal((await readFile(dir+'/reservations.jsonl','utf8')).trim().split('\n').length,33);
 }finally{await journal?.close();await rm(dir,{recursive:true,force:true});}
});
test('bounded evaluation persists each reservation before I/O, refuses excess calls and cannot reopen/truncate its history',async()=>{
 const dir=await mkdtemp('/tmp/current-eval-budget-'),path=dir+'/reservations.jsonl';let journal;
 try{
  journal=await openCallJournal(path,2);let submitted=0;const captures=[];
  const send=boundedModelFetch({journal,requestHash:hash(request),credential,current:()=>({caseId:'synthetic-case',repeat:journal.count+1,callId:'synthetic-'+journal.count}),fetcher:async()=>{
   const records=(await readFile(path,'utf8')).trim().split('\n').map(JSON.parse);submitted++;assert.equal(records.length,submitted);assert.equal(records.at(-1).sequence,submitted);
   return Response.json({id:'synthetic-'+submitted,model:request.model,output:[]});
  },capture:async r=>captures.push(r)});
  await send('https://api.openai.com/v1/responses',options());await send('https://api.openai.com/v1/responses',options());
  await assert.rejects(send('https://api.openai.com/v1/responses',options()),/budget_exhausted/);assert.equal(submitted,2);assert.equal(captures.length,2);
  const content=await readFile(path,'utf8');assert(!content.includes(credential));assert(!content.includes('Authorization'));
  await assert.rejects(openCallJournal(path,2),{code:'EEXIST'});assert.equal(await readFile(path,'utf8'),content);
 }finally{await journal?.close();await rm(dir,{recursive:true,force:true});}
});
test('wrong destination/settings/credential cannot reserve or submit; network failures keep their reservation and are not retried',async()=>{
 const dir=await mkdtemp('/tmp/current-eval-guards-');let journal;
 try{
  journal=await openCallJournal(dir+'/reservations.jsonl',2);let submitted=0;
  const send=boundedModelFetch({journal,requestHash:hash(request),credential,current:()=>({caseId:'synthetic',repeat:1,callId:'one'}),fetcher:async()=>{submitted++;throw Error('synthetic_network_failure');},capture:async()=>{}});
  await assert.rejects(send('https://api.hubapi.com/crm/v3/objects/tasks',options()),/unapproved_model_destination/);
  await assert.rejects(send('https://api.openai.com/v1/responses',{...options(),body:JSON.stringify({model:'different',input:'synthetic'})}),/settings_changed/);
  await assert.rejects(send('https://api.openai.com/v1/responses',{...options(),headers:{Authorization:'Bearer other'}}),/credential_binding/);
  assert.equal(journal.count,0);assert.equal(submitted,0);
  await assert.rejects(send('https://api.openai.com/v1/responses',options()),/synthetic_network_failure/);assert.equal(journal.count,1);assert.equal(submitted,1);
 }finally{await journal?.close();await rm(dir,{recursive:true,force:true});}
});
test('malformed provider JSON preserves an HTTP receipt without retaining raw error bodies',async()=>{
 const dir=await mkdtemp('/tmp/current-eval-capture-');let journal;
 try{
  journal=await openCallJournal(dir+'/reservations.jsonl',1);let captured;
  const send=boundedModelFetch({journal,requestHash:hash(request),credential,current:()=>({caseId:'synthetic',repeat:1,callId:'one'}),fetcher:async()=>new Response('synthetic-unparseable-provider-body',{status:200}),capture:async r=>{captured=r;}});
  const response=await send('https://api.openai.com/v1/responses',options());assert.equal(response.status,200);assert.equal(captured.providerJsonInvalid,true);assert(!JSON.stringify(captured).includes('unparseable-provider-body'));
 }finally{await journal?.close();await rm(dir,{recursive:true,force:true});}
});
