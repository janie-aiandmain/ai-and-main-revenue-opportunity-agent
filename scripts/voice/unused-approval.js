import assert from 'node:assert/strict';
import {hash,actionVersion} from '../../src/voice/contract.js';
// A fresh operator receipt is evidence, not a forged identity or new approval.
export function assertUnusedSameGrant(current,original,closed,now=Date.now()){
 assert.equal(current.state,'APPROVED','current_intake_not_approved');
 assert.equal(current.createAttempts,0,'previous_attempt_forbids_new_window');
 assert.equal(current.remoteNoteId,null,'existing_note_forbids_new_window');
 assert.equal(current.executionWindow,null,'prior_execution_intent_forbids_new_window');
 assert.equal(current.noteWritesEnabled,false);assert.equal(current.taskExecutionApproved,false);
 assert.equal(current.draftRedacted,false);assert.equal(current.lastError,null);assert.equal(current.blocker,null);
 for(const key of ['voiceContract','transcriptionContract','noteContract','intakeId','revision','audioHash','originalTranscriptHash','sourceLabel','recordedAt','originalText','reviewedText','payloadHash','actionVersion','correlation','providerCalls','expiresAt'])assert.deepEqual(current[key],original[key],'changed_'+key);
 assert.deepEqual(current.finalRequest,original.finalRequest,'changed_final_request');
 assert.equal(hash(current.finalRequest),current.payloadHash);assert.equal(actionVersion(current.finalRequest),current.actionVersion);
 assert.deepEqual(current.approval,original.approval,'changed_or_renewed_approval');
 assert(current.approval.issuedAt<=now&&current.approval.expiresAt>now+30*60000,'approval_must_cover_window');
 assert.deepEqual(current.trace,original.trace,'unreviewed_execution_or_state_event');
 assert(closed.verified&&closed.noteWindowEnabled===false,'prior_window_not_verified_closed');
 const owner=closed.workers.find(w=>w.name==='ai-and-main-revenue-opportunity-staging');assert(owner);
 assert.equal(current.ownerDeploymentVersion,owner.versionId,'receipt_does_not_match_closed_owner');
 assert.equal(current.ownerSourceCommit,owner.sourceCommit,'receipt_source_mismatch');
}
