import {afterEach,describe,expect,it} from 'vitest';
import {DatabaseSync} from 'node:sqlite';
import analysisDao from '../../src/dao/analysis-dao';

let db;
function d1(database){
  const prepare=(text,args=[])=>({
    bind:(...values)=>prepare(text,values),
    run:async()=>database.prepare(text).run(...args),
    all:async()=>({results:database.prepare(text).all(...args)}),
  });
  return {prepare,batch:async statements=>Promise.all(statements.map(statement=>statement.run()))};
}
afterEach(()=>{db?.close();db=null;});

describe('Mailbox suffix ranking',()=>{
  it('ranks retained extra mailboxes and matches primary addresses case-insensitively',async()=>{
    db=new DatabaseSync(':memory:');
    db.exec(`CREATE TABLE account(account_id INTEGER PRIMARY KEY,user_id INTEGER,email TEXT,is_del INTEGER);
      CREATE TABLE user(user_id INTEGER PRIMARY KEY,email TEXT,is_del INTEGER);
      INSERT INTO user VALUES
        (1,'owner@primary.example',0),(2,'owner@outside.example',0),(3,'deleted@primary.example',1);
      INSERT INTO account(user_id,email,is_del) VALUES
        (1,'Owner@Primary.Example',0),(1,'extra@ALPHA.example',0),(2,'extra2@alpha.example',0),
        (1,'extra@beta.example',0),(2,'extra@primary.example',0),(1,'removed@beta.example',1),
        (3,'extra@beta.example',0),(99,'orphan@beta.example',0),(1,'no-suffix',0),
        (1,'missing@',0),(1,'@missing.example',0),(1,'extra@gamma.example',0),
        (1,'extra@delta.example',0),(1,'extra@epsilon.example',0),(1,'extra@zeta.example',0);`);
    const rows=await analysisDao.mailboxSuffixRanking({env:{db:d1(db)}});
    expect(rows).toEqual([
      {suffix:'alpha.example',total:2},
      {suffix:'beta.example',total:1},
      {suffix:'delta.example',total:1},
      {suffix:'epsilon.example',total:1},
      {suffix:'gamma.example',total:1},
      {suffix:'primary.example',total:1},
    ]);
    db.exec('UPDATE account SET is_del = 1');
    expect(await analysisDao.mailboxSuffixRanking({env:{db:d1(db)}})).toEqual([]);
  });
});
