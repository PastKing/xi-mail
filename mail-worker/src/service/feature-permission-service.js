import KvConst from '../const/kv-const';

const ready = new WeakMap();
export const FEATURE_PERMISSIONS = [
	['邮箱分享', '分享收件箱', 'account:share'],
	['邮箱转移', '转移记录查看', 'transfer:query'],
	['邮箱转移', '发起邮箱转移', 'transfer:send'],
	['邮箱转移', '接收邮箱转移', 'transfer:receive'],
	['个人设置', '关联登录账号', 'oauth:manage'],
];
export async function ensureFeaturePermissions(c) {
	const db = c.env.db;
	if (!ready.has(db)) {
		const pending = (async () => {
			if (c.env.kv?.get && await c.env.kv.get(KvConst.FEATURE_PERMISSIONS_READY) === '1') return;
			const groups = [...new Set(FEATURE_PERMISSIONS.map(([group]) => group))];
			const keys = FEATURE_PERMISSIONS.map(([, , key]) => key);
			const placeholders = values => values.map(() => '?').join(',');
			const existing = (await db.prepare(`SELECT name,perm_key,pid FROM perm
				WHERE (pid=0 AND name IN (${placeholders(groups)})) OR perm_key IN (${placeholders(keys)})`)
				.bind(...groups, ...keys).all()).results;
			const existingGroups = new Set(existing.filter(row => row.pid === 0).map(row => row.name));
			const existingKeys = new Set(existing.map(row => row.perm_key).filter(Boolean));
			const missingGroups = groups.filter(group => !existingGroups.has(group));
			const missingKeys = new Set(keys.filter(key => !existingKeys.has(key)));
			const statements = [];
			for (const name of missingGroups) {
				statements.push(db.prepare('INSERT INTO perm(name,pid,type,sort) SELECT ?,0,1,7 WHERE NOT EXISTS(SELECT 1 FROM perm WHERE name=? AND pid=0)').bind(name, name));
			}
			FEATURE_PERMISSIONS.forEach(([group, name, key], index) => {
				if (!missingKeys.has(key)) return;
				statements.push(db.prepare(`INSERT INTO perm(name,perm_key,pid,type,sort)
      SELECT ?,?,(SELECT perm_id FROM perm WHERE name=? AND pid=0 ORDER BY perm_id LIMIT 1),2,?
      WHERE NOT EXISTS(SELECT 1 FROM perm WHERE perm_key=?)`).bind(name, key, group, index, key));
			});
			if (statements.length) await db.batch(statements);
			try { await c.env.kv?.put?.(KvConst.FEATURE_PERMISSIONS_READY, '1'); } catch {}
		})().catch((error) => {
			ready.delete(db);
			throw error;
		});
		ready.set(db, pending);
	}
	await ready.get(db);
}
