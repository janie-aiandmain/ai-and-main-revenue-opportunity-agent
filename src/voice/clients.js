import {HubSpotCertificationClient} from '../staging/hubspot-client.js';
import {checkedJsonFetch,missingCredential} from '../staging/blockers.js';
import {voiceMode,TRANSCRIPTION_MODEL,TRANSCRIPTION_CONTRACT,NOTE_CONTRACT} from './contract.js';

function localBase(env){const u=new URL(env.LOCAL_VOICE_FIXTURE_URL||'');if(u.protocol!=='http:'||!['127.0.0.1','localhost'].includes(u.hostname)||u.username||u.password)throw Error('voice_local_fixture_only');return u.origin;}
export async function transcribeAudio(env,audio){
 voiceMode(env);if(!env.EVAL_OPENAI_API_KEY)throw missingCredential('EVAL_OPENAI_API_KEY');
 const form=new FormData();form.set('file',new File([audio.bytes],'recording.'+audio.extension,{type:audio.mime}));form.set('model',TRANSCRIPTION_MODEL);form.set('response_format','json');form.set('language','en');
 const origin=env.CERTIFICATION_MODE==='local'?localBase(env):'https://api.openai.com';
 const response=await checkedJsonFetch(origin+'/v1/audio/transcriptions',{method:'POST',headers:{Authorization:'Bearer '+env.EVAL_OPENAI_API_KEY},body:form,signal:AbortSignal.timeout(60000)},'EVAL_OPENAI_API_KEY','voice_transcription');
 return {text:response.text,usage:response.usage??null,model:TRANSCRIPTION_MODEL,contract:TRANSCRIPTION_CONTRACT};
}
export class HubSpotVoiceClient {
 constructor(env){voiceMode(env);this.env=env;this.reader=new HubSpotCertificationClient(env,{readOnly:true});}
 async verifyIsolation(){
  await this.reader.verifyIsolation();
  const labels=await this.reader.request('/crm/v4/associations/notes/contacts/labels');
  if(!labels.results?.some(x=>x.category==='HUBSPOT_DEFINED'&&x.typeId===202))throw Error('voice_note_contact_association_unverified');
 }
 async preflight(){await this.verifyIsolation();return {kind:'VOICE_INTAKE_READ_ONLY_PREFLIGHT',portalId:this.env.STAGING_PORTAL_ID,contactId:this.env.STAGING_CONTACT_ID,readCredentialPortalVerified:true,writeCredentialPortalVerified:true,syntheticContactMarkerVerified:true,noteContactAssociationType:202,noteCreationPermission:'UNVERIFIED_NO_MUTATION_PROBE',noteWritesEnabled:this.env.VOICE_NOTE_WRITES_ENABLED==='true'&&this.env.VOICE_NOTE_RELEASE_APPROVED==='true',permissionsExpanded:false};}
 async lookup(correlation){
  const ids=new Set();let after='';
  for(let page=0;page<100;page++){
   const result=await this.reader.request('/crm/v4/objects/contacts/'+encodeURIComponent(this.env.STAGING_CONTACT_ID)+'/associations/notes?limit=100'+(after?'&after='+encodeURIComponent(after):''));
   if(!Array.isArray(result.results))throw Error('voice_note_lookup_incomplete');
   for(const row of result.results){if(!row.toObjectId)throw Error('voice_note_reference_missing');ids.add(String(row.toObjectId));}
   after=result.paging?.next?.after;if(!after)break;if(page===99)throw Error('voice_note_lookup_limit_incomplete');
  }
  const found=[];
  for(const id of ids){const note=await this.reader.request('/crm/v3/objects/notes/'+encodeURIComponent(id)+'?properties=hs_note_body,hs_timestamp&associations=contacts');if(note.associations?.contacts?.paging?.next)throw Error('voice_note_contacts_incomplete');if(note.properties?.hs_note_body?.includes('[AI_MAIN_VOICE_CORRELATION:'+correlation+']'))found.push(note);}
  return found;
 }
 async create(request){
  voiceMode(this.env);
  if(this.env.VOICE_NOTE_WRITES_ENABLED!=='true'||this.env.VOICE_NOTE_RELEASE_APPROVED!=='true')throw Error('voice_note_execution_disabled');
  if(request.contractVersion!==NOTE_CONTRACT||request.method!=='POST'||request.url!=='https://api.hubapi.com/crm/v3/objects/notes'||request.portalId!==this.env.STAGING_PORTAL_ID||request.body.associations?.length!==1||request.body.associations[0].to.id!==this.env.STAGING_CONTACT_ID)throw Error('voice_note_target_changed');
  const url=this.env.CERTIFICATION_MODE==='local'?localBase(this.env)+'/crm/v3/objects/notes':request.url;
  return checkedJsonFetch(url,{method:'POST',headers:{Authorization:'Bearer '+this.env.STAGING_HUBSPOT_WRITE_TOKEN,'content-type':'application/json'},body:JSON.stringify(request.body),signal:AbortSignal.timeout(10000)},'STAGING_HUBSPOT_WRITE_TOKEN','voice_approved_note_creation');
 }
}
