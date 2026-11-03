// Shared correction domain ledger. Storage/transactions are injected; no HTTP executor.
import { createHash, randomUUID } from 'node:crypto';
import { sourceAnchors, strongOverlap, reviewedProjection, materialExecutable, canonical, TASK_CLASS } from './correction-policy.js';
const hash=x=>createHash('sha256').update(canonical(x)).digest('hex');
const snapshot=history=>hash([...history].sort((a,b)=>a.noteId.localeCompare(b.noteId)));
export const CORRECTION_SCHEMA = `CREATE TABLE IF NOT EXISTS opportunities(id TEXT PRIMARY KEY,context_key TEXT NOT NULL,anchors TEXT NOT NULL,aliases TEXT NOT NULL,source_hash TEXT NOT NULL,candidate_hash TEXT NOT NULL,decision_hash TEXT NOT NULL,reviewed_candidate_hash TEXT,version TEXT,revision INTEGER NOT NULL DEFAULT 1,state TEXT NOT NULL,projection TEXT,review_ref TEXT);
      CREATE TABLE IF NOT EXISTS approvals(id TEXT PRIMARY KEY,op_id TEXT NOT NULL,version TEXT NOT NULL,revision INTEGER NOT NULL,source_hash TEXT NOT NULL,granted_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,revoked INTEGER NOT NULL DEFAULT 0,consumed INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS sandbox_tasks(id TEXT PRIMARY KEY,op_id TEXT NOT NULL UNIQUE,version TEXT NOT NULL,payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS outcomes(external_ref TEXT PRIMARY KEY,op_id TEXT NOT NULL,amount_minor INTEGER NOT NULL,currency TEXT NOT NULL,metric TEXT NOT NULL,evidence_ref TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,event TEXT NOT NULL,op_id TEXT,reason TEXT);`;
