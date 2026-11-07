import { sqliteTable, integer, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const star = sqliteTable('star', {
	starId: integer('star_id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id').notNull(),
	emailId: integer('email_id').notNull(),
	createTime: text('create_time')
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
}, table => [uniqueIndex('idx_star_user_email_unique').on(table.userId, table.emailId)]);
