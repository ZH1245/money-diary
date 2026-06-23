import { sql } from 'drizzle-orm'
import { boolean, index, integer, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
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

export const paymentAccounts = pgTable('payment_accounts', {
  id: serial().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, {
      onDelete: 'cascade',
    }),
  name: text().notNull(),
  institutionSlug: text('institution_slug'),
  accountType: text('account_type').notNull(),
  lastFour: text('last_four'),
  note: text(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('payment_accounts_user_id_idx').on(table.userId),
  accountTypeIdx: index('payment_accounts_account_type_idx').on(table.accountType),
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
  categoryId: integer('category_id'),
  paymentAccountId: integer('payment_account_id').references(() => paymentAccounts.id, {
    onDelete: 'set null',
  }),
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
  paymentAccountIdIdx: index('transactions_payment_account_id_idx').on(table.paymentAccountId),
  typeIdx: index('transactions_type_idx').on(table.type),
  categoryHappenedAtIdx: index('transactions_category_happened_at_idx').on(
    table.categoryId,
    table.happenedAt,
  ),
  typeHappenedAtIdx: index('transactions_type_happened_at_idx').on(table.type, table.happenedAt),
}))

export const goals = pgTable('goals', {
  id: serial().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, {
      onDelete: 'cascade',
    }),
  title: text().notNull(),
  targetAmount: text('target_amount').notNull(),
  currentAmount: text('current_amount').notNull().default('0'),
  savingsAmount: text('savings_amount').notNull().default('0'),
  targetDate: timestamp('target_date'),
  status: text().notNull().default('active'),
  note: text(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('goals_user_id_idx').on(table.userId),
  statusIdx: index('goals_status_idx').on(table.status),
  targetDateIdx: index('goals_target_date_idx').on(table.targetDate),
  createdAtIdx: index('goals_created_at_idx').on(table.createdAt),
}))

export const savings = pgTable('savings', {
  id: serial().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, {
      onDelete: 'cascade',
    }),
  goalId: integer('goal_id').references(() => goals.id, {
    onDelete: 'set null',
  }),
  paymentAccountId: integer('payment_account_id').references(() => paymentAccounts.id, {
    onDelete: 'set null',
  }),
  title: text().notNull(),
  amount: text().notNull(),
  entryType: text('entry_type').notNull().default('deposit'),
  note: text(),
  savedAt: timestamp('saved_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('savings_user_id_idx').on(table.userId),
  goalIdIdx: index('savings_goal_id_idx').on(table.goalId),
  paymentAccountIdIdx: index('savings_payment_account_id_idx').on(table.paymentAccountId),
  savedAtIdx: index('savings_saved_at_idx').on(table.savedAt),
  createdAtIdx: index('savings_created_at_idx').on(table.createdAt),
}))

export const wishlistItems = pgTable('wishlist_items', {
  id: serial().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, {
      onDelete: 'cascade',
    }),
  title: text().notNull(),
  targetAmount: text('target_amount').notNull(),
  currentAmount: text('current_amount').notNull().default('0'),
  priority: text().notNull().default('medium'),
  status: text().notNull().default('active'),
  note: text(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('wishlist_items_user_id_idx').on(table.userId),
  statusIdx: index('wishlist_items_status_idx').on(table.status),
  priorityIdx: index('wishlist_items_priority_idx').on(table.priority),
  createdAtIdx: index('wishlist_items_created_at_idx').on(table.createdAt),
}))

export const aiProviderSettings = pgTable('ai_provider_settings', {
  id: serial().primaryKey(),
  userId: text('user_id').references(() => user.id, {
    onDelete: 'cascade',
  }),
  provider: text().notNull().default('ollama'),
  useGlobalProvider: boolean('use_global_provider').notNull().default(true),
  isEnabled: boolean('is_enabled').notNull().default(false),
  baseUrlEncrypted: text('base_url_encrypted'),
  modelEncrypted: text('model_encrypted'),
  apiKeyEncrypted: text('api_key_encrypted'),
  updatedBy: text('updated_by').references(() => user.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userUniqueIdx: uniqueIndex('ai_provider_settings_user_id_unique_idx')
    .on(table.userId)
    .where(sql`${table.userId} is not null`),
  globalUniqueIdx: uniqueIndex('ai_provider_settings_global_unique_idx')
    .on(sql`(1)`)
    .where(sql`${table.userId} is null`),
  userIdIdx: index('ai_provider_settings_user_id_idx').on(table.userId),
}))

export const aiConversations = pgTable('ai_conversations', {
  id: serial().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, {
      onDelete: 'cascade',
    }),
  title: text().notNull().default('New chat'),
  isClosed: boolean('is_closed').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('ai_conversations_user_id_idx').on(table.userId),
  updatedAtIdx: index('ai_conversations_updated_at_idx').on(table.updatedAt),
}))

export const aiMessages = pgTable('ai_messages', {
  id: serial().primaryKey(),
  conversationId: integer('conversation_id')
    .notNull()
    .references(() => aiConversations.id, {
      onDelete: 'cascade',
    }),
  role: text().notNull(),
  content: text().notNull(),
  metadata: text(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  conversationIdIdx: index('ai_messages_conversation_id_idx').on(table.conversationId),
  createdAtIdx: index('ai_messages_created_at_idx').on(table.createdAt),
}))
