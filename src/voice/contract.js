import {createHash} from 'node:crypto';
import {canonical} from '../findings.js';
import {tenantConfiguration} from '../release/tenant.js';

export const VOICE_CONTRACT='service-provider-voice-intake-v1.2';
export const TRANSCRIPTION_CONTRACT='verbatim-audio-transcription-v1';
export const TRANSCRIPTION_MODEL='gpt-4o-mini-transcribe';
export const NOTE_CONTRACT='hubspot-reviewed-voice-note-v1.2';
export const MAX_AUDIO_BYTES=5*1024*1024;
export const MAX_TRANSCRIPT_CHARS=12000;
export const executionFlags=['CRM_WRITEBACK_ENABLED','ENABLE_TEST_TASK_WRITES','ENABLE_GENERAL_EXECUTION','GENERAL_RELEASE_APPROVED','DEMO_RECOVERY_ENABLED','DEMO_RECOVERY_EXECUTION_ENABLED','DEMO_RECOVERY_FAULT_ENABLED','DEMO_ONLY_EXECUTION_ENABLED','DEMO_RESPONSE_LOSS_TEST_ENABLED'];
export const hash=value=>'sha256:'+createHash('sha256').update(typeof value==='string'||value instanceof Uint8Array?value:canonical(value)).digest('hex');
export const authority=actor=>hash({subject:actor.subject,role:actor.role,kind:actor.kind,issuer:actor.issuer??null,audience:actor.audience??null});
export function voiceMode(env){
 const tenant=tenantConfiguration(env);
 if(!['local','remote-demo'].includes(env.CERTIFICATION_MODE))throw Error('voice_intake_synthetic_demo_only');
 if(env.VOICE_INTAKE_ENABLED!=='true')throw Error('voice_intake_disabled');
 if(!tenant.local&&env.LOCAL_VOICE_FIXTURE_URL)throw Error('voice_remote_fixture_override_forbidden');
 if(executionFlags.some(k=>(env[k]??(tenant.local?'false':undefined))!=='false'))throw Error('voice_intake_requires_closed_task_execution');
 return tenant;
}
export function actorCheck(actor,env){
 if(!actor?.subject||!['Approver','Admin'].includes(actor.role)||actor.kind!==(env.CERTIFICATION_MODE==='local'?'LOCAL_SYNTHETIC':'EXTERNAL_VERIFIED'))throw Error('voice_approver_required');
 if(!Number.isFinite(actor.expiresAt)||actor.expiresAt<=Date.now())throw Error('voice_operator_session_expired');
}
export function metadata(input){
 if(typeof input.sourceLabel!=='string'||!input.sourceLabel.trim()||input.sourceLabel.length>120)throw Error('voice_source_label_required');
 if(typeof input.recordedAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(input.recordedAt))throw Error('original_recording_timestamp_with_timezone_required');
 const at=Date.parse(input.recordedAt);if(!Number.isFinite(at)||at<0||at>Date.now()+300000)throw Error('original_recording_timestamp_invalid');
 const [year,month,day]=input.recordedAt.slice(0,10).split('-').map(Number),calendar=new Date(Date.UTC(year,month-1,day));if(calendar.getUTCFullYear()!==year||calendar.getUTCMonth()!==month-1||calendar.getUTCDate()!==day)throw Error('original_recording_timestamp_invalid');
 return {sourceLabel:input.sourceLabel.trim(),recordedAt:new Date(at).toISOString()};
}
export function transcriptText(text){
 if(typeof text!=='string'||!text.trim()||text.length>MAX_TRANSCRIPT_CHARS||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text))throw Error('voice_transcript_empty_invalid_or_too_large');
 return text; // Preserve actual reviewed wording, including quantities/conditions.
}
export async function audioBytes(file){
 if(!file||typeof file.arrayBuffer!=='function'||!Number.isInteger(file.size)||file.size<12||file.size>MAX_AUDIO_BYTES)throw Error('voice_audio_empty_or_over_5_mib');
 const b=new Uint8Array(await file.arrayBuffer()),ascii=(start,end)=>new TextDecoder().decode(b.slice(start,end));
 let mime=null,extension=null;
 if(ascii(0,4)==='RIFF'&&ascii(8,12)==='WAVE'){mime='audio/wav';extension='wav';}
 else if(ascii(0,3)==='ID3'||(b[0]===255&&(b[1]&224)===224)){mime='audio/mpeg';extension='mp3';}
 else if(b[0]===26&&b[1]===69&&b[2]===223&&b[3]===163){mime='audio/webm';extension='webm';}
 else if(ascii(4,8)==='ftyp'){mime='audio/mp4';extension='m4a';}
 if(!mime)throw Error('voice_unsupported_audio_signature');
 const declared=(file.type||'').split(';')[0].toLowerCase();
 const compatible={'audio/wav':['audio/wav','audio/x-wav','audio/wave'],'audio/mpeg':['audio/mpeg','audio/mp3'],'audio/webm':['audio/webm','video/webm'],'audio/mp4':['audio/mp4','audio/m4a','audio/x-m4a','video/mp4']};
 if(declared&&!compatible[mime].includes(declared)&&declared!=='application/octet-stream')throw Error('voice_audio_type_mismatch');
 return {bytes:b,mime,extension,audioHash:hash(b)};
}
const escape=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function noteRequest(draft,env){
 const text=transcriptText(draft.reviewedText),m=metadata(draft);
 const lines=['AI & MAIN SYNTHETIC VOICE NOTE — TEST DATA ONLY.','Source type: Service-provider dictation.','Transcript review: Checked by the operator.','Provider label (operator-entered): '+m.sourceLabel,'Original recording time (UTC): '+m.recordedAt,'Reviewed transcript:',text,'[AI_MAIN_VOICE_CORRELATION:'+draft.correlation+']'];
 return {contractVersion:NOTE_CONTRACT,method:'POST',url:'https://api.hubapi.com/crm/v3/objects/notes',portalId:env.STAGING_PORTAL_ID,body:{properties:{hs_note_body:lines.map(s=>'<p>'+escape(s).replaceAll('\n','<br>')+'</p>').join(''),hs_timestamp:m.recordedAt},associations:[{to:{id:env.STAGING_CONTACT_ID},types:[{associationCategory:'HUBSPOT_DEFINED',associationTypeId:202}]}]}};
}
export const actionVersion=request=>'voice-note-action-v1:'+hash({voiceContract:VOICE_CONTRACT,transcriptionContract:TRANSCRIPTION_CONTRACT,request});
export function noteMatches(note,draft,env){
 if(!note?.id||note.associations?.contacts?.paging?.next||typeof note.properties?.hs_note_body!=='string'||!note.properties.hs_note_body.includes('[AI_MAIN_VOICE_CORRELATION:'+draft.correlation+']'))return false;
 const ids=(note.associations?.contacts?.results||[]).map(x=>String(x.id));if(ids.length!==1||ids[0]!==env.STAGING_CONTACT_ID)return false;
 const timestamp=Date.parse(note.properties.hs_timestamp);if(!Number.isFinite(timestamp))return false;
 // Reconstruct the approved complete request, even after draft text has expired.
 const request={contractVersion:NOTE_CONTRACT,method:'POST',url:'https://api.hubapi.com/crm/v3/objects/notes',portalId:env.STAGING_PORTAL_ID,body:{properties:{hs_note_body:note.properties.hs_note_body,hs_timestamp:new Date(timestamp).toISOString()},associations:[{to:{id:env.STAGING_CONTACT_ID},types:[{associationCategory:'HUBSPOT_DEFINED',associationTypeId:202}]}]}};
 return hash(request)===draft.payloadHash;
}
