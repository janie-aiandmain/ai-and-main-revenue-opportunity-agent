import { readFileSync } from 'node:fs';
import { CorrectionSandbox } from './correction-store.js';
// A sandbox child process cannot use the application's network executor.
globalThis.fetch=()=>{throw Error('Networking forbidden in correction sandbox');};
const [path,mode,payloadFile]=process.argv.slice(2),payload=JSON.parse(readFileSync(payloadFile,'utf8'));
const db=new CorrectionSandbox(path);
try {
  const result=mode==='task'?db.executeSandbox(payload.approval,payload.now,payload.history):mode==='outcome'?db.recordSandboxOutcome(payload):null;
  if(!result) throw Error('Unknown sandbox effect');
  process.stdout.write(JSON.stringify(result));
} finally {db.close();}
