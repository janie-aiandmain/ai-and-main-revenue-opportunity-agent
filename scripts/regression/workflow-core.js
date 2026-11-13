// Supported output contract, replayed offline. Never synthesizes missing findings.
import {materializeCorrected} from '../../src/release/reasoning.js';
import {prepareHistory,canonical} from '../../src/findings.js';
import {inspectFinding} from '../../src/staging/review-policy.js';
import {gradeFindings,hash} from './findings-core.js';
export async function gradeWorkflowCase(c,raw,time){
 const history=await prepareHistory(c.context),actual=await materializeCorrected(raw,history,'synthetic:'+c.id,time);
 const inspections=actual.findings.map(f=>inspectFinding(f,history,actual.findings,time));
 const quality=inspections.flatMap(x=>x.qualityFailures);
 const grade=c.expectedFindings?await gradeFindings(c,actual,{materializer:(r,h,k)=>materializeCorrected(r,h,k,time)}):null;
 const decisionPassed=grade?grade.decisionPassed:c.types?canonical(actual.findings.map(f=>f.opportunityType).sort())===canonical([...c.types].sort()):(actual.findings.length>0)===c.expectedActionable;
 const text=actual.findings.flatMap(f=>f.evidence.map(e=>e.quote)).join('\n');
 const missing=(typeof c.required==='string'?[c.required]:c.required||[]).filter(q=>!text.includes(q));
 const unsafeActions=actual.findings.filter(f=>f.proposedAction?.material?.customerActionPermitted!==false||f.proposedAction?.executionBlocked!==true||f.humanReviewRequired!==true);
 return {actual,outputHash:hash(actual),decisionPassed,quality,missing,grade,passed:decisionPassed&&!quality.length&&!missing.length&&!unsafeActions.length&&!(grade?.failures.length),humanSemanticVerdict:'PENDING',finalExecutionApproval:false};
}
