export function durableDatabase(storage){
  return {
    exec(query){for(const statement of query.split(';').map(s=>s.trim()).filter(Boolean)) storage.sql.exec(statement);},
    prepare(query){return {get(...params){return storage.sql.exec(query,...params).toArray()[0];},all(...params){return storage.sql.exec(query,...params).toArray();},run(...params){storage.sql.exec(query,...params).toArray();}};},
    transaction:fn=>storage.transactionSync(fn),close(){},
  };
}
