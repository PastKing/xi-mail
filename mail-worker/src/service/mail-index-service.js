import KvConst from '../const/kv-const';
const ready = new WeakMap();
const statements = [
  'CREATE INDEX IF NOT EXISTS idx_email_list_user ON email(user_id,type,is_del,email_id)',
  'CREATE INDEX IF NOT EXISTS idx_email_list_account ON email(user_id,account_id,type,is_del,email_id)',
  'CREATE INDEX IF NOT EXISTS idx_email_global_list ON email(type,is_del,email_id)',
  'CREATE INDEX IF NOT EXISTS idx_email_admin_type ON email(type,email_id,status)',
  'CREATE INDEX IF NOT EXISTS idx_email_admin_deleted ON email(is_del,email_id,status)',
  'CREATE INDEX IF NOT EXISTS idx_email_admin_recipient ON email(to_email,is_del,email_id DESC)',
  'CREATE INDEX IF NOT EXISTS idx_email_type_time ON email(type,create_time)',
  'CREATE INDEX IF NOT EXISTS idx_email_saving_only ON email(email_id) WHERE status=6',
];
export async function ensureMailIndexes(c) {
  const db = c.env.db;
  if (!ready.has(db)) ready.set(db, (async () => {
    if (c.env.kv?.get && await c.env.kv.get(KvConst.MAIL_INDEXES_READY) === '1') return;
    const existing = new Set((await db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all()).results.map(row => row.name));
    const missing = statements.filter(text => {
      const match = text.match(/CREATE INDEX IF NOT EXISTS (\w+)/);
      return match && !existing.has(match[1]);
    });
    if (missing.length) await db.batch(missing.map(text => db.prepare(text)));
    try { await c.env.kv?.put?.(KvConst.MAIL_INDEXES_READY, '1'); } catch {}
  })().catch(error => { ready.delete(db); throw error; }));
  await ready.get(db);
}
const analysisReady = new WeakMap();
export async function ensureAnalysisIndexes(c) {
  await ensureMailIndexes(c);
  const db = c.env.db;
  if (!analysisReady.has(db)) analysisReady.set(db, (async () => {
    if (c.env.kv?.get && await c.env.kv.get(KvConst.ANALYSIS_INDEXES_READY) === '1') return;
    const exists = await db.prepare("SELECT 1 AS ready FROM sqlite_master WHERE type='index' AND name='idx_user_create_time'").first();
    if (!exists) await db.batch([db.prepare('CREATE INDEX IF NOT EXISTS idx_user_create_time ON user(create_time)')]);
    try { await c.env.kv?.put?.(KvConst.ANALYSIS_INDEXES_READY, '1'); } catch {}
  })().catch(error => { analysisReady.delete(db); throw error; }));
  await analysisReady.get(db);
}
