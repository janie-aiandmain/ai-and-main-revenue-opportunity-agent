import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {runApprovalNegativeMatrix} from '../../src/staging/approval-negatives.js';
const raw=new DatabaseSync(':memory:'),db={exec:q=>raw.exec(q),prepare:q=>raw.prepare(q),transaction:fn=>{raw.exec('BEGIN IMMEDIATE');try{const r=fn();raw.exec('COMMIT');return r;}catch(e){raw.exec('ROLLBACK');throw e;}}};
try{const report=await runApprovalNegativeMatrix(db,{runId:'negative-'+randomUUID()});report.executionEnvironment='LOCAL_NODE_SQLITE_NOT_HOSTED';await writeFile('docs/review/demo-approval-negatives-2026-11-17/offline-matrix.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));for(const row of report.rows.filter(r=>!r.passed))console.log(JSON.stringify(row));if(report.summary.failed)process.exitCode=1;}finally{raw.close();}
