import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {gradeWorkflowCase} from './workflow-core.js';
import {hash} from './findings-core.js';
import {GeneralFindingLedger} from '../../src/staging/general-ledger.js';
import {prepareHistory} from '../../src/findings.js';
import {MATERIALIZATION_VERSION} from '../../src/release/reasoning.js';
const load=async p=>JSON.parse(await readFile(p,'utf8'));
const manifest=await load('docs/review/semantic-diagnostic-cycle/retained-capture-replay.json');
const fixtures=await Promise.all(['enterprise-v2','unseen-review-variations-v1','absolute-timing-boundaries-v1','release-restrictions-v1','release-negative-qualifiers-v1'].map(n=>load('fixtures/'+n+'.json')));
const cases=new Map(fixtures.flatMap(s=>s.cases.map(c=>[c.id,{...c,context:c.context||{customer:'Synthetic restriction',serviceHistory:[{timestamp:c.timestamp,note:c.note}]}}])));
const db=new DatabaseSync(':memory:');
const adapter={exec:q=>db.exec(q),prepare:q=>db.prepare(q),transaction:fn=>{db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}};
const ledger=new GeneralFindingLedger(adapter,{OPERATOR_EMAIL_ENABLED:'false'}),cache=new Map(),stable=new Map(),rows=[];
try{
 for(const retained of manifest.rows){
  const file=retained.captureFile.startsWith('completion-correction/')?'docs/review/'+retained.captureFile:'docs/release/evidence/'+retained.captureFile;
  if(!cache.has(file))cache.set(file,await load(file));
  const recorded=cache.get(file).rows.find(r=>r.id===retained.id&&r.rawModelOutput&&hash(JSON.parse(r.rawModelOutput))===retained.rawOutputHash);
  if(!recorded)throw Error('retained_capture_integrity_failure');
  const c=cases.get(retained.id);if(!c)throw Error('unknown_retained_case');
  try{
   const row=await gradeWorkflowCase(c,JSON.parse(recorded.rawModelOutput),retained.sourceTime);
   const env={STAGING_PORTAL_ID:'synthetic',STAGING_CONTACT_ID:c.id},ticket=ledger.beginEvaluation(env);
   const findings=ledger.acceptEvaluation(ticket,await prepareHistory(c.context),row.actual,retained.sourceTime);
   const ids=findings.filter(f=>f.reviewState!=='WITHDRAWN').map(f=>f.findingId).sort();
   const previous=stable.get(c.id);if(!previous)stable.set(c.id,ids);
   const identityStable=!previous||hash(previous)===hash(ids);
   rows.push({id:c.id,captureFile:retained.captureFile,run:retained.run,sourceTime:retained.sourceTime,rawOutputHash:retained.rawOutputHash,...row,identityStable,durableFindingIds:ids,passed:row.passed&&identityStable});
  }catch(e){rows.push({id:c.id,captureFile:retained.captureFile,passed:false,error:'workflow_replay_failed',detail:/^[a-z0-9_]+$/i.test(e.message)?e.message:'invalid_or_ambiguous_finding'});}
 }
 const missingCases=[...cases.keys()].filter(id=>!rows.some(r=>r.id===id)),base=rows.filter(r=>fixtures[0].cases.some(c=>c.id===r.id));
 const confusion={tp:0,tn:0,fp:0,fn:0};
 for(const r of base){if(!r.actual)continue;const c=cases.get(r.id),want=c.expectedFindingCount>0,got=r.actual.findings.length>0;confusion[want?(got?'tp':'fn'):(got?'fp':'tn')]++;}
 const contractCoverage=fixtures[0].cases.filter(c=>c.expectedFindingCount>1).map(c=>({id:c.id,expected:c.expectedFindingCount,runs:rows.filter(r=>r.id===c.id).length,passed:rows.filter(r=>r.id===c.id).every(r=>r.passed&&r.actual.findings.length===c.expectedFindingCount)}));
 const summary={executions:rows.length,cases:new Set(rows.map(r=>r.id)).size,passed:rows.filter(r=>r.passed).length,failures:rows.filter(r=>!r.passed).map(r=>({id:r.id,error:r.error,quality:r.quality,dimensions:r.grade?.failures})),missingCases,contractCoverage,baseCorpus:{cases:fixtures[0].cases.length,executions:base.length,passed:base.filter(r=>r.passed).length,confusion},identityStable:rows.every(r=>r.identityStable===true)};
 const report={kind:'SUPPORTED_MULTI_FINDING_OFFLINE_GATE',policyVersion:'supported-workflow-offline-gate-v1',MATERIALIZATION_VERSION,captureManifestHash:hash(manifest),fixtureHashes:fixtures.map(f=>({version:f.version,sha256:hash(f)})),modelCalls:0,hubspotCalls:0,emailCalls:0,summary,offlineGatePassed:rows.length===manifest.rows.length&&!summary.failures.length&&!missingCases.length&&contractCoverage.every(r=>r.runs>0&&r.passed),releaseAccepted:false,freshModelValidation:'PENDING_CURRENT_GENERATOR_REQUIRES_ADDITIONAL_AUTHORIZATION',humanSemanticReview:'PENDING',limitations:['Retained provider captures, not fresh inference.','Automated bounds and structural identity checks do not establish human semantic acceptance.','Legacy single-summary diagnostic is reported separately and cannot prove independent-finding coverage.'],rows};
 await mkdir('reports',{recursive:true});await writeFile('reports/workflow-offline.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({...report,rows:undefined},null,2));process.exitCode=report.offlineGatePassed?0:1;
}finally{db.close();}
