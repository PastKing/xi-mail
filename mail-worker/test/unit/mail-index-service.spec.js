import {afterEach,describe,expect,it,vi} from 'vitest';
import {DatabaseSync} from 'node:sqlite';
import KvConst from '../../src/const/kv-const';
import {ensureMailIndexes,ensureAnalysisIndexes} from '../../src/service/mail-index-service';

let db;
function adapter(database,kv) {
  const prepare=(sql,args=[])=>({
    sql,args,
    bind:(...values)=>prepare(sql,values),
    run:async()=>({meta:database.prepare(sql).run(...args)}),
    first:async()=>database.prepare(sql).get(...args)??null,
    all:async()=>({results:database.prepare(sql).all(...args)}),
  });
  return {prepare,batch:async statements=>{
    database.exec('BEGIN');
    try {
      const results=statements.map(statement=>database.prepare(statement.sql).run(...statement.args));
      database.exec('COMMIT');
      return results;
    } catch(error) {database.exec('ROLLBACK');throw error;}
  },kv};
}
function context() {
  db=new DatabaseSync(':memory:');
  db.exec('CREATE TABLE email(email_id INTEGER PRIMARY KEY,user_id INTEGER,account_id INTEGER,to_email TEXT,type INTEGER,is_del INTEGER,status INTEGER,create_time TEXT); CREATE TABLE user(user_id INTEGER PRIMARY KEY,create_time TEXT);');
  const values=new Map();
  const kv={get:async key=>values.get(key)??null,put:async(key,value)=>values.set(key,value)};
  return {env:{db:adapter(db,kv),kv},values};
}
afterEach(()=>{vi.restoreAllMocks();db?.close();db=null;});

describe('lazy mail index initialization',()=>{
  it('creates the recipient index and uses it for admin mail and count query plans',async()=>{
    const c=context();
    const batch=vi.spyOn(c.env.db,'batch');
    await ensureMailIndexes(c);
    expect(db.prepare("SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_email_admin_recipient'").get()).toBeTruthy();
    expect(db.prepare('EXPLAIN QUERY PLAN SELECT email_id FROM email WHERE to_email=? AND is_del=0 ORDER BY email_id DESC LIMIT 20').all('recipient@example.test')[0].detail)
      .toContain('idx_email_admin_recipient');
    expect(db.prepare('EXPLAIN QUERY PLAN SELECT count(*) FROM email WHERE to_email=? AND is_del=0').all('recipient@example.test')[0].detail)
      .toContain('idx_email_admin_recipient');
    expect(batch).toHaveBeenCalledTimes(1);
  });

  it('uses the KV migration marker to skip database writes on fresh Worker isolates',async()=>{
    const first=context();
    await ensureMailIndexes(first);
    first.values.set(KvConst.ANALYSIS_INDEXES_READY,'1');
    const second={env:{...first.env,db:adapter(db,first.env.kv)}};
    const batch=vi.spyOn(second.env.db,'batch');
    await ensureMailIndexes(second);
    await ensureAnalysisIndexes(second);
    expect(batch).not.toHaveBeenCalled();
    expect(KvConst.MAIL_INDEXES_READY).toBe('schema:mail-indexes:v1');
  });
});
