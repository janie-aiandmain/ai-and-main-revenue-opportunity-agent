// Node SQLite reference adapter; production/staging uses Durable Object SQL.
import { DatabaseSync } from 'node:sqlite';
import { CorrectionLedger } from '../src/correction-ledger.js';
export class CorrectionSandbox extends CorrectionLedger {
  constructor(path){
    const raw=new DatabaseSync(path);
    raw.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
    const database={exec:q=>raw.exec(q),prepare:q=>raw.prepare(q),close:()=>raw.close(),transaction:fn=>{raw.exec('BEGIN IMMEDIATE');try{const value=fn();raw.exec('COMMIT');return value;}catch(e){raw.exec('ROLLBACK');throw e;}}};
    super(database);
  }
}
