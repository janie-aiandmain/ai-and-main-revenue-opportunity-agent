import {checkedJsonFetch,missingCredential} from '../staging/blockers.js';
import contract from '../findings-request-v0.3.3.json' with {type:'json'};
import {prepareHistory,materializeFindings} from '../findings.js';
import {materializeCorrected as previous} from '../findings-v0.3.3.js';
import {internalPlan} from '../staging/internal-task-policy.js';
import {inspectFinding} from '../staging/review-policy.js';
import {completeEvidence,EVIDENCE_POLICY} from './evidence.js';
import {completedPricingClassification,COMPLETED_PRICING_CLASSIFICATION_POLICY} from '../staging/completion-policy.js';
export {EVIDENCE_POLICY};
export const PROMPT_VERSION='reasoning-v0.3.3',SCHEMA_VERSION='findings-v0.2',MATERIALIZATION_VERSION='source-evidence-v0.3.8';
export async function materializeCorrected(raw,history,key,time=new Date().toISOString()){
 // Validate original model spans and distinctness before completing source clauses.
 await materializeFindings(raw,history,key);
 const closed=completeEvidence(raw,history);
 const provisional=await previous(closed.raw,history,key,time);
 const finalRaw={findings:provisional.findings.map(f=>{
   const inspection=inspectFinding(f,history,provisional.findings,time);
   // Never launder unsupported authority/intent/evidence through safe wording.
   const unsafe=inspection.qualityFailures.some(x=>x.code!=='historical_deadline_repeated_in_action');
   const {findingId,proposedAction,...rawFinding}=f;
   if(unsafe)return rawFinding;
   const classified=completedPricingClassification(rawFinding,inspection);
   const plan=internalPlan(classified,history,inspection,time);
   const timing=plan.sourceTiming.map(t=>'Source '+t.sourceTimestamp+': '+JSON.stringify(t.wording)+(t.status.startsWith('HISTORICAL')?' is historical, not renewed.':' is unresolved source timing; customer timezone is unknown.')+' Verify current interest and timing.');
   const restrictions=plan.sourceRestrictions.map(e=>'Customer context: '+JSON.stringify(e.quote));
   return {...classified,recommendedNextAction:[plan.instruction,...timing,...restrictions,'Internal task only. No customer action is authorized.'].join(' ')};
 })};
 return {...await previous(finalRaw,history,key,time),materializationVersion:MATERIALIZATION_VERSION,evidencePolicyVersion:EVIDENCE_POLICY,classificationPolicyVersion:COMPLETED_PRICING_CLASSIFICATION_POLICY};
}
export async function reasonCorrected(env,context,key,time=new Date().toISOString()){
 if(!env.EVAL_OPENAI_API_KEY)throw missingCredential('EVAL_OPENAI_API_KEY');
 if(!Number.isFinite(Date.parse(time)))throw Error('evaluation_clock_required');
 const history=await prepareHistory(context);let endpoint='https://api.openai.com/v1/responses';
 if(env.LOCAL_MODEL_FIXTURE_URL){const u=new URL(env.LOCAL_MODEL_FIXTURE_URL);if(env.CERTIFICATION_MODE!=='local'||u.protocol!=='http:'||!['127.0.0.1','localhost'].includes(u.hostname))throw Error('local_model_fixture_forbidden');endpoint=u.origin+'/model/responses';}
 const response=await checkedJsonFetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+env.EVAL_OPENAI_API_KEY,'Content-Type':'application/json'},signal:AbortSignal.timeout(60000),body:JSON.stringify({...contract,input:JSON.stringify({evaluationTime:time,customer:context.customer,serviceHistory:history})})},'EVAL_OPENAI_API_KEY','Responses inference');
 const text=(response.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]).find(x=>x.type==='output_text')?.text;if(!text)throw Error('missing_findings_output');
 return materializeCorrected(JSON.parse(text),history,key,time);
}
