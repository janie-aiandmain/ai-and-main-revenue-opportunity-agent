// Mechanical finite-run limit, not a cumulative spending cap. No credentials/headers.
import {open} from 'node:fs/promises';
import {hash} from '../regression/findings-core.js';
export async function openCallJournal(path,limit){
 if(!Number.isSafeInteger(limit)||limit<1)throw Error('invalid_additional_call_limit');
 const file=await open(path,'wx',0o600);let count=0;
 return {get count(){return count;},async reserve(metadata){
  if(count>=limit)throw Error('additional_model_budget_exhausted');
  const entry={sequence:++count,reservedBeforeRequestAt:new Date().toISOString(),...metadata};
  await file.write(JSON.stringify(entry)+'\n');await file.sync();return entry;
 },async close(){await file.close();}};
}
export function boundedModelFetch({journal,requestHash,credential,current,fetcher,capture}){
 return async(url,options)=>{
  if(url!=='https://api.openai.com/v1/responses'||options?.method!=='POST'||options.redirect!=='manual')throw Error('unapproved_model_destination_or_transport');
  if(options.headers?.Authorization!=='Bearer '+credential)throw Error('nonproduction_credential_binding_mismatch');
  const {input,...request}=JSON.parse(options.body);
  if(hash(request)!==requestHash)throw Error('model_request_settings_changed');
  const call=current();if(!call||!call.caseId||!Number.isInteger(call.repeat))throw Error('planned_call_required');
  const reservation=await journal.reserve({callId:call.callId,caseId:call.caseId,repeat:call.repeat,requestBodyHash:hash(options.body)});
  const response=await fetcher(url,options);
  const receipt={...reservation,httpStatus:response.status,receivedAt:new Date().toISOString()};
  if(response.ok){
   let body;try{body=await response.clone().json();}catch{receipt.providerJsonInvalid=true;}
   if(body){receipt.providerResponseId=body.id;receipt.providerCreatedAt=body.created_at;receipt.returnedModel=body.model;receipt.usage=body.usage;
   receipt.rawModelOutput=(body.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]).find(x=>x.type==='output_text')?.text??null;}
  }
  await capture(receipt);return response;
 };
}
