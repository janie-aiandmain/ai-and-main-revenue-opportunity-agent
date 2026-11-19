import {voiceMode,actionVersion,hash,VOICE_CONTRACT,TRANSCRIPTION_CONTRACT} from './contract.js';

// Operational permission only; this does not change the approved note or grant.
export const VOICE_EXECUTION_POLICY='one-intake-exact-note-demo-window-v1';
export const VOICE_ROUTINE_POLICY='authenticated-exact-note-demo-v1';
export function executionMode(env){const mode=env.VOICE_NOTE_EXECUTION_MODE??'exact_intake_window';if(!['exact_intake_window','human_approved_demo'].includes(mode))throw Error('voice_note_execution_mode_invalid');return mode;}
export function approvedNoteActionVersion(request,env){return executionMode(env)==='human_approved_demo'?'voice-note-action-v2:'+hash({voiceContract:VOICE_CONTRACT,transcriptionContract:TRANSCRIPTION_CONTRACT,executionPolicyVersion:VOICE_ROUTINE_POLICY,request}):actionVersion(request);}
const validMaterial=({intakeId,approvalId,payloadHash})=>/^voice_[a-f0-9]{64}$/.test(intakeId??'')&&/^voice-approval_[a-f0-9-]{36}$/.test(approvalId??'')&&/^sha256:[a-f0-9]{64}$/.test(payloadHash??'');
export function assertNoteWindow(env,{intakeId,approvalId,payloadHash},now=Date.now()){
 const tenant=voiceMode(env);
 if(env.VOICE_NOTE_WRITES_ENABLED!=='true'||env.VOICE_NOTE_RELEASE_APPROVED!=='true')throw Error('voice_note_execution_disabled');
 const mode=executionMode(env);
 if(mode==='human_approved_demo'){if(env.VOICE_NOTE_RESPONSE_LOSS_TEST_ENABLED!=='false')throw Error('voice_routine_demo_requires_fault_test_disabled');if(!validMaterial({intakeId,approvalId,payloadHash}))throw Error('voice_exact_note_material_required');return {policyVersion:VOICE_ROUTINE_POLICY,runId:'routine-human-approved-demo',intakeId,approvalId,payloadHash,maximumCreates:1};}
 if(tenant.local)return {policyVersion:VOICE_EXECUTION_POLICY,runId:'local-synthetic'};
 const started=Date.parse(env.VOICE_NOTE_EXECUTION_STARTED_AT),expires=Date.parse(env.VOICE_NOTE_EXECUTION_EXPIRES_AT);
 if(!/^voice-note-run-[a-f0-9-]{36}$/.test(env.VOICE_NOTE_EXECUTION_RUN_ID??'')||env.VOICE_NOTE_EXECUTION_MAX_CREATES!=='1'||!Number.isFinite(started)||!Number.isFinite(expires)||started>now||expires<=now||expires<=started||expires-started>30*60000)throw Error('voice_note_window_missing_or_expired');
 if(!/^voice_[a-f0-9]{64}$/.test(intakeId??'')||!/^voice-approval_[a-f0-9-]{36}$/.test(approvalId??'')||!/^sha256:[a-f0-9]{64}$/.test(payloadHash??'')||intakeId!==env.VOICE_NOTE_EXECUTION_INTAKE_ID||approvalId!==env.VOICE_NOTE_EXECUTION_APPROVAL_ID||payloadHash!==env.VOICE_NOTE_EXECUTION_PAYLOAD_HASH)throw Error('voice_note_window_target_or_approval_mismatch');
 return {policyVersion:VOICE_EXECUTION_POLICY,runId:env.VOICE_NOTE_EXECUTION_RUN_ID,expiresAt:new Date(expires).toISOString(),intakeId,approvalId,payloadHash,maximumCreates:1};
}
export function noteWindowOpen(env,draft){
 try{assertNoteWindow(env,{intakeId:draft.id,approvalId:draft.approval?.approvalId,payloadHash:draft.payloadHash});return draft.state==='APPROVED'&&draft.createAttempts===0&&draft.expiresAt>Date.now()&&draft.approval?.expiresAt>Date.now()&&draft.approval.payloadHash===draft.payloadHash&&draft.approval.actionVersion===draft.actionVersion&&draft.approval.revision===draft.revision&&draft.actionVersion===approvedNoteActionVersion(draft.request,env);}catch{return false;}
}
