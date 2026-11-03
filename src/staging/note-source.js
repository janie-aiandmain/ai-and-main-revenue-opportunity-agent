import { StagingBlocker,checkedJsonFetch,missingCredential } from './blockers.js';
// Only the designated non-production contact is readable through this adapter.
import { prepareHistory } from '../findings.js';
export class DesignatedNoteSource {
  constructor(env){
    if(!env.STAGING_HUBSPOT_READ_TOKEN)throw missingCredential('STAGING_HUBSPOT_READ_TOKEN');
    if(env.DEPLOYMENT_ENVIRONMENT!=='staging'||!env.STAGING_PORTAL_ID||!env.STAGING_CONTACT_ID||!env.STAGING_HUBSPOT_READ_TOKEN)throw Error('staging_note_source_unconfigured');
    this.env=env;
    if(env.CERTIFICATION_MODE==='local'){
      const u=new URL(env.LOCAL_HUBSPOT_FIXTURE_URL);
      if(u.protocol!=='http:'||!['127.0.0.1','localhost'].includes(u.hostname))throw Error('local_note_fixture_only');this.base=u.origin;
    }else{
      if(env.CERTIFICATION_MODE!=='remote-staging'||env.LOCAL_HUBSPOT_FIXTURE_URL||env.STAGING_ISOLATION_APPROVED!=='true'||!env.PRODUCTION_PORTAL_ID||env.PRODUCTION_PORTAL_ID===env.STAGING_PORTAL_ID)throw Error('hosted_note_isolation_unverified');
      if(![env.PRODUCTION_PORTAL_ID,env.STAGING_PORTAL_ID,env.STAGING_CONTACT_ID].every(id=>/^\d+$/.test(id)))throw Error('verified_numeric_portal_and_contact_ids_required');
      this.base='https://api.hubapi.com';
    }
  }
  async get(path){return checkedJsonFetch(this.base+path,{headers:{Authorization:'Bearer '+this.env.STAGING_HUBSPOT_READ_TOKEN},signal:AbortSignal.timeout(10000)},'STAGING_HUBSPOT_READ_TOKEN',path);}
  async readContext(){
    const portal=await this.get('/account-info/v3/details');if(String(portal.portalId)!==this.env.STAGING_PORTAL_ID)throw new StagingBlocker('portal_mismatch',{credential:'STAGING_HUBSPOT_READ_TOKEN',check:'expected_nonproduction_note_portal',setupStep:2});
    const contact=await this.get('/crm/v3/objects/contacts/'+encodeURIComponent(this.env.STAGING_CONTACT_ID)+'?properties=firstname');
    if(String(contact.id)!==this.env.STAGING_CONTACT_ID||contact.properties?.firstname!=='AI_MAIN_CERTIFICATION_ONLY')throw new StagingBlocker('contact_mismatch',{check:'designated_contact_id_and_synthetic_marker',setupStep:3});
    const ids=new Set();let after='';
    for(let page=0;page<10;page++){
      const result=await this.get('/crm/v4/objects/contacts/'+encodeURIComponent(this.env.STAGING_CONTACT_ID)+'/associations/notes?limit=100'+(after?'&after='+encodeURIComponent(after):''));
      if(!Array.isArray(result.results))throw Error('note_associations_invalid');
      for(const row of result.results){if(!row.toObjectId)throw Error('note_reference_missing');ids.add(String(row.toObjectId));}
      after=result.paging?.next?.after;if(!after)break;
      if(page===9)throw Error('complete_note_context_exceeds_limit');
    }
    const notes=[];
    for(const id of ids){
      const row=await this.get('/crm/v3/objects/notes/'+encodeURIComponent(id)+'?properties=hs_note_body,hs_timestamp');
      const p=row.properties;
      if(String(row.id)!==id||typeof p?.hs_note_body!=='string'||!Number.isFinite(Date.parse(p.hs_timestamp)))throw Error('note_content_incomplete');
      // Same normalized text is used for reasoning, quotes, hashes and fresh reads.
      const text=p.hs_note_body.replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
      notes.push({noteId:id,timestamp:new Date(p.hs_timestamp).toISOString(),note:text});
    }
    return {customer:'Designated non-production context',serviceHistory:await prepareHistory({serviceHistory:notes})};
  }
}
