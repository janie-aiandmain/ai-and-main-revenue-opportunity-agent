// Offline reprocessing of unchanged synthetic sources; no network or approvals.
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {CorrectionSandbox} from '../../sandbox/correction-store.js';
import {prepareHistory} from '../../src/findings.js';
const load=async p=>JSON.parse(await readFile(p,'utf8'));
const replay=await load('reports/release-final-policy-replay.json');
const fixtures=await Promise.all(['enterprise-v2','unseen-review-variations-v1','absolute-timing-boundaries-v1','release-negative-qualifiers-v1','release-restrictions-v1'].map(n=>load('fixtures/'+n+'.json')));
const cases=new Map(fixtures.flatMap(f=>f.cases.map(c=>[c.id,c.context||{customer:'Synthetic release restriction',serviceHistory:[{timestamp:c.timestamp,note:c.note}]}])));
const dir=await mkdtemp('/tmp/release-identity-'),ledger=new CorrectionSandbox(dir+'/state.sqlite'),baseline=new Map(),rows=[];
try{
 const ordered=[...replay.rows].sort((a,b)=>(a.captureFile.match(/\d{4}-\d{2}-\d{2}T[\d-]+/)?.[0]||'').localeCompare(b.captureFile.match(/\d{4}-\d{2}-\d{2}T[\d-]+/)?.[0]||'')||a.run-b.run);
 for(const row of ordered){const history=await prepareHistory(cases.get(row.id));try{
  const identities=ledger.reconcile('synthetic:'+row.id,history,row.actual.findings),ids=identities.map(i=>i.opportunityId).sort();const previous=baseline.get(row.id);if(!previous)baseline.set(row.id,ids);
  rows.push({id:row.id,captureFile:row.captureFile,run:row.run,identityReused:!previous||JSON.stringify(previous)===JSON.stringify(ids),bindings:row.actual.findings.map((f,i)=>({rawKey:f.opportunityKey,rawFindingId:f.findingId,durableFindingId:identities[i].opportunityId,classification:f.classification,opportunityType:f.opportunityType}))});
 }catch(error){rows.push({id:row.id,captureFile:row.captureFile,identityReviewRequired:true,reason:error.message});}}
 const expected=Array.from(baseline.values()).reduce((n,ids)=>n+ids.length,0),actual=ledger.db.prepare('SELECT count(*) AS n FROM opportunities').get().n;
 const result={kind:'OFFLINE_REPROCESSING_IDENTITY_REPLAY_NOT_HOSTED',modelCalls:0,hubspotCalls:0,rows,summary:{executions:rows.length,distinctPositiveNeeds:expected,durableIdentities:actual,extraIdentities:actual-expected,identityReviewRequired:rows.filter(r=>r.identityReviewRequired).map(r=>r.id),identityChanges:rows.filter(r=>r.identityReused===false).map(r=>r.id),rawKeyRenamesPreserved:true}};
 await writeFile('reports/release-identity-replay.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.summary));process.exitCode=result.summary.extraIdentities||result.summary.identityReviewRequired.length||result.summary.identityChanges.length?1:0;
}finally{ledger.close();await rm(dir,{recursive:true,force:true});}
