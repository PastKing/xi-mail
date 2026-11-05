const ready = new WeakMap();
const starSchemaService = {
	async ensure(c) {
		const db = c.env.db;
		if (!ready.has(db)) {
			const pending = (async () => {
				const exists = await db.prepare("SELECT 1 AS ready FROM sqlite_master WHERE type='index' AND name='idx_star_user_email_unique'").first();
				if (!exists) await db.batch([
					db.prepare('DELETE FROM star WHERE star_id NOT IN (SELECT MIN(star_id) FROM star GROUP BY user_id, email_id)'),
					db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_star_user_email_unique ON star(user_id, email_id)'),
				]);
			})().catch(error => { ready.delete(db); throw error; });
			ready.set(db, pending);
		}
		await ready.get(db);
	},
};
export default starSchemaService;
