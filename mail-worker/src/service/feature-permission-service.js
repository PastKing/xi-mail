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
		const statements = [];
		for (const name of [...new Set(FEATURE_PERMISSIONS.map((row) => row[0]))]) {
			statements.push(
				db
					.prepare('INSERT INTO perm(name,pid,type,sort) SELECT ?,0,1,7 WHERE NOT EXISTS(SELECT 1 FROM perm WHERE name=? AND pid=0)')
					.bind(name, name),
			);
		}
		FEATURE_PERMISSIONS.forEach(([group, name, key], index) =>
			statements.push(
				db
					.prepare(
						`INSERT INTO perm(name,perm_key,pid,type,sort)
      SELECT ?,?,(SELECT perm_id FROM perm WHERE name=? AND pid=0 ORDER BY perm_id LIMIT 1),2,?
      WHERE NOT EXISTS(SELECT 1 FROM perm WHERE perm_key=?)`,
					)
					.bind(name, key, group, index, key),
			),
		);
		const pending = db.batch(statements).catch((error) => {
			ready.delete(db);
			throw error;
		});
		ready.set(db, pending);
	}
	await ready.get(db);
}