export class CorrectionLedger {
  constructor(database){this.db=database;this.db.exec(CORRECTION_SCHEMA);}
  close(){this.db.close();}
  tx(fn){return this.db.transaction(fn);}
  audit(event,op,reason){this.db.prepare('INSERT INTO audit(event,op_id,reason) VALUES(?,?,?)').run(event,op,reason);}
  reconcile(contextKey,history,findings,{newNeedReviews=[]}={}) {
    const sourceHash=snapshot(history);
    // Suspend old proposals before parsing a fresh evaluation, even if parsing fails.
    this.tx(()=>{
      const current=this.db.prepare('SELECT * FROM opportunities WHERE context_key=?').all(contextKey);
      for(const op of current){
        if(op.source_hash!==sourceHash){
          this.db.prepare("UPDATE opportunities SET source_hash=?,state='source_changed_pending_identity',reviewed_candidate_hash=NULL,revision=revision+1 WHERE id=?").run(sourceHash,op.id);
          this.db.prepare('UPDATE approvals SET revoked=1 WHERE op_id=?').run(op.id);
          this.audit('approval_invalidated',op.id,'fresh_source_snapshot_changed');
        }else if(op.state!=='not_observed') this.db.prepare("UPDATE opportunities SET state='evaluation_pending' WHERE id=?").run(op.id);
      }
    });
    const compact=a=>({noteId:a.noteId,start:a.start,end:a.end,sourceHash:hash({text:a.sourceText,timestamp:a.timestamp}),text:a.sourceText.slice(a.start,a.end)});
    const prepared=findings.map(f=>({finding:f,anchors:sourceAnchors(history,f.evidence).map(compact)}));
    // Overlapping evidence cannot define two independent needs automatically.
    for(let i=0;i<prepared.length;i++) for(let j=i+1;j<prepared.length;j++) if(prepared[i].anchors.some(a=>prepared[j].anchors.some(b=>strongOverlap(a,b)))) throw Error('Ambiguous batch: distinct needs require disjoint evidence');
    return this.tx(()=>{
      const existing=this.db.prepare('SELECT * FROM opportunities WHERE context_key=?').all(contextKey),wasKnown=existing.length>0,observed=new Set(),result=[];
      for(const {finding:f,anchors} of prepared){
        const changedSource=existing.some(o=>JSON.parse(o.anchors).some(a=>anchors.some(b=>a.noteId===b.noteId&&a.sourceHash!==b.sourceHash)));
        if(changedSource) throw Error('Edited source anchor requires explicit identity review');
        const candidates=existing.filter(o=>JSON.parse(o.anchors).some(a=>anchors.some(b=>strongOverlap(a,b))));
        if(candidates.length>1) throw Error('Ambiguous identity bridge requires review');
        let op=candidates[0];
        if(op&&observed.has(op.id)) throw Error('Two candidates resolve to one opportunity; review required');
        const decisionHash=hash({classification:f.classification,opportunityType:f.opportunityType,humanReviewRequired:f.humanReviewRequired});
        const candidateHash=hash({classification:f.classification,opportunityType:f.opportunityType,evidence:f.evidence,recommendedNextAction:f.recommendedNextAction});
        if(!op){
          if(wasKnown&&!newNeedReviews.some(r=>r.kind==='SANDBOX_SIMULATION'&&r.reference&&r.contextKey===contextKey&&r.sourceHash===sourceHash&&r.evidenceHash===hash(anchors))) throw Error('Unmatched new evidence requires explicit new-need identity review; no duplicate allocated');
          const id='op_'+randomUUID();
          this.db.prepare('INSERT INTO opportunities(id,context_key,anchors,aliases,source_hash,candidate_hash,decision_hash,state) VALUES(?,?,?,?,?,?,?,?)').run(id,contextKey,JSON.stringify(anchors),JSON.stringify([f.opportunityKey]),sourceHash,candidateHash,decisionHash,'pending_review');
          op=this.db.prepare('SELECT * FROM opportunities WHERE id=?').get(id);existing.push(op);
        }else{
          const changed=op.source_hash!==sourceHash||op.state==='not_observed'||op.decision_hash!==decisionHash;
          if(changed){this.db.prepare('UPDATE approvals SET revoked=1 WHERE op_id=?').run(op.id);this.audit('approval_invalidated',op.id,'source_decision_changed_or_reappeared');}
          const aliases=[...new Set([...JSON.parse(op.aliases),f.opportunityKey])].sort();
          this.db.prepare('UPDATE opportunities SET aliases=?,source_hash=?,candidate_hash=?,decision_hash=?,revision=revision+?,state=? WHERE id=?').run(JSON.stringify(aliases),sourceHash,candidateHash,decisionHash,changed?1:0,changed||op.reviewed_candidate_hash!==candidateHash?'pending_review':'reviewed',op.id);
        }
        observed.add(op.id);result.push({opportunityId:op.id,modelKey:f.opportunityKey,candidateHash,sourceHash});
      }
      for(const op of existing) if(!observed.has(op.id)&&op.state!=='not_observed'){
        this.db.prepare("UPDATE opportunities SET state='not_observed',revision=revision+1 WHERE id=?").run(op.id);
        this.db.prepare('UPDATE approvals SET revoked=1 WHERE op_id=?').run(op.id);this.audit('approval_invalidated',op.id,'finding_not_observed');
      }
      return result;
    });
  }
  newNeedReviewSandbox(contextKey,history,finding,reference){
    const anchors=sourceAnchors(history,finding.evidence).map(a=>({noteId:a.noteId,start:a.start,end:a.end,sourceHash:hash({text:a.sourceText,timestamp:a.timestamp}),text:a.sourceText.slice(a.start,a.end)}));
    return {kind:'SANDBOX_SIMULATION',reference,contextKey,sourceHash:snapshot(history),evidenceHash:hash(anchors)};
  }
  publishSandboxReview(opId,spec,history,review) {
    if(review?.kind!=='SANDBOX_SIMULATION'||!review.reference||review.disposition!=='EQUIVALENT_OR_MATERIAL_AS_PROJECTED') throw Error('Explicit synthetic review decision required; this is not human sign-off');
    const projection=reviewedProjection(spec,history),version='action_'+hash(projection);
    return this.tx(()=>{
      const op=this.db.prepare('SELECT * FROM opportunities WHERE id=?').get(opId);
      if(!op||!['pending_review','reviewed'].includes(op.state)||spec.targetContext!==op.context_key||op.source_hash!==snapshot(history)||review.candidateHash!==op.candidate_hash||review.sourceHash!==op.source_hash) throw Error('Review is stale or unbound');
      const materialChange=op.version!==null&&op.version!==version;
      if(materialChange){this.db.prepare('UPDATE approvals SET revoked=1 WHERE op_id=?').run(opId);this.audit('approval_invalidated',opId,'material_projection_change');}
      this.db.prepare("UPDATE opportunities SET version=?,projection=?,reviewed_candidate_hash=candidate_hash,review_ref=?,state='reviewed',revision=revision+? WHERE id=?").run(version,JSON.stringify(projection),review.reference,materialChange?1:0,opId);
      return {opportunityId:opId,actionVersion:version,materialChange,payload:projection.payload};
    });
  }
  approveSandbox(opId,now,{actor='sandbox-approver',ttlMs=86400000}={}) {
    if(actor!=='sandbox-approver'||!Number.isSafeInteger(ttlMs)||ttlMs<=0||ttlMs>86400000) throw Error('Synthetic actor and validity at most 24h required');
    return this.tx(()=>{
      const op=this.db.prepare('SELECT * FROM opportunities WHERE id=?').get(opId);
      if(!op||op.state!=='reviewed'||op.reviewed_candidate_hash!==op.candidate_hash) throw Error('Unreviewed or stale finding');
      const projection=JSON.parse(op.projection);if('action_'+hash(projection)!==op.version) throw Error('Approved payload integrity lost; reconcile');
      materialExecutable(projection.material,now);
      const id='sandbox_approval_'+randomUUID();
      this.db.prepare('INSERT INTO approvals(id,op_id,version,revision,source_hash,granted_at,expires_at) VALUES(?,?,?,?,?,?,?)').run(id,opId,op.version,op.revision,op.source_hash,Date.parse(now),Date.parse(now)+ttlMs);
      this.audit('sandbox_approval',opId,'synthetic_actor_only');return id;
    });
  }
  executeSandbox(approvalId,now,history) {
    return this.tx(()=>{
      const a=this.db.prepare('SELECT * FROM approvals WHERE id=?').get(approvalId);
      const op=a&&this.db.prepare('SELECT * FROM opportunities WHERE id=?').get(a.op_id);
      if(!a||!op||a.revoked||Date.parse(now)<a.granted_at||Date.parse(now)>=a.expires_at||!Array.isArray(history)||snapshot(history)!==op.source_hash||op.state!=='reviewed'||op.version!==a.version||op.revision!==a.revision||op.source_hash!==a.source_hash||op.reviewed_candidate_hash!==op.candidate_hash) throw Error('Approval invalid, stale, suspended or expired');
      const projection=JSON.parse(op.projection);if('action_'+hash(projection)!==op.version) throw Error('Approved payload integrity lost; reconcile');materialExecutable(projection.material,now);
      if(projection.payload.type!==TASK_CLASS) throw Error('Prohibited action class');
      const existing=this.db.prepare('SELECT * FROM sandbox_tasks WHERE op_id=?').get(op.id);
      if(existing){
        if(existing.version!==a.version) throw Error('Existing task requires manual reconciliation; no second create');
        return {taskId:existing.id,created:false};
      }
      if(a.consumed) throw Error('Consumed approval has no confirmed effect; reconcile instead of retry');
      const id='sandbox_task_'+randomUUID();
      this.db.prepare('INSERT INTO sandbox_tasks(id,op_id,version,payload) VALUES(?,?,?,?)').run(id,op.id,a.version,JSON.stringify(projection.payload));
      this.db.prepare('UPDATE approvals SET consumed=1 WHERE id=?').run(a.id);this.audit('sandbox_task_created',op.id,'local_sqlite_effect_only');
      return {taskId:id,created:true};
    });
  }
  recordSandboxOutcome({externalRef,opportunityId,amountMinor,currency,metric,evidenceRef}) {
    if(!externalRef||!evidenceRef||!Number.isSafeInteger(amountMinor)||amountMinor<0||!(/^[A-Z]{3}$/).test(currency)||!['influenced','rescued'].includes(metric)) throw Error('Corroborated immutable outcome metadata required');
    return this.tx(()=>{
      if(!this.db.prepare('SELECT id FROM opportunities WHERE id=?').get(opportunityId)) throw Error('Unknown opportunity');
      const old=this.db.prepare('SELECT * FROM outcomes WHERE external_ref=?').get(externalRef);
      if(old){if(old.op_id!==opportunityId||old.amount_minor!==amountMinor||old.currency!==currency||old.metric!==metric||old.evidence_ref!==evidenceRef) throw Error('Outcome conflict: no double attribution');return {recorded:false};}
      this.db.prepare('INSERT INTO outcomes VALUES(?,?,?,?,?,?)').run(externalRef,opportunityId,amountMinor,currency,metric,evidenceRef);return {recorded:true};
    });
  }
  counts(){const groups=this.db.prepare('SELECT currency,sum(amount_minor) AS amount FROM outcomes GROUP BY currency').all();return {opportunities:this.db.prepare('SELECT count(*) AS n FROM opportunities').get().n,tasks:this.db.prepare('SELECT count(*) AS n FROM sandbox_tasks').get().n,outcomes:this.db.prepare('SELECT count(*) AS n FROM outcomes').get().n,revenueByCurrency:Object.fromEntries(groups.map(g=>[g.currency,g.amount]))};}
}
