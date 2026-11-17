// Isolated test fixtures using the unchanged production ledger; never a CRM executor.
import {GeneralFindingLedger,contractHash} from './general-ledger.js';
import {materializeCorrected} from '../release/reasoning.js';
import {prepareHistory,canonical} from '../findings.js';
import {digest} from './operation-ledger.js';
import fixture from '../../fixtures/approval-negative-v1.json' with {type:'json'};
export const APPROVAL_NEGATIVE_POLICY='hosted-isolated-approval-negatives-v1';
export const diagnosticName=runId=>'approval-negative-fixtures:'+runId;
export function assertNegativeDiagnostics(env){
 const local=env.CERTIFICATION_MODE==='local',demo=env.CERTIFICATION_MODE==='remote-demo'&&env.STAGING_PORTAL_ID==='247646122'&&env.STAGING_CONTACT_ID==='582095692487';
 if(!local&&!demo)throw Error('approval_diagnostics_demo_only');
 for(const name of ['CRM_WRITEBACK_ENABLED','ENABLE_TEST_TASK_WRITES','ENABLE_GENERAL_EXECUTION','GENERAL_RELEASE_APPROVED','DEMO_RECOVERY_ENABLED','DEMO_RECOVERY_EXECUTION_ENABLED','DEMO_RECOVERY_FAULT_ENABLED','DEMO_ONLY_EXECUTION_ENABLED','DEMO_RESPONSE_LOSS_TEST_ENABLED'])if((local?(env[name]??'false'):env[name])!=='false')throw Error('approval_diagnostics_require_closed_execution');
}
const allowedTables=/^(?:opportunities|approvals|sandbox_tasks|outcomes|audit|cert_(?:operations|approvals|trace|outcomes)|retention_audit_clock|general_(?:identity_candidates|identity_reviews|contexts|findings|approval_identity|approval_bindings|reviews)|operator_email_(?:state|outbox)|release_demo_(?:runs|attempts|faults))$/;
function clearFixtures(db){db.transaction(()=>{for(const t of db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all())if(allowedTables.test(t.name))db.exec('DELETE FROM '+t.name);});}
function setPath(object,path,value){if(path.some(k=>['__proto__','constructor','prototype'].includes(k)))throw Error('invalid_fixture_path');let at=object;for(const k of path.slice(0,-1))at=at[k];at[path.at(-1)]=value;}
async function makeCase(db,id){
 const env={CERTIFICATION_MODE:'local',DEPLOYMENT_ENVIRONMENT:'staging',STAGING_PORTAL_ID:'synthetic-negative-fixture',STAGING_CONTACT_ID:id,ENABLE_LOCAL_GENERAL_TEST_EXECUTION:'true',OPERATOR_EMAIL_ENABLED:'false'};
 const actor={subject:'synthetic-fixture-approver',role:'Approver',kind:'LOCAL_SYNTHETIC',issuer:'https://fixture.invalid',audience:'approval-fixture'};
 const ledger=new GeneralFindingLedger(db,env);let history=[{noteId:'fixture-note',timestamp:new Date(Date.now()-60000).toISOString(),note:fixture.sourceNote}],raw={opportunityKey:'surge-pricing',classification:'strong cross-sell opportunity',opportunityType:'cross-sell',confidence:'high',evidence:[{noteId:'fixture-note',quote:fixture.sourceNote}],reasoningSummary:'Synthetic fixture only.',recommendedNextAction:'Internal pricing preparation only. No customer action is authorized.',humanReviewRequired:true};
 const source={async readContext(){return {customer:'SYNTHETIC APPROVAL GUARD FIXTURE',serviceHistory:history};}},reason=async(c,key)=>materializeCorrected({findings:[raw]},await prepareHistory(c),key);
 const [finding]=await ledger.evaluate(env,source,reason),spec={actionPurpose:'internal_preparation',intent:'prepare_quote',priority:'HIGH',taskDueAt:new Date(Date.now()+86400000).toISOString(),timing:{kind:'internal_task'},attestations:{sourceRead:true,evidenceComplete:true,scopeBounded:true,timingVerified:true}},input={findingId:finding.findingId,sourceHash:finding.sourceHash,candidateHash:finding.candidateHash,decision:'REVIEW',attestHumanReview:true,spec};
 const prepared=ledger.finishReview(input,actor,await ledger.review(input,actor,env,source),env),grant=ledger.approveGeneral(prepared,actor);let creates=0,lookup='match';
 const candidate=()=>{const op=db.prepare('SELECT * FROM cert_operations WHERE id=?').get(prepared.operationId);return {id:'simulated-effect-'+id,properties:JSON.parse(op.payload_json).body.properties,associations:{contacts:{results:[{id:env.STAGING_CONTACT_ID}]}}};};
 const client={async verifyIsolation(){},async create(){creates++;return {id:'simulated-effect-'+id};},async lookup(){if(lookup==='unavailable')throw Error('fixture_lookup_unavailable');if(lookup==='absent')return [];const one=candidate();if(lookup==='mismatched')one.associations.contacts.results[0].id='different-fixture-contact';if(['ambiguous','known_id_duplicate'].includes(lookup))return [one,{...candidate(),id:'second-simulated-effect'}];return [one];}};
 return {ledger,env,actor,source,reason,finding,input,spec,prepared,grant,client,creates:()=>creates,setLookup:x=>lookup=x,changeSource(){history=[...history,{noteId:'fixture-reversal',timestamp:new Date().toISOString(),note:'Fictional customer withdrew the request.'}];},changeClassification(){raw={...raw,classification:'follow-up revenue opportunity',opportunityType:'follow-up'};}};
}
export async function runApprovalNegativeMatrix(db,{runId,invocationKind='LOCAL_SYNTHETIC'}={}){
 if(!/^negative-[a-f0-9-]{36}$/.test(runId||''))throw Error('invalid_negative_run_id');
 // Refuse populated operational storage even if a caller misroutes this function.
 new GeneralFindingLedger(db,{});for(const {name} of db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all())if(allowedTables.test(name)&&db.prepare('SELECT count(*) AS n FROM '+name).get().n!==0)throw Error('diagnostic_storage_not_empty');
 const report={policyVersion:APPROVAL_NEGATIVE_POLICY,fixtureVersion:fixture.fixtureVersion,fixtureHash:digest(fixture),approvalContractHash:contractHash,runId,startedAt:new Date().toISOString(),invocationIdentityKind:invocationKind,testApprovalIdentityKind:'LOCAL_SYNTHETIC',testApprovalsAreHumanSignoff:false,fixtureSource:'Versioned fictional note; not CRM data or provider inference.',liveHubspotRequests:0,liveTaskCreates:0,modelCalls:0,emailProviderCalls:0,realOperatorLedgerAccessed:false,rows:[]};
 for(const c of fixture.cases){let lab,reason=null,result=null,method='executeGeneral';
  try{
   lab=await makeCase(db,c.id);const {ledger:l,prepared:p,grant:g}=lab,op=()=>db.prepare('SELECT * FROM cert_operations WHERE id=?').get(p.operationId);let actor={...lab.actor},approvalId=g.approvalId;
   if(c.kind==='missing_grant')approvalId='missing-fixture-grant';
   if(c.kind==='revoked')db.prepare('UPDATE cert_approvals SET revoked=1 WHERE id=?').run(g.approvalId);
   if(c.kind==='expired')db.prepare('UPDATE cert_approvals SET expires_at=? WHERE id=?').run(Date.now()-60000,g.approvalId);
   if(c.kind==='future_issued')db.prepare('UPDATE cert_approvals SET issued_at=? WHERE id=?').run(Date.now()+3600000,g.approvalId);
   if(c.kind==='actor')actor[c.field]=c.value==='PAST'?Date.now()-60000:c.value;
   if(c.kind==='missing_identity')db.prepare('DELETE FROM general_approval_identity WHERE approval_id=?').run(g.approvalId);
   if(c.kind==='stale_review_binding')db.prepare('UPDATE general_approval_bindings SET review_id=? WHERE approval_id=?').run('outdated-fixture-review',g.approvalId);
   if(c.kind==='context_contract'){db.prepare('UPDATE general_contexts SET contract_hash=? WHERE context_key=?').run('outdated-fixture-contract',l.contextKey(lab.env));method='resumeApproval';}
   if(c.kind==='corrupt_payload')db.prepare('UPDATE cert_operations SET payload_json=? WHERE id=?').run(op().payload_json+' ',p.operationId);
   if(['corrupt_material','changed_material'].includes(c.kind)){const material=JSON.parse(op().material_json);material.scope.sourceRequests.push('Unapproved fixture scope change');db.prepare('UPDATE cert_operations SET material_json=?,material_hash=? WHERE id=?').run(JSON.stringify(material),c.kind==='changed_material'?digest(material):op().material_hash,p.operationId);}
   if(c.kind==='payload'){const request=JSON.parse(op().payload_json);setPath(request,c.path,c.value);db.prepare('UPDATE cert_operations SET payload_json=?,payload_hash=? WHERE id=?').run(canonical(request),digest(canonical(request)),p.operationId);}
   if(c.kind==='review_priority'||c.kind==='review_due'){const spec={...lab.spec,...(c.kind==='review_priority'?{priority:'LOW'}:{taskDueAt:new Date(Date.now()+172800000).toISOString()})},input={...lab.input,spec};l.finishReview(input,actor,await l.review(input,actor,lab.env,lab.source),lab.env);}
   if(c.kind==='source_change')lab.changeSource();if(c.kind==='classification_change')lab.changeClassification();
   if(c.kind==='uncertain'){db.prepare("UPDATE cert_operations SET state='UNKNOWN',remote_id=? WHERE id=?").run(c.lookup==='known_id_duplicate'?'simulated-known-id':null,p.operationId);lab.setLookup(c.lookup);}
   try{result=method==='resumeApproval'?await l.resumeApproval({operationId:p.operationId},actor,lab.env,lab.source):await l.executeGeneral(p.operationId,approvalId,actor,lab.env,lab.source,lab.reason,lab.client);
    if(c.kind==='positive')result=await l.executeGeneral(p.operationId,approvalId,actor,lab.env,lab.source,lab.reason,lab.client);
   }catch(error){reason=String(error.message);}
   const trace=l.status(p.operationId).trace.map(t=>t.event),simulatedCreates=lab.creates(),passed=c.expected==='CONFIRMED_ONCE'?result?.state==='CONFIRMED'&&simulatedCreates===1&&!reason:c.expected==='UNKNOWN_NO_CREATE'?result?.state==='UNKNOWN'&&simulatedCreates===0&&!reason&&trace.includes(c.expectedTrace):reason===c.expectedReason&&simulatedCreates===0;
   report.rows.push({caseId:c.id,kind:c.kind,expected:c.expected,method,passed,disposition:reason?'REJECTED':result?.state||'NO_RESULT',rejection:reason,expectedRejection:c.expectedReason??null,expectedUncertainTrace:c.expectedTrace??null,trace,simulatedCreateCalls:simulatedCreates,payloadHashBefore:p.payloadHash,payloadHashAfter:op()?.payload_hash,remainingState:op()?.state,humanApproval:false});
  }catch(error){report.rows.push({caseId:c.id,kind:c.kind,expected:c.expected,passed:false,disposition:'FIXTURE_OR_RUNNER_FAILURE',error:String(error.message),simulatedCreateCalls:lab?.creates()??0,humanApproval:false});}
  finally{clearFixtures(db);}
 }
 report.summary={cases:report.rows.length,passed:report.rows.filter(r=>r.passed).length,failed:report.rows.filter(r=>!r.passed).length,negativeCases:report.rows.filter(r=>r.expected!=='CONFIRMED_ONCE').length,negativeSimulatedCreateEscapes:report.rows.filter(r=>r.expected!=='CONFIRMED_ONCE'&&r.simulatedCreateCalls>0).length,positiveControlSimulatedCreates:report.rows.filter(r=>r.expected==='CONFIRMED_ONCE').reduce((n,r)=>n+r.simulatedCreateCalls,0),liveTaskCreates:0,fixtureOperationalRowsRetained:db.prepare('SELECT count(*) AS n FROM cert_operations').get().n};
 report.finishedAt=new Date().toISOString();report.limitations=['Synthetic approvals and altered fixture state are not real human sign-off.','The core validator runs with a local-test executor and injected non-network client to distinguish approval rejection from a closed writeback gate.','Hosted fixture execution is not an expired real Access-JWT test or another real CRM write/recovery.'];return report;
}
