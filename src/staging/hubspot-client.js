import {demoExecution} from '../release/demo-execution.js';
import {tenantConfiguration} from '../release/tenant.js';
import { StagingBlocker,checkedJsonFetch,missingCredential } from './blockers.js';
export class HubSpotCertificationClient {
  constructor(env,{readOnly=false}={}){
    this.env=env;
    this.readOnly=readOnly;
    if(!env.STAGING_HUBSPOT_READ_TOKEN)throw missingCredential('STAGING_HUBSPOT_READ_TOKEN');
    if(!env.STAGING_HUBSPOT_WRITE_TOKEN)throw missingCredential('STAGING_HUBSPOT_WRITE_TOKEN');
    const tenant=tenantConfiguration(env);this.synthetic=tenant.synthetic;
    if(!readOnly&&env.ENABLE_TEST_TASK_WRITES!=='true'&&!demoExecution(env))throw Error('staging_isolation_not_configured');
    if(env.CERTIFICATION_MODE==='local'){
      const base=new URL(env.LOCAL_HUBSPOT_FIXTURE_URL);
      if(base.protocol!=='http:'||!['127.0.0.1','localhost'].includes(base.hostname)) throw Error('local_fixture_only');
      this.base=base.origin;
    }else{
      this.base='https://api.hubapi.com';
    }
    if(!env.STAGING_HUBSPOT_READ_TOKEN||!env.STAGING_HUBSPOT_WRITE_TOKEN) throw Error('staging_credentials_missing');
    if(env.STAGING_HUBSPOT_READ_TOKEN===env.STAGING_HUBSPOT_WRITE_TOKEN) throw Error('separate_staging_credentials_required');
  }
  async request(path,write=false,body,credential='read'){
    if(write&&this.readOnly)throw Error('preflight_read_only');
    const name=write||credential==='write'?'STAGING_HUBSPOT_WRITE_TOKEN':'STAGING_HUBSPOT_READ_TOKEN';
    return checkedJsonFetch(this.base+path,{method:write?'POST':'GET',headers:{Authorization:'Bearer '+this.env[name],'Content-Type':'application/json'},...(body?{body}:{}),signal:AbortSignal.timeout(10000)},name,path);
  }
  async verifyIsolation(){
    const portal=await this.request('/account-info/v3/details');
    if(String(portal.portalId)!==this.env.STAGING_PORTAL_ID) throw new StagingBlocker('portal_mismatch',{credential:'STAGING_HUBSPOT_READ_TOKEN',check:'expected_nonproduction_portal',setupStep:2});
    // Identity check only: never use a write credential for general CRM reads.
    // If existing scopes do not allow this check, block; do not broaden scopes.
    const writer=await this.request('/account-info/v3/details',false,undefined,'write');
    if(String(writer.portalId)!==this.env.STAGING_PORTAL_ID) throw new StagingBlocker('portal_mismatch',{credential:'STAGING_HUBSPOT_WRITE_TOKEN',check:'write_credential_portal_mismatch',setupStep:4});
    const contact=await this.request('/crm/v3/objects/contacts/'+encodeURIComponent(this.env.STAGING_CONTACT_ID)+'?properties=firstname');
    if(String(contact.id)!==this.env.STAGING_CONTACT_ID||(this.synthetic&&contact.properties?.firstname!=='AI_MAIN_CERTIFICATION_ONLY')) throw new StagingBlocker('contact_mismatch',{check:'designated_contact_id_and_synthetic_marker',setupStep:3});
  }
  async create(payloadJson){return this.request('/crm/v3/objects/tasks',true,payloadJson);}
  async readTask(id){return this.request('/crm/v3/objects/tasks/'+encodeURIComponent(id)+'?properties=hs_task_subject,hs_task_body,hs_task_priority,hs_task_status,hs_task_type,hs_timestamp&associations=contacts');}
  async lookup(correlation,knownId){
    // Enumerate only the permitted record, including when a creation ID is known.
    // A known ID must not hide another task with the same correlation marker.
    const ids=new Set();let after='';
    for(let page=0;page<100;page++){
      const list=await this.request('/crm/v4/objects/contacts/'+encodeURIComponent(this.env.STAGING_CONTACT_ID)+'/associations/tasks?limit=100'+(after?'&after='+encodeURIComponent(after):''));
      if(!Array.isArray(list.results))throw Error('task_associations_incomplete');
      for(const row of list.results){if(!row.toObjectId)throw Error('task_association_reference_missing');ids.add(String(row.toObjectId));}
      after=list.paging?.next?.after;if(!after)break;if(page===99)throw Error('task_lookup_limit_incomplete');
    }
    const found=[];
    for(const id of ids){const task=await this.readTask(id);if(task.associations?.contacts?.paging?.next)throw Error('task_contact_associations_incomplete');if(task.properties?.hs_task_body?.includes('[AI_MAIN_CORRELATION:'+correlation+']'))found.push(task);}
    return found;
  }
  async verifiedFixtureOutcome(externalRef){
    if(this.env.CERTIFICATION_MODE!=='local')throw Error('verified_outcome_adapter_unavailable');
    return this.request('/certification/outcomes/'+encodeURIComponent(externalRef));
  }
}
export function taskMatches(task,payload,correlation){
  if(task?.associations?.contacts?.paging?.next)return false;
  if(!task?.id||!task.properties?.hs_task_body?.includes('[AI_MAIN_CORRELATION:'+correlation+']'))return false;
  for(const [k,v] of Object.entries(payload.properties)){
    if(k==='hs_timestamp'){if(Date.parse(task.properties[k])!==Date.parse(v))return false;}
    else if(task.properties[k]!==v)return false;
  }
  const actual=(task.associations?.contacts?.results||[]).map(x=>String(x.id)).sort();
  const expected=payload.associations.map(x=>String(x.to.id)).sort();
  return JSON.stringify(actual)===JSON.stringify(expected);
}
