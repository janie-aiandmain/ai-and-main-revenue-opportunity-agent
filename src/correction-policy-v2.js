// Versioned internal-task extension; original correction-policy.js is immutable.
export * from './correction-policy.js';
import {materialExecutable as originalMaterialExecutable,TASK_CLASS} from './correction-policy.js';
export function materialExecutable(material,now){
  if(material.actionPurpose!==undefined){
    const verification=material.actionPurpose==='internal_verification',preparation=material.actionPurpose==='internal_preparation';
    if((!verification&&!preparation)||material.policyVersion!=='internal-task-policy-v1'||material.customerActionPermitted!==false||material.actionClass!==TASK_CLASS||material.humanApprovalRequired!==true||material.intent!==(verification?'verify_current_state':'prepare_quote')||material.timing?.kind!=='none'||!Array.isArray(material.customerActionGates)||!Array.isArray(material.sourceTimingConstraints))throw Error('invalid_internal_task_authority');
    if(preparation&&(material.customerActionGates.length||material.sourceTimingConstraints.length))throw Error('internal_preparation_cannot_bypass_customer_prerequisites');
    if(!Number.isFinite(Date.parse(material.operatorTaskDueAt))||Date.parse(material.operatorTaskDueAt)<=Date.parse(now))throw Error('internal_task_due_date_missing_or_expired');
  }
  return originalMaterialExecutable(material,now);
}
