import { createHash,randomUUID } from 'node:crypto';
import { sourceAnchors,strongOverlap } from '../correction-policy.js';
import { StagingOperationLedger,digest } from './operation-ledger.js';
import { prepareHistory,canonical } from '../findings.js';
import {REVIEW_POLICY} from './review-policy.js';
import {INTERNAL_PROPOSAL_VERSION} from './internal-task-policy.js';
import { inspectFinding,generalProjection } from './review-policy.js';
import request from '../findings-request-v0.3.3.json' with {type:'json'};
import {EVIDENCE_POLICY,MATERIALIZATION_VERSION} from '../release/reasoning.js';
const contractHash=digest({request,reviewPolicy:REVIEW_POLICY,proposalVersion:INTERNAL_PROPOSAL_VERSION,evidencePolicy:EVIDENCE_POLICY,materializationVersion:MATERIALIZATION_VERSION,approvalIdentityPolicy:'verified-subject-domain-role-v1'});
const plainHash=value=>createHash('sha256').update(canonical(value)).digest('hex');
const compactAnchors=(history,evidence)=>sourceAnchors(history,evidence).map(a=>({noteId:a.noteId,start:a.start,end:a.end,sourceHash:plainHash({text:a.sourceText,timestamp:a.timestamp}),text:a.sourceText.slice(a.start,a.end)}));
const actorAuthority=actor=>digest({subject:actor.subject,role:actor.role,kind:actor.kind,issuer:actor.issuer||null,audience:actor.audience||null});
const role=actor=>{if(!actor||!['Approver','Admin'].includes(actor.role)||!['LOCAL_SYNTHETIC','EXTERNAL_VERIFIED'].includes(actor.kind)||!actor.subject)throw Error('verified_operator_required');};
export class GeneralFindingLedger extends StagingOperationLedger {
  constructor(db,env){super(db);this.env=env;db.exec(`
    CREATE TABLE IF NOT EXISTS general_identity_candidates(context_key TEXT PRIMARY KEY,generation INTEGER NOT NULL,source_hash TEXT NOT NULL,result_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS general_identity_reviews(id TEXT PRIMARY KEY,actor TEXT NOT NULL,identity_kind TEXT NOT NULL,context_key TEXT NOT NULL,generation INTEGER NOT NULL,source_hash TEXT NOT NULL,bindings_json TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS general_contexts(context_key TEXT PRIMARY KEY,generation INTEGER NOT NULL,state TEXT NOT NULL,source_hash TEXT,contract_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS general_findings(op_id TEXT PRIMARY KEY,context_key TEXT NOT NULL,candidate_hash TEXT NOT NULL,source_hash TEXT NOT NULL,raw_json TEXT NOT NULL,inspection_json TEXT NOT NULL,review_state TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS general_approval_identity(approval_id TEXT PRIMARY KEY,authority_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS general_approval_bindings(approval_id TEXT PRIMARY KEY,review_id TEXT NOT NULL,action_version TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS general_reviews(id TEXT PRIMARY KEY,op_id TEXT NOT NULL,operation_id TEXT,actor TEXT NOT NULL,identity_kind TEXT NOT NULL,source_hash TEXT NOT NULL,candidate_hash TEXT NOT NULL,contract_hash TEXT NOT NULL,spec_json TEXT NOT NULL,payload_hash TEXT,decision TEXT NOT NULL,created_at TEXT NOT NULL);
  `);}
  contextKey(env){return 'hubspot:'+env.STAGING_PORTAL_ID+':contact:'+env.STAGING_CONTACT_ID;}
  beginEvaluation(env){return this.tx(()=>{
    const key=this.contextKey(env),old=this.db.prepare('SELECT * FROM general_contexts WHERE context_key=?').get(key),generation=(old?.generation||0)+1;
    this.db.prepare("INSERT INTO general_contexts VALUES(?,?,'EVALUATING',NULL,?) ON CONFLICT(context_key) DO UPDATE SET generation=excluded.generation,state='EVALUATING'").run(key,generation,contractHash);
    return {key,generation};
  });}
  failEvaluation(ticket){
    const context=this.db.prepare('SELECT * FROM general_contexts WHERE context_key=?').get(ticket.key);
    if(context?.generation!==ticket.generation)return;
    this.db.prepare("UPDATE general_contexts SET state='FAILED' WHERE context_key=? AND generation=?").run(ticket.key,ticket.generation);
    for(const f of this.db.prepare('SELECT op_id FROM general_findings WHERE context_key=?').all(ticket.key))this.revokeForFinding(f.op_id,'FRESH_EVALUATION_FAILED');
  }
  acceptEvaluation(ticket,history,result,now=new Date().toISOString()){
    const context=this.db.prepare('SELECT * FROM general_contexts WHERE context_key=?').get(ticket.key);
    if(!context||context.generation!==ticket.generation)throw Error('superseded_evaluation');
    if(result.promptVersion!=='reasoning-v0.3.3'||result.schemaVersion!=='findings-v0.2'||result.proposalVersion!==INTERNAL_PROPOSAL_VERSION||result.evidencePolicyVersion!==EVIDENCE_POLICY||result.materializationVersion!==MATERIALIZATION_VERSION)throw Error('reasoning_contract_mismatch');
    let identities;
    try{identities=this.reconcile(ticket.key,history,result.findings);}catch(error){
      if(!/Edited source anchor|Unmatched new evidence|Ambiguous identity bridge|Two candidates resolve|Ambiguous batch/.test(error.message))throw error;
      this.db.prepare('INSERT INTO general_identity_candidates VALUES(?,?,?,?) ON CONFLICT(context_key) DO UPDATE SET generation=excluded.generation,source_hash=excluded.source_hash,result_json=excluded.result_json').run(ticket.key,ticket.generation,digest(history),JSON.stringify(result));
      throw Error('identity_review_required');
    }
    const sourceHash=digest(history);
    return this.tx(()=>{
      for(let i=0;i<result.findings.length;i++){
        const raw=result.findings[i],identity=identities[i],op=identity.opportunityId;
        const inspection=inspectFinding(raw,history,result.findings,now),candidateHash=identity.candidateHash;
        const old=this.db.prepare('SELECT * FROM general_findings WHERE op_id=?').get(op);
        const changed=!old||old.source_hash!==sourceHash||old.candidate_hash!==candidateHash||context.contract_hash!==contractHash;
        if(changed)this.revokeForFinding(op,'FRESH_FINDING_OR_SOURCE_CHANGED');
        this.db.prepare('INSERT INTO general_findings VALUES(?,?,?,?,?,?,?) ON CONFLICT(op_id) DO UPDATE SET candidate_hash=excluded.candidate_hash,source_hash=excluded.source_hash,raw_json=excluded.raw_json,inspection_json=excluded.inspection_json,review_state=excluded.review_state').run(op,ticket.key,candidateHash,sourceHash,JSON.stringify(raw),JSON.stringify(inspection),changed?'PENDING':old.review_state);
      }
      const seen=new Set(identities.map(i=>i.opportunityId));
      for(const old of this.db.prepare('SELECT * FROM general_findings WHERE context_key=?').all(ticket.key))if(!seen.has(old.op_id)){this.revokeForFinding(old.op_id,'FINDING_WITHDRAWN');this.db.prepare("UPDATE general_findings SET review_state='WITHDRAWN' WHERE op_id=?").run(old.op_id);}
      this.db.prepare("UPDATE general_contexts SET state='READY',source_hash=?,contract_hash=? WHERE context_key=? AND generation=?").run(sourceHash,contractHash,ticket.key,ticket.generation);
      this.db.prepare('DELETE FROM general_identity_candidates WHERE context_key=?').run(ticket.key);
      return this.findings(ticket.key);
    });
  }
  pendingIdentity(env){
    const row=this.db.prepare('SELECT * FROM general_identity_candidates WHERE context_key=?').get(this.contextKey(env));
    if(!row)return null;
    return {generation:row.generation,sourceHash:row.source_hash,candidates:JSON.parse(row.result_json).findings.map(f=>({candidateRef:f.findingId,finding:f})),humanReview:'PENDING'};
  }
  async resolveIdentity(input,actor,env,source){
    role(actor);if(input.attestHumanReview!==true||input.distinctNeedsConfirmed!==true)throw Error('explicit_identity_review_required');
    const key=this.contextKey(env),pending=this.db.prepare('SELECT * FROM general_identity_candidates WHERE context_key=?').get(key),context=this.db.prepare('SELECT * FROM general_contexts WHERE context_key=?').get(key);
    if(!pending||pending.generation!==input.generation||context.generation!==input.generation||pending.source_hash!==input.sourceHash)throw Error('stale_identity_review');
    const history=await prepareHistory(await source.readContext());if(digest(history)!==pending.source_hash)throw Error('identity_source_changed');
    const result=JSON.parse(pending.result_json),bindings=input.bindings;
    if(!Array.isArray(bindings)||bindings.length!==result.findings.length||new Set(bindings.map(b=>b.candidateRef)).size!==bindings.length)throw Error('complete_identity_bindings_required');
    const planned=result.findings.map(f=>{
      const b=bindings.find(b=>b.candidateRef===f.findingId);if(!b||!['EXISTING','NEW'].includes(b.resolution))throw Error('explicit_identity_binding_required');
      return {finding:f,binding:b,anchors:compactAnchors(history,f.evidence)};
    });
    for(let i=0;i<planned.length;i++)for(let j=i+1;j<planned.length;j++)if(planned[i].anchors.some(a=>planned[j].anchors.some(b=>strongOverlap(a,b))))throw Error('independent_findings_require_disjoint_evidence');
    this.tx(()=>{
      const current=this.db.prepare('SELECT * FROM general_contexts WHERE context_key=?').get(key);if(current.generation!==input.generation)throw Error('superseded_identity_review');
      const existing=this.db.prepare('SELECT * FROM opportunities WHERE context_key=?').all(key),assigned=new Set(),sourceHash=plainHash([...history].sort((a,b)=>a.noteId.localeCompare(b.noteId)));
      for(const {finding:f,binding:b,anchors} of planned){
        const matches=existing.filter(o=>JSON.parse(o.anchors).some(a=>anchors.some(b=>strongOverlap(a,b))));
        if(matches.length>1)throw Error('identity_bridge_requires_corrected_findings');
        const old=b.resolution==='EXISTING'?existing.find(o=>o.id===b.findingId):null;
        if(b.resolution==='EXISTING'&&!old)throw Error('existing_identity_must_belong_to_context');
        if(b.resolution==='NEW'&&matches.length)throw Error('new_identity_would_duplicate_existing_need');
        const id=old?.id||'op_'+randomUUID();if(assigned.has(id))throw Error('distinct_findings_cannot_share_identity');assigned.add(id);
        const candidateHash=plainHash({classification:f.classification,opportunityType:f.opportunityType,evidence:f.evidence,recommendedNextAction:f.recommendedNextAction}),decisionHash=plainHash({classification:f.classification,opportunityType:f.opportunityType,humanReviewRequired:f.humanReviewRequired});
        if(old){this.revokeForFinding(id,'ATTRIBUTABLE_IDENTITY_REVIEW');this.db.prepare("UPDATE opportunities SET anchors=?,aliases=?,source_hash=?,candidate_hash=?,decision_hash=?,revision=revision+1,state='pending_review',reviewed_candidate_hash=NULL WHERE id=?").run(JSON.stringify(anchors),JSON.stringify([...new Set([...JSON.parse(old.aliases),f.opportunityKey])]),sourceHash,candidateHash,decisionHash,id);this.db.prepare('UPDATE approvals SET revoked=1 WHERE op_id=?').run(id);}
        else this.db.prepare("INSERT INTO opportunities(id,context_key,anchors,aliases,source_hash,candidate_hash,decision_hash,state) VALUES(?,?,?,?,?,?,?,'pending_review')").run(id,key,JSON.stringify(anchors),JSON.stringify([f.opportunityKey]),sourceHash,candidateHash,decisionHash);
      }
      for(const old of existing)if(!assigned.has(old.id)){this.revokeForFinding(old.id,'IDENTITY_REVIEW_WITHDREW_FINDING');this.db.prepare("UPDATE opportunities SET state='not_observed',anchors='[]',revision=revision+1,reviewed_candidate_hash=NULL WHERE id=?").run(old.id);}
      this.db.prepare('INSERT INTO general_identity_reviews VALUES(?,?,?,?,?,?,?,?)').run('identity_review_'+randomUUID(),actor.subject,actor.kind,key,input.generation,input.sourceHash,JSON.stringify(bindings),new Date().toISOString());
    });
    const findings=this.acceptEvaluation({key,generation:input.generation},history,result);
    this.db.prepare('DELETE FROM general_identity_candidates WHERE context_key=? AND generation=?').run(key,input.generation);
    return {findings,identityKind:actor.kind,semanticReviewStillRequired:true,humanSignoff:actor.kind==='LOCAL_SYNTHETIC'?'NOT_HUMAN_SIGNOFF':'OPERATOR_IDENTITY_ATTESTATION_ONLY'};
  }
  revokeForFinding(op,reason){
    const operation=this.db.prepare('SELECT * FROM cert_operations WHERE op_id=?').get(op);
    if(operation){this.db.prepare('UPDATE cert_approvals SET revoked=1 WHERE operation_id=?').run(operation.id);if(['PREPARED','APPROVED'].includes(operation.state))this.db.prepare("UPDATE cert_operations SET state='PREPARED',revision=revision+1 WHERE id=?").run(operation.id);this.trace(operation.id,reason,operation.payload_hash);}
  }
  findings(key){return this.db.prepare('SELECT * FROM general_findings WHERE context_key=?').all(key).map(r=>({findingId:r.op_id,modelFinding:JSON.parse(r.raw_json),candidateHash:r.candidate_hash,sourceHash:r.source_hash,inspection:JSON.parse(r.inspection_json),reviewState:r.review_state,operation:(()=>{const op=this.db.prepare('SELECT id,state,remote_id FROM cert_operations WHERE op_id=?').get(r.op_id);return op?{operationId:op.id,state:op.state,remoteTaskId:op.remote_id}:null;})()}));}
  async evaluate(env,source,reason){
    const ticket=this.beginEvaluation(env);
    try{const context=await source.readContext();const history=await prepareHistory(context);const result=await reason(context,ticket.key);return this.acceptEvaluation(ticket,history,result);}
    catch(e){this.failEvaluation(ticket);throw e;}
  }
  async review(input,actor,env,source){
    role(actor);
    const f=this.db.prepare('SELECT * FROM general_findings WHERE op_id=?').get(input.findingId);
    const c=f&&this.db.prepare('SELECT * FROM general_contexts WHERE context_key=?').get(f.context_key);
    if(!f||c?.state!=='READY'||f.review_state==='WITHDRAWN'||f.source_hash!==input.sourceHash||f.candidate_hash!==input.candidateHash||c.contract_hash!==contractHash)throw Error('stale_review_target');
    if(input.attestHumanReview!==true)throw Error('explicit_operator_attestation_required');
    const history=await prepareHistory(await source.readContext());
    if(digest(history)!==f.source_hash){this.revokeForFinding(f.op_id,'SOURCE_CHANGED_DURING_REVIEW');throw Error('source_changed_refresh_required');}
    const raw=JSON.parse(f.raw_json),decision=input.decision;
    if(!['REVIEW','DECLINE','DEFER'].includes(decision))throw Error('bounded_review_decision_required');
    let projection;
    if(decision==='REVIEW'){
      const all=this.findings(f.context_key).filter(x=>x.reviewState!=='WITHDRAWN').map(x=>x.modelFinding);
      projection=generalProjection(raw,history,input.spec,f.context_key,new Date().toISOString(),all);
    }
    // Recheck after the remote read; another evaluation/review must not be overwritten.
    return this.tx(()=>{
      const latest=this.db.prepare('SELECT * FROM general_findings WHERE op_id=?').get(f.op_id),current=this.db.prepare('SELECT * FROM general_contexts WHERE context_key=?').get(f.context_key);
      if(current.state!=='READY'||latest.candidate_hash!==f.candidate_hash||latest.source_hash!==f.source_hash||current.generation!==c.generation)throw Error('superseded_operator_review');
      const identity=this.db.prepare('SELECT * FROM opportunities WHERE id=?').get(f.op_id);
      let prepared;
      // Nested transactions are deliberately avoided; persist after this check below.
      return {generation:current.generation,sourceHash:f.source_hash,candidateHash:f.candidate_hash,projection,identity:{opportunityId:f.op_id,candidateHash:identity.candidate_hash,sourceHash:identity.source_hash},decision};
    });
  }
  finishReview(input,actor,checked,env){
    // Synchronous continuation from review() in the same DO event; no I/O in between.
    const latest=this.db.prepare('SELECT * FROM general_findings WHERE op_id=?').get(input.findingId),context=this.db.prepare('SELECT * FROM general_contexts WHERE context_key=?').get(latest?.context_key);
    if(!latest||context?.state!=='READY'||context.generation!==checked.generation||latest.source_hash!==checked.sourceHash||latest.candidate_hash!==checked.candidateHash)throw Error('superseded_operator_review');
    this.revokeForFinding(input.findingId,'NEW_OPERATOR_REVIEW_REQUIRES_APPROVAL');
    const prepared=checked.projection?this.prepareProjection(checked.identity,checked.projection,env):null;
    return this.tx(()=>{
      if(!prepared)this.revokeForFinding(input.findingId,'OPERATOR_'+checked.decision);
      const f=this.db.prepare('SELECT * FROM general_findings WHERE op_id=?').get(input.findingId);
      const id='review_'+crypto.randomUUID();
      this.db.prepare('INSERT INTO general_reviews VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(id,input.findingId,prepared?.operationId??null,actor.subject,actor.kind,f.source_hash,f.candidate_hash,contractHash,JSON.stringify(input.spec??null),prepared?.payloadHash??null,checked.decision,new Date().toISOString());
      this.db.prepare('UPDATE general_findings SET review_state=? WHERE op_id=?').run(checked.decision==='REVIEW'?'REVIEWED':checked.decision,input.findingId);
      return {reviewId:id,identityKind:actor.kind,humanSignoff:actor.kind==='EXTERNAL_VERIFIED'?'OPERATOR_ATTESTED':'NOT_HUMAN_SIGNOFF',...prepared};
    });
  }
  assertReviewCurrent(op){
    const f=this.db.prepare('SELECT * FROM general_findings WHERE op_id=?').get(op.op_id);
    if(!f)return null;
    const due=JSON.parse(op.material_json).operatorTaskDueAt;
    if(!Number.isFinite(Date.parse(due))||Date.parse(due)<=Date.now())throw Error('operator_task_deadline_expired');
    const c=this.db.prepare('SELECT * FROM general_contexts WHERE context_key=?').get(f.context_key);
    const review=this.db.prepare("SELECT * FROM general_reviews WHERE op_id=? ORDER BY rowid DESC LIMIT 1").get(op.op_id);
    if(c?.state!=='READY'||c.contract_hash!==contractHash||f.review_state!=='REVIEWED'||!review||review.decision!=='REVIEW'||review.operation_id!==op.id||review.payload_hash!==op.payload_hash||review.source_hash!==f.source_hash||review.candidate_hash!==f.candidate_hash||review.contract_hash!==contractHash)throw Error('operator_review_stale_or_missing');
    return review;
  }
  validate(op,approval,env){
    const request=super.validate(op,approval,env),review=this.assertReviewCurrent(op);
    if(env.executionActor){const binding=this.db.prepare('SELECT * FROM general_approval_identity WHERE approval_id=?').get(approval.id);if(!binding||binding.authority_hash!==actorAuthority(env.executionActor))throw Error('approval_identity_changed');if(env.executionActor.expiresAt!==undefined&&env.executionActor.expiresAt<=Date.now())throw Error('operator_session_expired_before_submission');}
    if(review){const binding=this.db.prepare('SELECT * FROM general_approval_bindings WHERE approval_id=?').get(approval.id);if(!binding||binding.review_id!==review.id||binding.action_version!==this.status(op.id).actionVersion)throw Error('approval_review_or_action_version_mismatch');}
    return request;
  }
  approve(id,hash,actor){
    const op=this.db.prepare('SELECT * FROM cert_operations WHERE id=?').get(id);
    if(op&&this.db.prepare('SELECT * FROM general_findings WHERE op_id=?').get(op.op_id))throw Error('general_approval_route_required');
    return super.approve(id,hash,actor);
  }
  approveGeneral(input,actor){
    role(actor);const op=this.db.prepare('SELECT * FROM cert_operations WHERE id=?').get(input.operationId);
    if(!op)throw Error('unknown_operation');
    const review=this.assertReviewCurrent(op);
    if(!review||review.id!==input.reviewId||this.status(op.id).actionVersion!==input.actionVersion)throw Error('exact_review_and_action_version_required');
    const grant=super.approve(op.id,input.payloadHash,actor);
    this.db.prepare('INSERT INTO general_approval_bindings VALUES(?,?,?)').run(grant.approvalId,review.id,input.actionVersion);
    this.db.prepare('INSERT INTO general_approval_identity VALUES(?,?)').run(grant.approvalId,actorAuthority(actor));
    return {...grant,reviewId:review.id,actionVersion:input.actionVersion};
  }
  async execute(id,approvalId,client,env){
    const op=this.db.prepare('SELECT * FROM cert_operations WHERE id=?').get(id);
    if(op&&this.db.prepare('SELECT * FROM general_findings WHERE op_id=?').get(op.op_id))throw Error('general_execution_route_required');
    return super.execute(id,approvalId,client,env);
  }
  async executeGeneral(id,approvalId,actor,env,source,reason,client){
    role(actor);const op=this.db.prepare('SELECT * FROM cert_operations WHERE id=?').get(id);
    if(!op||!this.db.prepare('SELECT * FROM general_findings WHERE op_id=?').get(op.op_id))throw Error('general_operation_required');
    const grant=this.db.prepare('SELECT * FROM cert_approvals WHERE id=?').get(approvalId);
    const identityBinding=grant&&this.db.prepare('SELECT * FROM general_approval_identity WHERE approval_id=?').get(grant.id);
    if(!grant||grant.operation_id!==op.id||grant.actor!==actor.subject||grant.kind!==actor.kind||!identityBinding||identityBinding.authority_hash!==actorAuthority(actor)){if(grant&&grant.operation_id===op.id)this.db.prepare('UPDATE cert_approvals SET revoked=1 WHERE id=?').run(grant.id);throw Error('approval_identity_changed');}
    const executionEnv={...env,executionActor:actor};
    if(['CONFIRMED','UNKNOWN','SENDING'].includes(op.state))return super.execute(id,approvalId,client,executionEnv);
    const local=env.CERTIFICATION_MODE==='local'&&env.ENABLE_LOCAL_GENERAL_TEST_EXECUTION==='true';
    if(!local&&(env.ENABLE_GENERAL_EXECUTION!=='true'||env.GENERAL_RELEASE_APPROVED!=='true'||actor.kind!=='EXTERNAL_VERIFIED'))throw Error('general_execution_release_blocked');
    await this.evaluate(env,source,reason);
    const guarded={verifyIsolation:async()=>{await client.verifyIsolation();const h=await prepareHistory(await source.readContext());const current=this.db.prepare('SELECT * FROM general_findings WHERE op_id=?').get(op.op_id);if(digest(h)!==current.source_hash){this.revokeForFinding(op.op_id,'SOURCE_CHANGED_IMMEDIATELY_BEFORE_POST');throw Error('fresh_source_changed');}},create:body=>client.create(body),lookup:(...args)=>client.lookup(...args)};
    return super.execute(id,approvalId,guarded,executionEnv);
  }
}
export { contractHash };
