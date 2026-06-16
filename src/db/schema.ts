import { index, integer, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { user } from './auth-schema'

export const todos = pgTable('todos', {
  id: serial().primaryKey(),
  title: text().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const categories = pgTable('categories', {
  id: serial().primaryKey(),
  name: text().notNull(),
  slug: text().notNull(),
  kind: text().notNull(),
  userId: text('user_id').references(() => user.id, {
    onDelete: 'cascade',
  }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userSlugUniqueIdx: uniqueIndex('categories_user_slug_unique_idx').on(table.userId, table.slug),
  userIdIdx: index('categories_user_id_idx').on(table.userId),
  kindIdx: index('categories_kind_idx').on(table.kind),
  createdAtIdx: index('categories_created_at_idx').on(table.createdAt),
}))

export const transactions = pgTable('transactions', {
  id: serial().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, {
      onDelete: 'cascade',
    }),
  title: text().notNull(),
  amount: text().notNull(),
  sourceAmount: text('source_amount'),
  sourceCurrency: text('source_currency').notNull().default('USD'),
  exchangeRate: text('exchange_rate').notNull().default('1'),
  type: text().notNull(),
  categoryId: integer('category_id').notNull(),
  source: text(),
  note: text(),
  happenedAt: timestamp('happened_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  happenedAtIdx: index('transactions_happened_at_idx').on(table.happenedAt),
  createdAtIdx: index('transactions_created_at_idx').on(table.createdAt),
  userIdIdx: index('transactions_user_id_idx').on(table.userId),
  sourceCurrencyIdx: index('transactions_source_currency_idx').on(table.sourceCurrency),
  categoryIdIdx: index('transactions_category_id_idx').on(table.categoryId),
  typeIdx: index('transactions_type_idx').on(table.type),
  categoryHappenedAtIdx: index('transactions_category_happened_at_idx').on(
    table.categoryId,
    table.happenedAt,
  ),
  typeHappenedAtIdx: index('transactions_type_happened_at_idx').on(table.type, table.happenedAt),
}))
