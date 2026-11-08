const ready = new WeakMap();
const statements = [
  'CREATE INDEX IF NOT EXISTS idx_email_list_user ON email(user_id,type,is_del,email_id)',
  'CREATE INDEX IF NOT EXISTS idx_email_list_account ON email(user_id,account_id,type,is_del,email_id)',
  'CREATE INDEX IF NOT EXISTS idx_email_global_list ON email(type,is_del,email_id)',
  'CREATE INDEX IF NOT EXISTS idx_email_admin_type ON email(type,email_id,status)',
  'CREATE INDEX IF NOT EXISTS idx_email_admin_deleted ON email(is_del,email_id,status)',
  'CREATE INDEX IF NOT EXISTS idx_email_type_time ON email(type,create_time)',
  'CREATE INDEX IF NOT EXISTS idx_email_saving_only ON email(email_id) WHERE status=6',
];
export async function ensureMailIndexes(c) {
  const db = c.env.db;
  if (!ready.has(db)) ready.set(db, db.batch(statements.map(text => db.prepare(text))).catch(error => { ready.delete(db); throw error; }));
  await ready.get(db);
}
const analysisReady = new WeakMap();
export async function ensureAnalysisIndexes(c) {
  await ensureMailIndexes(c);
  const db = c.env.db;
  if (!analysisReady.has(db)) analysisReady.set(db, db.prepare('CREATE INDEX IF NOT EXISTS idx_user_create_time ON user(create_time)').run()
    .catch(error => { analysisReady.delete(db); throw error; }));
  await analysisReady.get(db);
}
