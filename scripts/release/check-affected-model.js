import {readFile,writeFile} from 'node:fs/promises';
import {reasonCorrected,materializeCorrected} from '../../src/release/reasoning.js';
import {prepareHistory} from '../../src/findings.js';
import {inspectFinding} from '../../src/staging/review-policy.js';
import {gradeFindings,hash} from '../regression/findings-core.js';
if(process.argv.slice(2).join(' ')!=='--live --non-production')throw Error('explicit_live_nonproduction_opt_in_required');
const corpus=JSON.parse(await readFile('fixtures/enterprise-v2.json','utf8')),c=corpus.cases.find(x=>x.id==='ST04'),time='2026-11-07T12:00:00Z',saved=globalThis.fetch;let telemetry={};
globalThis.fetch=async(url,options)=>{if(url!=='https://api.openai.com/v1/responses')throw Error('unexpected_destination');const r=await saved(url,options);if(r.ok){const b=await r.clone().json();telemetry={returnedModel:b.model,usage:b.usage,rawModelOutput:(b.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]).find(x=>x.type==='output_text')?.text};}return r;};
try{
const actual=await reasonCorrected({EVAL_OPENAI_API_KEY:process.env.EVAL_OPENAI_API_KEY},c.context,'synthetic:'+c.id,time),history=await prepareHistory(c.context),grade=await gradeFindings(c,actual,{materializer:(r,h,k)=>materializeCorrected(r,h,k,time)}),quality=actual.findings.flatMap(f=>inspectFinding(f,history,actual.findings,time).qualityFailures);const row={id:c.id,...telemetry,actual,outputHash:hash(actual),grade,quality,passed:grade.decisionPassed&&!quality.length,humanReview:'PENDING'};
const out='reports/release-affected-'+new Date().toISOString().replaceAll(/[:.]/g,'-')+'.json';await writeFile(out,JSON.stringify({kind:'FRESH_AFFECTED_CASE_AFTER_FALSE_POSITIVE_CORRECTION',sourceCommit:process.env.RELEASE_SOURCE_SHA,time,modelCalls:1,hubspotCalls:0,rows:[row]},null,2)+'\n');console.log(JSON.stringify({out,passed:row.passed,modelCalls:1}));process.exitCode=row.passed?0:1;
}finally{globalThis.fetch=saved;}
