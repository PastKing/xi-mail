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

describe('Mailbox growth analysis',()=>{
  it('counts new mailbox records for the same 15-day window as user growth',async()=>{
    db=new DatabaseSync(':memory:');
    db.exec(`CREATE TABLE account(account_id INTEGER PRIMARY KEY,create_time TEXT);
      CREATE TABLE user(user_id INTEGER PRIMARY KEY,create_time TEXT);
      CREATE TABLE email(email_id INTEGER PRIMARY KEY,user_id INTEGER,account_id INTEGER,type INTEGER,is_del INTEGER,status INTEGER,create_time TEXT);
      INSERT INTO account(create_time) VALUES(datetime('now','-1 days')),(datetime('now','-4 days')),(datetime('now','-25 days'));`);
    const rows=await analysisDao.accountDayCount({env:{db:d1(db)}},8);
    expect(rows.reduce((sum,row)=>sum+row.total,0)).toBe(2);
    expect(rows).toHaveLength(2);
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_account_create_time'").get()?.name)
      .toBe('idx_account_create_time');
  });
});
