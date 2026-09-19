import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Placeholder schema for initial setup
// Actual tables will be added in future phases

export const placeholder = sqliteTable('placeholder', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
