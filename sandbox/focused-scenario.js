import { mkdtemp,rm,writeFile,mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { CorrectionSandbox } from './correction-store.js';
import { TASK_CLASS } from '../src/correction-policy.js';
export async function runFocusedScenario(){
 const dir=await mkdtemp(tmpdir()+'/focused-correction-'),path=dir+'/sandbox.sqlite',db=new CorrectionSandbox(path);
 const now='2026-11-02T12:00:00Z',context='sandbox:single-opportunity';
 const history=[{noteId:'synthetic-note-1',timestamp:now,note:'Customer requests pricing for surge protection.'}];
 const candidate=key=>({opportunityKey:key,classification:'strong cross-sell opportunity',opportunityType:'cross-sell',confidence:'high',evidence:[{noteId:history[0].noteId,quote:history[0].note}],reasoningSummary:'Synthetic reference.',recommendedNextAction:'Prepare reviewed pricing follow-up for '+key+'.',humanReviewRequired:true});
 const spec={actionClass:TASK_CLASS,targetContext:context,classification:'strong cross-sell opportunity',opportunityType:'cross-sell',intent:'prepare_quote',scope:{service:'surge_protection',location:'unspecified'},priority:'HIGH',evidence:candidate('surge-protection').evidence,timing:{kind:'none'},constraints:[],humanApprovalRequired:true};
 const observations=[];
 const process=(key,contract=spec)=>{const r=db.reconcile(context,history,[candidate(key)])[0];const result=db.publishSandboxReview(r.opportunityId,contract,history,{kind:'SANDBOX_SIMULATION',reference:'synthetic-canonical-intent-review',disposition:'EQUIVALENT_OR_MATERIAL_AS_PROJECTED',candidateHash:r.candidateHash,sourceHash:r.sourceHash});observations.push({modelKey:key,opportunityId:r.opportunityId,version:result.actionVersion});return result;};
 try{
  const first=process('surge-protection'),approval=db.approveSandbox(first.opportunityId,now);
  const task=db.executeSandbox(approval,now,history);
  for(const key of ['surge-protection-pricing','whole-home-surge-review','surge-protection']){process(key);const retry=db.executeSandbox(approval,now,history);if(retry.taskId!==task.taskId||retry.created)throw Error('Duplicate sandbox task');}
  const repeatCounts=db.counts();
  const changed=process('surge-protection-pricing',{...spec,priority:'MEDIUM'});
  let oldApprovalBlocked=false;try{db.executeSandbox(approval,now,history);}catch{oldApprovalBlocked=true;}
  const fresh=db.approveSandbox(first.opportunityId,now);
  let secondCreateBlocked=false;try{db.executeSandbox(fresh,now,history);}catch{secondCreateBlocked=true;}
  const event={externalRef:'synthetic:outcome:1',opportunityId:first.opportunityId,amountMinor:25000,currency:'USD',metric:'influenced',evidenceRef:'synthetic-corroboration:1'};
  const revenueAttempts=Array.from({length:5},()=>db.recordSandboxOutcome(event));
  const reopened=new CorrectionSandbox(path);let restartTaskCount;try{restartTaskCount=reopened.counts().tasks;}finally{reopened.close();}
  const finalCounts=db.counts();
  if(!oldApprovalBlocked||!secondCreateBlocked||finalCounts.tasks!==1||finalCounts.outcomes!==1||finalCounts.revenueByCurrency.USD!==25000)throw Error('Focused sandbox invariant failed');
  return {kind:'SYNTHETIC_LOCAL_SANDBOX_NOT_LIVE_CRM',newModelCalls:0,hubspotCalls:0,crmWrites:0,syntheticApprovalsOnly:true,modelKeyObservations:observations,stableIdentityForSynonyms:new Set(observations.map(o=>o.opportunityId)).size===1,repeatCounts,materialVersionChanged:changed.actionVersion!==first.actionVersion,oldApprovalBlocked,secondCreateBlocked,restartTaskCount,revenueAttempts:revenueAttempts.map(r=>r.recorded),finalCounts,limitations:'SQLite task/outcome effects share the transaction with the ledger. Remote HubSpot effects do not; no exactly-once live CRM guarantee is claimed.'};
 }finally{db.close();await rm(dir,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===new URL(process.argv[1],'file:').href){const result=await runFocusedScenario();await mkdir('docs/correction',{recursive:true});await writeFile('docs/correction/sandbox-results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({stableIdentity:result.stableIdentityForSynonyms,tasks:result.finalCounts.tasks,oldApprovalBlocked:result.oldApprovalBlocked,revenueEvents:result.finalCounts.outcomes,revenueMinor:result.finalCounts.revenueByCurrency.USD}));}
