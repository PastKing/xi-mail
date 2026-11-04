import { sqliteTable, integer, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const oauthBinding = sqliteTable('oauth_binding', {
  bindingId: integer('binding_id').primaryKey({ autoIncrement: true }),
  provider: text('provider').notNull(),
  providerUserId: text('provider_user_id').notNull(),
  userId: integer('user_id').notNull(),
  displayName: text('display_name').notNull().default(''),
  createTime: text('create_time').default(sql`CURRENT_TIMESTAMP`).notNull(),
}, table => [
  uniqueIndex('oauth_binding_identity').on(table.provider, table.providerUserId),
  uniqueIndex('oauth_binding_user_provider').on(table.userId, table.provider),
]);
