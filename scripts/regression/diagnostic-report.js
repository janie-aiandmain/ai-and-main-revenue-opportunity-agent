// Report the limited dimensions explicitly; keep the full diagnostic's exit intact.
import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
const result=spawnSync(process.execPath,['scripts/regression/offline.js'],{stdio:'inherit'});
const r=JSON.parse(await readFile('reports/offline-baseline.json','utf8'));
const dimensionsPass=r.decisionCorrect===r.attempted&&r.rows.every(x=>x.classificationCorrect&&x.humanReviewCorrect);
const expectedLimitedExit=result.status===1&&r.contractLimitedCases.length>0;
console.log(JSON.stringify({kind:'SECONDARY_DIAGNOSTIC_DIMENSIONS_ONLY',classificationAndReviewPassed:dimensionsPass,fullDiagnosticExit:result.status,independentFindingCoverage:'UNSUPPORTED',contractLimitedCases:r.contractLimitedCases,primaryGate:false,releaseEligible:false}));
process.exitCode=dimensionsPass&&(expectedLimitedExit||result.status===0)?0:1;
