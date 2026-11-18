import {voiceMode} from './contract.js';

// Operational permission only; this does not change the approved note or grant.
export const VOICE_EXECUTION_POLICY='one-intake-exact-note-demo-window-v1';
export function assertNoteWindow(env,{intakeId,approvalId,payloadHash},now=Date.now()){
 const tenant=voiceMode(env);
 if(env.VOICE_NOTE_WRITES_ENABLED!=='true'||env.VOICE_NOTE_RELEASE_APPROVED!=='true')throw Error('voice_note_execution_disabled');
 if(tenant.local)return {policyVersion:VOICE_EXECUTION_POLICY,runId:'local-synthetic'};
 const started=Date.parse(env.VOICE_NOTE_EXECUTION_STARTED_AT),expires=Date.parse(env.VOICE_NOTE_EXECUTION_EXPIRES_AT);
 if(!/^voice-note-run-[a-f0-9-]{36}$/.test(env.VOICE_NOTE_EXECUTION_RUN_ID??'')||env.VOICE_NOTE_EXECUTION_MAX_CREATES!=='1'||!Number.isFinite(started)||!Number.isFinite(expires)||started>now||expires<=now||expires<=started||expires-started>30*60000)throw Error('voice_note_window_missing_or_expired');
 if(!/^voice_[a-f0-9]{64}$/.test(intakeId??'')||!/^voice-approval_[a-f0-9-]{36}$/.test(approvalId??'')||!/^sha256:[a-f0-9]{64}$/.test(payloadHash??'')||intakeId!==env.VOICE_NOTE_EXECUTION_INTAKE_ID||approvalId!==env.VOICE_NOTE_EXECUTION_APPROVAL_ID||payloadHash!==env.VOICE_NOTE_EXECUTION_PAYLOAD_HASH)throw Error('voice_note_window_target_or_approval_mismatch');
 return {policyVersion:VOICE_EXECUTION_POLICY,runId:env.VOICE_NOTE_EXECUTION_RUN_ID,expiresAt:new Date(expires).toISOString(),intakeId,approvalId,payloadHash,maximumCreates:1};
}
export function noteWindowOpen(env,draft){
 try{assertNoteWindow(env,{intakeId:draft.id,approvalId:draft.approval?.approvalId,payloadHash:draft.payloadHash});return draft.state==='APPROVED'&&draft.createAttempts===0;}catch{return false;}
}
