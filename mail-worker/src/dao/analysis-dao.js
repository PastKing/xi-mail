import { emailConst } from '../const/entity-const';

import { ensureAnalysisIndexes } from '../service/mail-index-service';

async function dayCounts(c, table, type, offset) {
    await ensureAnalysisIndexes(c);
    const hours = Number(offset);
    if (!Number.isFinite(hours) || Math.abs(hours) > 14) throw new Error('Invalid time zone offset');
    const forward = `${hours >= 0 ? '+' : ''}${hours} hours`;
    const backward = `${hours <= 0 ? '+' : ''}${-hours} hours`;
    const values = [forward, forward, backward, forward, backward];
    if (type !== null) values.push(type);
    const { results } = await c.env.db.prepare(`SELECT DATE(create_time, ?) AS date, COUNT(*) AS total FROM ${table}
        WHERE create_time >= datetime('now', ?, 'start of day', '-15 days', ?)
        AND create_time < datetime('now', ?, 'start of day', ?) ${type === null ? '' : 'AND type = ?'}
        GROUP BY date ORDER BY date ASC`).bind(...values).all();
    return results;
}

const analysisDao = {
	async numberCount(c) {
		const { results } = await c.env.db.prepare(`
            SELECT
				COALESCE(e.receiveTotal, 0) AS receiveTotal,
				COALESCE(e.sendTotal, 0) AS sendTotal,
				COALESCE(e.delReceiveTotal, 0) AS delReceiveTotal,
				COALESCE(e.delSendTotal, 0) AS delSendTotal,
				COALESCE(e.normalReceiveTotal, 0) AS normalReceiveTotal,
				COALESCE(e.normalSendTotal, 0) AS normalSendTotal,
				COALESCE(u.userTotal, 0) AS userTotal,
				COALESCE(u.normalUserTotal, 0) AS normalUserTotal,
				COALESCE(u.delUserTotal, 0) AS delUserTotal,
				COALESCE(a.accountTotal, 0) AS accountTotal,
				COALESCE(a.normalAccountTotal, 0) AS normalAccountTotal,
				COALESCE(a.delAccountTotal, 0) AS delAccountTotal
            FROM
                (
                    SELECT
                        SUM(CASE WHEN type = 0 THEN 1 ELSE 0 END) AS receiveTotal,
                        SUM(CASE WHEN type = 1 THEN 1 ELSE 0 END) AS sendTotal,
                        SUM(CASE WHEN type = 0 AND is_del = 1 THEN 1 ELSE 0 END) AS delReceiveTotal,
                        SUM(CASE WHEN type = 1 AND is_del = 1 THEN 1 ELSE 0 END) AS delSendTotal,
                        SUM(CASE WHEN type = 0 AND is_del = 0 THEN 1 ELSE 0 END) AS normalReceiveTotal,
                        SUM(CASE WHEN type = 1 AND is_del = 0 THEN 1 ELSE 0 END) AS normalSendTotal
                    FROM
                        email where status != ${emailConst.status.SAVING}
                ) e
            CROSS JOIN (
                SELECT
                    COUNT(*) AS userTotal,
                    SUM(CASE WHEN is_del = 1 THEN 1 ELSE 0 END) AS delUserTotal,
                    SUM(CASE WHEN is_del = 0 THEN 1 ELSE 0 END) AS normalUserTotal
                FROM
                    user
            ) u
            CROSS JOIN (
                SELECT
                    COUNT(*) AS accountTotal,
                    SUM(CASE WHEN is_del = 1 THEN 1 ELSE 0 END) AS delAccountTotal,
                    SUM(CASE WHEN is_del = 0 THEN 1 ELSE 0 END) AS normalAccountTotal
                FROM
                    account
            ) a
        `).all();
		return results[0];
	},

    async userDayCount(c, diffHours) { return dayCounts(c, 'user', null, diffHours); },
    async mailboxSuffixRanking(c) {
        const { results } = await c.env.db.prepare(`
            SELECT lower(substr(a.email, instr(a.email, '@') + 1)) AS suffix, COUNT(*) AS total
            FROM account a
            JOIN user u ON u.user_id = a.user_id AND u.is_del = 0
            WHERE a.is_del = 0 AND a.email COLLATE NOCASE <> u.email
                AND instr(a.email, '@') > 1 AND instr(a.email, '@') < length(a.email)
            GROUP BY suffix
            ORDER BY total DESC, suffix ASC
            LIMIT 6
        `).all();
        return results;
    },
    async receiveDayCount(c, diffHours) { return dayCounts(c, 'email', 0, diffHours); },
    async sendDayCount(c, diffHours) { return dayCounts(c, 'email', 1, diffHours); },
};

export default analysisDao;
