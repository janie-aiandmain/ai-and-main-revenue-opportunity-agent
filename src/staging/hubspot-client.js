export class HubSpotCertificationClient {
  constructor(env){
    this.env=env;
    if(env.DEPLOYMENT_ENVIRONMENT!=='staging'||env.CRM_WRITEBACK_ENABLED!=='false'||env.ENABLE_TEST_TASK_WRITES!=='true'||!['local','remote-staging'].includes(env.CERTIFICATION_MODE)||!env.STAGING_PORTAL_ID||!env.STAGING_CONTACT_ID) throw Error('staging_isolation_not_configured');
    if(env.CERTIFICATION_MODE==='local'){
      const base=new URL(env.LOCAL_HUBSPOT_FIXTURE_URL);
      if(base.protocol!=='http:'||!['127.0.0.1','localhost'].includes(base.hostname)) throw Error('local_fixture_only');
      this.base=base.origin;
    }else{
      if(env.LOCAL_HUBSPOT_FIXTURE_URL||env.STAGING_ISOLATION_APPROVED!=='true'||!env.PRODUCTION_PORTAL_ID||env.STAGING_PORTAL_ID===env.PRODUCTION_PORTAL_ID) throw Error('hosted_isolation_unverified');
      this.base='https://api.hubapi.com';
    }
    if(!env.STAGING_HUBSPOT_READ_TOKEN||!env.STAGING_HUBSPOT_WRITE_TOKEN) throw Error('staging_credentials_missing');
    if(env.STAGING_HUBSPOT_READ_TOKEN===env.STAGING_HUBSPOT_WRITE_TOKEN) throw Error('separate_staging_credentials_required');
  }
  async request(path,write=false,body,credential='read'){
    const response=await fetch(this.base+path,{method:write?'POST':'GET',headers:{Authorization:'Bearer '+(write||credential==='write'?this.env.STAGING_HUBSPOT_WRITE_TOKEN:this.env.STAGING_HUBSPOT_READ_TOKEN),'Content-Type':'application/json'},...(body?{body}:{}),signal:AbortSignal.timeout(10000)});
    if(!response.ok) throw Error('staging_upstream_http_'+response.status);
    return response.json();
  }
  async verifyIsolation(){
    const portal=await this.request('/account-info/v3/details');
    if(String(portal.portalId)!==this.env.STAGING_PORTAL_ID) throw Error('portal_mismatch');
    // Identity check only: never use a write credential for general CRM reads.
    // If existing scopes do not allow this check, block; do not broaden scopes.
    const writer=await this.request('/account-info/v3/details',false,undefined,'write');
    if(String(writer.portalId)!==this.env.STAGING_PORTAL_ID) throw Error('write_credential_portal_mismatch');
    const contact=await this.request('/crm/v3/objects/contacts/'+encodeURIComponent(this.env.STAGING_CONTACT_ID)+'?properties=firstname');
    if(String(contact.id)!==this.env.STAGING_CONTACT_ID||contact.properties?.firstname!=='AI_MAIN_CERTIFICATION_ONLY') throw Error('designated_test_contact_unverified');
  }
  async create(payloadJson){return this.request('/crm/v3/objects/tasks',true,payloadJson);}
  async readTask(id){return this.request('/crm/v3/objects/tasks/'+encodeURIComponent(id)+'?properties=hs_task_subject,hs_task_body,hs_task_priority,hs_task_status,hs_task_type,hs_timestamp&associations=contacts');}
  async lookup(correlation,knownId){
    if(knownId){try{return [await this.readTask(knownId)];}catch{return [];}}
    const found=[];let after='';
    for(let page=0;page<10;page++){
      const list=await this.request('/crm/v3/objects/tasks?limit=100&properties=hs_task_body'+(after?'&after='+encodeURIComponent(after):''));
      for(const task of list.results||[]) if(task.properties?.hs_task_body?.includes('[AI_MAIN_CORRELATION:'+correlation+']'))found.push(await this.readTask(task.id));
      after=list.paging?.next?.after;if(!after)break;
    }
    return found;
  }
  async verifiedFixtureOutcome(externalRef){
    if(this.env.CERTIFICATION_MODE!=='local')throw Error('verified_outcome_adapter_unavailable');
    return this.request('/certification/outcomes/'+encodeURIComponent(externalRef));
  }
}
export function taskMatches(task,payload,correlation){
  if(!task?.id||!task.properties?.hs_task_body?.includes('[AI_MAIN_CORRELATION:'+correlation+']'))return false;
  for(const [k,v] of Object.entries(payload.properties)){
    if(k==='hs_timestamp'){if(Date.parse(task.properties[k])!==Date.parse(v))return false;}
    else if(task.properties[k]!==v)return false;
  }
  const actual=(task.associations?.contacts?.results||[]).map(x=>String(x.id)).sort();
  const expected=payload.associations.map(x=>String(x.to.id)).sort();
  return JSON.stringify(actual)===JSON.stringify(expected);
}
