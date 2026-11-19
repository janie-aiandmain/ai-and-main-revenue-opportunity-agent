import {VOICE_CONTRACT,TRANSCRIPTION_CONTRACT,NOTE_CONTRACT,authority,voiceMode,actorCheck,metadata,transcriptText,noteRequest,actionVersion,noteMatches,hash} from './contract.js';
import {assertNoteWindow,noteWindowOpen} from './execution-window.js';
import {assertRecoveryTest,recoveryTestOpen,NOTE_RECOVERY_TEST_POLICY,RECOVERY_CONTROL_TEXT} from './recovery-test.js';
import {StagingBlocker} from '../staging/blockers.js';
const EDITABLE=['TRANSCRIBED','REVIEWED','APPROVED'];
export class VoiceIntakeLedger {
 constructor(db,env,{flush=async()=>{},restartAfterInjectedLoss=null}={}){
  this.db=db;this.env=env;this.flush=flush;this.restartAfterInjectedLoss=restartAfterInjectedLoss;
  db.exec('CREATE TABLE IF NOT EXISTS voice_intake(id TEXT PRIMARY KEY,data_json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS voice_intake_trace(sequence INTEGER PRIMARY KEY,intake_id TEXT NOT NULL,event TEXT NOT NULL,payload_hash TEXT,at TEXT NOT NULL)');
  for(const {data_json} of db.prepare('SELECT data_json FROM voice_intake').all()){
   const d=JSON.parse(data_json);
   if(d.state==='TRANSCRIBING'){d.state='TRANSCRIPTION_INTERRUPTED';d.lastError='voice_transcription_interrupted_explicit_retry_required';this.save(d);}
   if(d.state==='NOTE_CHECKING'){d.state='APPROVED';this.save(d);}
   if(d.state==='NOTE_SENDING'){d.state='NOTE_UNKNOWN';this.save(d);this.trace(d,'VOICE_RESTART_UNCERTAIN_NO_CREATE');}
  }
 }
 context(){return 'voice:hubspot:'+this.env.STAGING_PORTAL_ID+':contact:'+this.env.STAGING_CONTACT_ID;}
 read(id){const row=this.db.prepare('SELECT data_json FROM voice_intake WHERE id=?').get(id);if(!row)throw Error('voice_intake_not_found');return JSON.parse(row.data_json);}
 save(d){this.db.prepare('INSERT INTO voice_intake VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data_json=excluded.data_json').run(d.id,JSON.stringify(d));}
 trace(d,event){this.db.prepare('INSERT INTO voice_intake_trace(intake_id,event,payload_hash,at) VALUES(?,?,?,?)').run(d.id,event,d.payloadHash??null,new Date().toISOString());}
 owned(id,actor){voiceMode(this.env);actorCheck(actor,this.env);const d=this.read(id);if(d.context!==this.context()||d.actorHash!==authority(actor))throw Error('voice_intake_identity_or_target_changed');return d;}
 status(id,actor){const d=this.owned(id,actor);return {voiceContract:VOICE_CONTRACT,transcriptionContract:TRANSCRIPTION_CONTRACT,noteContract:NOTE_CONTRACT,intakeId:d.id,state:d.state,revision:d.revision,audioHash:d.audioHash,originalTranscriptHash:d.originalTranscriptHash??null,sourceLabel:d.sourceLabel,recordedAt:d.recordedAt,originalText:d.originalText,reviewedText:d.reviewedText,payloadHash:d.payloadHash??null,actionVersion:d.actionVersion??null,correlation:d.correlation,finalRequest:d.request??null,approval:d.approval??null,remoteNoteId:d.remoteNoteId??null,createAttempts:d.createAttempts,providerCalls:d.providerCalls,expiresAt:new Date(d.expiresAt).toISOString(),lastError:d.lastError??null,blocker:d.blocker??null,executionWindow:d.executionWindow??null,responseLossTest:d.responseLossTest??null,responseLossTestEnabled:recoveryTestOpen(this.env,d),responseLossTestMode:this.env.VOICE_NOTE_RESPONSE_LOSS_TEST_ENABLED==='true',draftRedacted:!!d.redacted,noteWritesEnabled:noteWindowOpen(this.env,d),taskExecutionApproved:false,trace:this.db.prepare('SELECT event,payload_hash,at FROM voice_intake_trace WHERE intake_id=? ORDER BY sequence').all(id)};}
 async transcribe(audio,input,actor,provider){
  voiceMode(this.env);actorCheck(actor,this.env);const m=metadata(input);if(input.syntheticConfirmed!==true)throw Error('voice_synthetic_data_attestation_required');
  const id='voice_'+hash({context:this.context(),audioHash:audio.audioHash}).slice(7);let existing;
  try{existing=this.read(id);}catch(e){if(e.message!=='voice_intake_not_found')throw e;}
  if(existing){this.owned(id,actor);if(!['TRANSCRIPTION_FAILED','TRANSCRIPTION_INTERRUPTED'].includes(existing.state))return this.status(id,actor);if(input.retryTranscription!==true)throw Error('voice_explicit_transcription_retry_required');if(existing.providerCalls>=3)throw Error('voice_transcription_retry_limit_reached');if(existing.expiresAt<=Date.now())throw Error('voice_draft_expired');}
  const now=Date.now(),d=existing??{id,context:this.context(),actorHash:authority(actor),audioHash:audio.audioHash,...m,correlation:'ai-main-voice-'+id.slice(6),revision:1,createdAt:now,expiresAt:now+86400000,createAttempts:0,providerCalls:0};
  d.state='TRANSCRIBING';d.providerCalls++;d.lastError=null;this.save(d);this.trace(d,'VOICE_TRANSCRIPTION_CALL_RESERVED');await this.flush();
  try{const result=await provider(audio);const text=transcriptText(result.text);const current=this.read(id);if(current.state!=='TRANSCRIBING')throw Error('voice_transcription_state_changed');Object.assign(current,{state:'TRANSCRIBED',originalText:text,reviewedText:text,originalTranscriptHash:hash(text),providerUsage:result.usage??null});this.save(current);this.trace(current,'VOICE_TRANSCRIPT_READY_NOT_HUMAN_REVIEWED');}
  catch(error){const current=this.read(id);current.state='TRANSCRIPTION_FAILED';current.lastError=/^(?:voice_|missing_|rejected_|insufficient_|blocked_|upstream_|rate_|invalid_)[a-z0-9_]+$/.test(error.message)?error.message:'voice_transcription_failed';this.save(current);this.trace(current,'VOICE_TRANSCRIPTION_FAILED_NO_CRM_WRITE');throw error;}
  return this.status(id,actor);
 }
 review(input,actor){return this.db.transaction(()=>{
  const d=this.owned(input.intakeId,actor);if(!EDITABLE.includes(d.state)||d.expiresAt<=Date.now()||d.redacted)throw Error('voice_draft_not_reviewable');
  if(input.revision!==d.revision)throw Error('voice_review_revision_changed');
  if(input.contactId!==this.env.STAGING_CONTACT_ID)throw Error('voice_designated_contact_mismatch');
  if(['accuracyConfirmed','correctContactConfirmed','sourceTimeConfirmed','syntheticConfirmed'].some(k=>input[k]!==true))throw Error('voice_review_attestations_required');
  const next={...d,...metadata(input),reviewedText:transcriptText(input.transcript)};next.request=noteRequest(next,this.env);next.payloadHash=hash(next.request);next.actionVersion=actionVersion(next.request);
  const changed=next.payloadHash!==d.payloadHash||next.actionVersion!==d.actionVersion;
  if(changed){next.revision++;next.approval=null;next.state='REVIEWED';if(d.approval)this.trace(next,'VOICE_APPROVAL_INVALIDATED_BY_MATERIAL_CHANGE');}
  else if(d.state!=='APPROVED')next.state='REVIEWED';
  this.save(next);this.trace(next,'VOICE_EXACT_NOTE_PREPARED_NO_WRITE');return this.status(d.id,actor);
 });}
 assertApproval(d,actor){
  actorCheck(actor,this.env);const a=d.approval;
  if(d.expiresAt<=Date.now()||!a||a.expiresAt<=Date.now()||a.issuedAt>Date.now()||a.actorHash!==authority(actor)||a.payloadHash!==d.payloadHash||a.actionVersion!==d.actionVersion||a.revision!==d.revision)throw Error('voice_approval_stale_expired_or_changed');
  if(d.redacted||hash(d.request)!==d.payloadHash||hash(noteRequest(d,this.env))!==d.payloadHash||actionVersion(d.request)!==d.actionVersion)throw Error('voice_final_payload_integrity_failure');
  if(d.actorHash!==authority(actor)||d.context!==this.context())throw Error('voice_intake_identity_or_target_changed');
 }
 approve(input,actor){return this.db.transaction(()=>{
  const d=this.owned(input.intakeId,actor);if(!['REVIEWED','APPROVED'].includes(d.state)||d.redacted||d.expiresAt<=Date.now())throw Error('voice_review_required');
  if(input.revision!==d.revision||input.payloadHash!==d.payloadHash||input.actionVersion!==d.actionVersion||hash(d.request)!==d.payloadHash||hash(noteRequest(d,this.env))!==d.payloadHash)throw Error('voice_exact_payload_approval_mismatch');
  if(d.state==='APPROVED'){this.assertApproval(d,actor);return this.status(d.id,actor);}
  const now=Date.now();d.approval={approvalId:'voice-approval_'+crypto.randomUUID(),actorHash:authority(actor),payloadHash:d.payloadHash,actionVersion:d.actionVersion,revision:d.revision,issuedAt:now,expiresAt:Math.min(now+86400000,d.expiresAt)};d.state='APPROVED';this.save(d);this.trace(d,'VOICE_EXACT_FINAL_NOTE_APPROVED');return this.status(d.id,actor);
 });}
 async submit(input,actor,client,{injectResponseLoss=false}={}){
  let restartRequested=false,d=this.owned(input.intakeId,actor);
  if(d.state==='NOTE_CONFIRMED')return this.status(d.id,actor);
  if(['NOTE_UNKNOWN','NOTE_SENDING'].includes(d.state))return this.reconcile(input,actor,client);
  if(d.state==='NOTE_CHECKING')return this.status(d.id,actor);
  if(this.env.VOICE_NOTE_WRITES_ENABLED!=='true'||this.env.VOICE_NOTE_RELEASE_APPROVED!=='true')throw Error('voice_note_execution_disabled');
  if(d.state!=='APPROVED'||d.approval?.approvalId!==input.approvalId)throw Error('voice_exact_approval_required');
  this.assertApproval(d,actor);assertNoteWindow(this.env,{intakeId:d.id,approvalId:d.approval.approvalId,payloadHash:d.payloadHash});
  if(this.env.VOICE_NOTE_RESPONSE_LOSS_TEST_ENABLED==='true'&&!injectResponseLoss)throw Error('voice_recovery_test_requires_explicit_action');
  if(injectResponseLoss){assertRecoveryTest(this.env,{intakeId:d.id,approvalId:d.approval.approvalId,payloadHash:d.payloadHash});if(d.reviewedText!==RECOVERY_CONTROL_TEXT)throw Error('voice_recovery_requires_explicit_synthetic_control');if(typeof this.restartAfterInjectedLoss!=='function')throw Error('voice_hosted_restart_unavailable');}
  d.state='NOTE_CHECKING';this.save(d);this.trace(d,'VOICE_CHECKING_CURRENT_TARGET_AND_APPROVAL');
  try{
   await client.verifyIsolation();const prior=await client.lookup(d.correlation);if(!Array.isArray(prior))throw Error('voice_note_lookup_incomplete');
   if(prior.length){d=this.read(d.id);d.state='NOTE_UNKNOWN';this.save(d);return this.acceptMatch(d,prior,actor);}
   d=this.read(d.id);if(d.state!=='NOTE_CHECKING'||d.createAttempts!==0)throw Error('voice_create_state_changed');this.assertApproval(d,actor);
   d.executionWindow=assertNoteWindow(this.env,{intakeId:d.id,approvalId:d.approval.approvalId,payloadHash:d.payloadHash});if(injectResponseLoss){assertRecoveryTest(this.env,{intakeId:d.id,approvalId:d.approval.approvalId,payloadHash:d.payloadHash});d.responseLossTest={policyVersion:NOTE_RECOVERY_TEST_POLICY,runId:d.executionWindow.runId,payloadHash:d.payloadHash,approvalId:d.approval.approvalId,armedBy:d.actorHash,discarded:false};this.trace(d,'VOICE_OPERATOR_ARMED_SYNTHETIC_RESPONSE_DISCARD');}
   d.state='NOTE_SENDING';d.createAttempts++;this.save(d);this.trace(d,'VOICE_POST_INTENT_PERSISTED_BEFORE_CREATE');await this.flush();
   // An awaited storage flush must not extend an expired session/approval.
   d=this.read(d.id);if(d.state!=='NOTE_SENDING'||d.createAttempts!==1)throw Error('voice_post_intent_changed');this.assertApproval(d,actor);
   const window=assertNoteWindow(this.env,{intakeId:d.id,approvalId:d.approval.approvalId,payloadHash:d.payloadHash});if(window.runId!==d.executionWindow.runId)throw Error('voice_note_window_changed_after_intent');
   if(injectResponseLoss)assertRecoveryTest(this.env,{intakeId:d.id,approvalId:d.approval.approvalId,payloadHash:d.payloadHash});
   const created=await client.create(d.request,{intakeId:d.id,approvalId:d.approval.approvalId,payloadHash:d.payloadHash});
   if(injectResponseLoss){d=this.read(d.id);d.responseLossTest.discarded=true;this.save(d);this.trace(d,'VOICE_INJECTED_RESPONSE_DISCARDED_BEFORE_SUCCESS_NOT_NETWORK_OUTAGE');await this.flush();restartRequested=true;await this.restartAfterInjectedLoss();throw Error('voice_injected_response_discard_restart_required');}
   d=this.read(d.id);d.remoteNoteId=created?.id?String(created.id):null;d.state='NOTE_UNKNOWN';this.save(d);this.trace(d,'VOICE_CREATE_RESPONSE_REQUIRES_READBACK');
   return this.reconcile(input,actor,client);
  }catch(error){if(restartRequested)throw error;d=this.read(d.id);if(d.state==='NOTE_SENDING'||d.createAttempts>0){d.state='NOTE_UNKNOWN';d.lastError='voice_remote_outcome_uncertain_reconcile_no_create';d.blocker=error instanceof StagingBlocker?error.toJSON():null;this.save(d);this.trace(d,'VOICE_UNCERTAIN_OUTCOME_NO_SECOND_CREATE');return this.status(d.id,actor);}if(d.state==='NOTE_CHECKING'){d.state='APPROVED';this.save(d);}throw error;}
 }
 acceptMatch(d,candidates,actor){
  if(!Array.isArray(candidates))throw Error('voice_note_lookup_incomplete');
  if(candidates.length===1&&noteMatches(candidates[0],d,this.env)){d.state='NOTE_CONFIRMED';d.remoteNoteId=String(candidates[0].id);d.lastError=null;d.blocker=null;this.trace(d,'VOICE_EXISTING_NOTE_MATCHED_NO_NEW_CREATE');}
  else{d.state='NOTE_UNKNOWN';d.lastError=candidates.length>1?'voice_multiple_matches_manual_resolution_required':'voice_no_exact_match_manual_resolution_required';this.trace(d,candidates.length>1?'VOICE_MULTIPLE_MATCHES_BLOCKED':'VOICE_NO_EXACT_MATCH_BLOCKED');}
  this.save(d);return this.status(d.id,actor);
 }
 async reconcile(input,actor,client){
  let d=this.owned(input.intakeId,actor);if(d.state==='NOTE_CONFIRMED')return this.status(d.id,actor);if(!['NOTE_UNKNOWN','NOTE_SENDING'].includes(d.state))throw Error('voice_uncertain_operation_required');
  d.state='NOTE_UNKNOWN';this.save(d);this.trace(d,'VOICE_READ_ONLY_RECONCILIATION');
  try{await client.verifyIsolation();return this.acceptMatch(this.read(d.id),await client.lookup(d.correlation),actor);}
  catch{d=this.read(d.id);d.lastError='voice_reconciliation_unavailable_no_create';this.save(d);this.trace(d,'VOICE_LOOKUP_UNAVAILABLE_BLOCKED');return this.status(d.id,actor);}
 }
 nextExpiry(){return this.db.prepare('SELECT data_json FROM voice_intake').all().map(r=>JSON.parse(r.data_json)).filter(d=>!d.redacted).reduce((at,d)=>Math.min(at,d.expiresAt),Infinity);}
 prune(now=Date.now()){
  const days=Number(this.env.AUDIT_RETENTION_DAYS??365);if(!Number.isInteger(days)||days<1||days>3650)throw Error('voice_invalid_audit_retention');
  this.db.transaction(()=>{for(const {data_json}of this.db.prepare('SELECT data_json FROM voice_intake').all()){
   const d=JSON.parse(data_json);
   if(d.createdAt<now-days*86400000){this.db.prepare('DELETE FROM voice_intake_trace WHERE intake_id=?').run(d.id);this.db.prepare('DELETE FROM voice_intake WHERE id=?').run(d.id);continue;}
   if(d.expiresAt<=now&&!d.redacted){d.originalText=null;d.reviewedText=null;d.sourceLabel=null;d.request=null;d.approval=null;d.redacted=true;if(!['NOTE_CONFIRMED','NOTE_UNKNOWN','NOTE_SENDING'].includes(d.state))d.state='EXPIRED';this.save(d);this.trace(d,'VOICE_TRANSCRIPT_AND_PAYLOAD_REDACTED');}
  }});
 }
}
