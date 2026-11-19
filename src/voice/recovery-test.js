import {assertNoteWindow,executionMode} from './execution-window.js';
import control from '../../fixtures/voice-intake/recovery-control-v1.json' with {type:'json'};
export const NOTE_RECOVERY_TEST_POLICY='exact-note-response-discard-restart-v1';
export const RECOVERY_CONTROL_TEXT=control.reviewedText;
export function assertRecoveryTest(env,material){
 if(executionMode(env)==='human_approved_demo')throw Error('voice_note_recovery_disabled_in_routine_mode');
 const window=assertNoteWindow(env,material);
 if(env.VOICE_NOTE_RESPONSE_LOSS_TEST_ENABLED!=='true')throw Error('voice_note_recovery_test_disabled');
 return {...window,recoveryPolicyVersion:NOTE_RECOVERY_TEST_POLICY};
}
export function recoveryTestOpen(env,d){
 try{assertRecoveryTest(env,{intakeId:d.id,approvalId:d.approval?.approvalId,payloadHash:d.payloadHash});return d.state==='APPROVED'&&d.createAttempts===0&&d.reviewedText===RECOVERY_CONTROL_TEXT;}catch{return false;}
}
export async function commitNoteFaultAndRestart(ctx){
 await ctx.storage.sync();
 ctx.abort('Operator-authorized synthetic note response discard; not a network outage ['+NOTE_RECOVERY_TEST_POLICY+']');
}
