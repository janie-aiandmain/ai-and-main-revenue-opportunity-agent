import {DEMO_CONTRACT,hash} from './recovery-ledger.js';
export const PORTAL='247646122',CONTACT='582095692487',MARKER='AI_MAIN_CERTIFICATION_ONLY';
export class DemoHubSpot {
 constructor(env){this.env=env;if(!env.HUBSPOT_ACCESS_TOKEN||!env.HUBSPOT_WRITE_TOKEN)throw Error('existing_hubspot_credentials_missing');if(env.HUBSPOT_ACCESS_TOKEN===env.HUBSPOT_WRITE_TOKEN)throw Error('separate_credentials_required');}
 async get(path,writer=false){return this.request(path,{method:'GET'},writer);}
 async request(path,options,writer=false){
  let r;try{r=await fetch('https://api.hubapi.com'+path,{...options,redirect:'error',headers:{Authorization:'Bearer '+this.env[writer?'HUBSPOT_WRITE_TOKEN':'HUBSPOT_ACCESS_TOKEN'],'Content-Type':'application/json'},signal:AbortSignal.timeout(20000)});}catch{throw Error('hubspot_transport_outcome_unknown');}
  if(!r.ok){await r.body?.cancel();throw Error(r.status===401?'hubspot_credential_rejected':r.status===403?'hubspot_insufficient_permission':'hubspot_http_'+r.status);}
  return r;
 }
 async preflight(){
  const reader=await (await this.get('/account-info/v3/details')).json();if(String(reader.portalId)!==PORTAL)throw Error('read_credential_portal_mismatch');
  const writer=await (await this.get('/account-info/v3/details',true)).json();if(String(writer.portalId)!==PORTAL)throw Error('write_credential_portal_mismatch');
  const c=await (await this.get('/crm/v3/objects/contacts/'+CONTACT+'?properties=firstname')).json();if(String(c.id)!==CONTACT||c.properties?.firstname!==MARKER)throw Error('designated_contact_marker_mismatch');
  const taskRead=await (await this.get('/crm/v3/objects/tasks?limit=1&properties=hs_task_body')).json();if(!Array.isArray(taskRead.results))throw Error('task_readback_not_verified');
  return {taskReadVerified:true,kind:'READ_ONLY_DEMO_PREFLIGHT',readPortalId:PORTAL,writePortalId:PORTAL,contactId:CONTACT,marker:MARKER,sourceContract:DEMO_CONTRACT,sourceHash:hash({readPortalId:PORTAL,writePortalId:PORTAL,contactId:CONTACT,marker:MARKER,sourceContract:DEMO_CONTRACT}),semanticReviews:'PENDING_NOT_APPLICABLE_TO_SYNTHETIC_CONTROL'};
 }
 async create(request){if(request.method!=='POST'||request.url!=='https://api.hubapi.com/crm/v3/objects/tasks'||request.portalId!==PORTAL||request.body.associations?.length!==1||request.body.associations[0].to.id!==CONTACT)throw Error('demo_target_changed');return this.request('/crm/v3/objects/tasks',{method:'POST',body:JSON.stringify(request.body)},true);}
 async lookup(correlation){
  const candidates=[];let after='';
  for(let page=0;page<100;page++){
   const data=await (await this.get('/crm/v3/objects/tasks?limit=100&properties=hs_task_body'+(after?'&after='+encodeURIComponent(after):''))).json();
   if(!Array.isArray(data.results))throw Error('task_lookup_incomplete');
   for(const t of data.results)if(typeof t.properties?.hs_task_body==='string'&&t.properties.hs_task_body.includes('[AI_MAIN_CORRELATION:'+correlation+']')){
    const task=await (await this.get('/crm/v3/objects/tasks/'+encodeURIComponent(t.id)+'?properties=hs_task_subject,hs_task_body,hs_task_priority,hs_task_status,hs_task_type,hs_timestamp&associations=contacts')).json();
    if(task.associations?.contacts?.paging?.next)throw Error('task_contact_associations_incomplete');candidates.push(task);
   }
   after=data.paging?.next?.after;if(!after)return candidates;
  }throw Error('task_lookup_limit_incomplete');
 }
}
export function exactTaskMatch(task,request,correlation){
 if(!task?.id||!task.properties?.hs_task_body?.includes('[AI_MAIN_CORRELATION:'+correlation+']'))return false;
 for(const [k,v]of Object.entries(request.body.properties)){if(k==='hs_timestamp'){if(Date.parse(task.properties[k])!==Date.parse(v))return false;}else if(task.properties[k]!==v)return false;}
 const ids=task.associations?.contacts?.results?.map(r=>String(r.id)).sort();return JSON.stringify(ids)===JSON.stringify([CONTACT])&&!task.associations?.contacts?.paging?.next;
}
