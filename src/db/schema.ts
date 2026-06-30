import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const todos = pgTable("todos", {
	id: serial().primaryKey(),
	title: text().notNull(),
	createdAt: timestamp("created_at").defaultNow(),
});

export const categories = pgTable(
	"categories",
	{
		id: serial().primaryKey(),
		name: text().notNull(),
		slug: text().notNull(),
		kind: text().notNull(),
		userId: text("user_id").references(() => user.id, {
			onDelete: "cascade",
		}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		userSlugUniqueIdx: uniqueIndex("categories_user_slug_unique_idx").on(
			table.userId,
			table.slug,
		),
		userIdIdx: index("categories_user_id_idx").on(table.userId),
		kindIdx: index("categories_kind_idx").on(table.kind),
		createdAtIdx: index("categories_created_at_idx").on(table.createdAt),
	}),
);

export const paymentAccounts = pgTable(
	"payment_accounts",
	{
		id: serial().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),
		name: text().notNull(),
		institutionSlug: text("institution_slug"),
		accountType: text("account_type").notNull(),
		lastFour: text("last_four"),
		note: text(),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		userIdIdx: index("payment_accounts_user_id_idx").on(table.userId),
		accountTypeIdx: index("payment_accounts_account_type_idx").on(
			table.accountType,
		),
	}),
);

export const transactions = pgTable(
	"transactions",
	{
		id: serial().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),
		title: text().notNull(),
		amount: text().notNull(),
		sourceAmount: text("source_amount"),
		sourceCurrency: text("source_currency").notNull().default("USD"),
		exchangeRate: text("exchange_rate").notNull().default("1"),
		type: text().notNull(),
		categoryId: integer("category_id"),
		paymentAccountId: integer("payment_account_id").references(
			() => paymentAccounts.id,
			{
				onDelete: "set null",
			},
		),
		source: text(),
		transferGroupId: text("transfer_group_id"),
		note: text(),
		status: text().notNull().default("confirmed"),
		happenedAt: timestamp("happened_at").defaultNow().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		happenedAtIdx: index("transactions_happened_at_idx").on(table.happenedAt),
		transferGroupIdIdx: index("transactions_transfer_group_id_idx").on(
			table.transferGroupId,
		),
		createdAtIdx: index("transactions_created_at_idx").on(table.createdAt),
		userIdIdx: index("transactions_user_id_idx").on(table.userId),
		sourceCurrencyIdx: index("transactions_source_currency_idx").on(
			table.sourceCurrency,
		),
		categoryIdIdx: index("transactions_category_id_idx").on(table.categoryId),
		paymentAccountIdIdx: index("transactions_payment_account_id_idx").on(
			table.paymentAccountId,
		),
		typeIdx: index("transactions_type_idx").on(table.type),
		statusIdx: index("transactions_status_idx").on(table.status),
		categoryHappenedAtIdx: index("transactions_category_happened_at_idx").on(
			table.categoryId,
			table.happenedAt,
		),
		typeHappenedAtIdx: index("transactions_type_happened_at_idx").on(
			table.type,
			table.happenedAt,
		),
	}),
);

export const goals = pgTable(
	"goals",
	{
		id: serial().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),
		title: text().notNull(),
		targetAmount: text("target_amount").notNull(),
		currentAmount: text("current_amount").notNull().default("0"),
		savingsAmount: text("savings_amount").notNull().default("0"),
		targetDate: timestamp("target_date"),
		status: text().notNull().default("active"),
		note: text(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		userIdIdx: index("goals_user_id_idx").on(table.userId),
		statusIdx: index("goals_status_idx").on(table.status),
		targetDateIdx: index("goals_target_date_idx").on(table.targetDate),
		createdAtIdx: index("goals_created_at_idx").on(table.createdAt),
	}),
);

export const savings = pgTable(
	"savings",
	{
		id: serial().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),
		goalId: integer("goal_id").references(() => goals.id, {
			onDelete: "set null",
		}),
		paymentAccountId: integer("payment_account_id").references(
			() => paymentAccounts.id,
			{
				onDelete: "set null",
			},
		),
		title: text().notNull(),
		amount: text().notNull(),
		entryType: text("entry_type").notNull().default("deposit"),
		note: text(),
		savedAt: timestamp("saved_at").defaultNow().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		userIdIdx: index("savings_user_id_idx").on(table.userId),
		goalIdIdx: index("savings_goal_id_idx").on(table.goalId),
		paymentAccountIdIdx: index("savings_payment_account_id_idx").on(
			table.paymentAccountId,
		),
		savedAtIdx: index("savings_saved_at_idx").on(table.savedAt),
		createdAtIdx: index("savings_created_at_idx").on(table.createdAt),
	}),
);

export const wishlistItems = pgTable(
	"wishlist_items",
	{
		id: serial().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),
		title: text().notNull(),
		targetAmount: text("target_amount").notNull(),
		currentAmount: text("current_amount").notNull().default("0"),
		priority: text().notNull().default("medium"),
		status: text().notNull().default("active"),
		note: text(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		userIdIdx: index("wishlist_items_user_id_idx").on(table.userId),
		statusIdx: index("wishlist_items_status_idx").on(table.status),
		priorityIdx: index("wishlist_items_priority_idx").on(table.priority),
		createdAtIdx: index("wishlist_items_created_at_idx").on(table.createdAt),
	}),
);

export const aiProviderSettings = pgTable(
	"ai_provider_settings",
	{
		id: serial().primaryKey(),
		userId: text("user_id").references(() => user.id, {
			onDelete: "cascade",
		}),
		provider: text().notNull().default("ollama"),
		useGlobalProvider: boolean("use_global_provider").notNull().default(true),
		isEnabled: boolean("is_enabled").notNull().default(false),
		baseUrlEncrypted: text("base_url_encrypted"),
		modelEncrypted: text("model_encrypted"),
		apiKeyEncrypted: text("api_key_encrypted"),
		updatedBy: text("updated_by").references(() => user.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		userUniqueIdx: uniqueIndex("ai_provider_settings_user_id_unique_idx")
			.on(table.userId)
			.where(sql`${table.userId} is not null`),
		globalUniqueIdx: uniqueIndex("ai_provider_settings_global_unique_idx")
			.on(sql`(1)`)
			.where(sql`${table.userId} is null`),
		userIdIdx: index("ai_provider_settings_user_id_idx").on(table.userId),
	}),
);

export const aiConversations = pgTable(
	"ai_conversations",
	{
		id: serial().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),
		title: text().notNull().default("New chat"),
		isClosed: boolean("is_closed").notNull().default(false),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		userIdIdx: index("ai_conversations_user_id_idx").on(table.userId),
		updatedAtIdx: index("ai_conversations_updated_at_idx").on(table.updatedAt),
	}),
);

export const aiMessages = pgTable(
	"ai_messages",
	{
		id: serial().primaryKey(),
		conversationId: integer("conversation_id")
			.notNull()
			.references(() => aiConversations.id, {
				onDelete: "cascade",
			}),
		role: text().notNull(),
		content: text().notNull(),
		metadata: text(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		conversationIdIdx: index("ai_messages_conversation_id_idx").on(
			table.conversationId,
		),
		createdAtIdx: index("ai_messages_created_at_idx").on(table.createdAt),
	}),
);

export const recurringRules = pgTable(
	"recurring_rules",
	{
		id: serial().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),
		// Transaction template (created in the user's ledger currency).
		title: text().notNull(),
		amount: text().notNull(),
		currency: text().notNull().default("USD"),
		type: text().notNull(),
		categoryId: integer("category_id"),
		paymentAccountId: integer("payment_account_id").references(
			() => paymentAccounts.id,
			{
				onDelete: "set null",
			},
		),
		source: text(),
		note: text(),
		// Originating transaction: when the user deletes it, the rule is purged.
		sourceTransactionId: integer("source_transaction_id").references(
			() => transactions.id,
			{
				onDelete: "cascade",
			},
		),
		// Schedule.
		cadence: text().notNull().default("monthly"),
		nextRunAt: timestamp("next_run_at").notNull(),
		lastRunAt: timestamp("last_run_at"),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		userIdIdx: index("recurring_rules_user_id_idx").on(table.userId),
		nextRunAtIdx: index("recurring_rules_next_run_at_idx").on(table.nextRunAt),
		isActiveIdx: index("recurring_rules_is_active_idx").on(table.isActive),
		paymentAccountIdIdx: index("recurring_rules_payment_account_id_idx").on(
			table.paymentAccountId,
		),
		sourceTransactionIdIdx: index(
			"recurring_rules_source_transaction_id_idx",
		).on(table.sourceTransactionId),
	}),
);

export const bans = pgTable(
	"bans",
	{
		id: serial().primaryKey(),
		// What this ban targets: an email address or an IP address.
		targetType: text("target_type").notNull(),
		email: text("email"),
		ipAddress: text("ip_address"),
		reason: text().notNull(),
		createdBy: text("created_by").references(() => user.id, {
			onDelete: "set null",
		}),
		// Null = permanent ban; otherwise the ban is ignored after this time.
		expiresAt: timestamp("expires_at"),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		emailIdx: index("bans_email_idx").on(table.email),
		ipAddressIdx: index("bans_ip_address_idx").on(table.ipAddress),
		isActiveIdx: index("bans_is_active_idx").on(table.isActive),
	}),
);

export const passwordResetTokens = pgTable(
	"password_reset_tokens",
	{
		id: serial().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		// Only the hash of the token is stored — the raw token lives in the link.
		tokenHash: text("token_hash").notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		usedAt: timestamp("used_at"),
		createdBy: text("created_by").references(() => user.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		userIdIdx: index("password_reset_tokens_user_id_idx").on(table.userId),
		tokenHashIdx: index("password_reset_tokens_token_hash_idx").on(
			table.tokenHash,
		),
		expiresAtIdx: index("password_reset_tokens_expires_at_idx").on(
			table.expiresAt,
		),
	}),
);

export const rateLimitBuckets = pgTable(
	"rate_limit_buckets",
	{
		bucketKey: text("bucket_key").primaryKey(),
		hitCount: integer("hit_count").notNull().default(1),
		resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
	},
	(table) => ({
		resetAtIdx: index("rate_limit_buckets_reset_at_idx").on(table.resetAt),
	}),
);

export const tickets = pgTable(
	"tickets",
	{
		id: serial().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),
		type: text().notNull(),
		subject: text().notNull(),
		body: text().notNull(),
		status: text().notNull().default("open"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		userIdIdx: index("tickets_user_id_idx").on(table.userId),
		statusIdx: index("tickets_status_idx").on(table.status),
	}),
);

export const ticketMessages = pgTable(
	"ticket_messages",
	{
		id: serial().primaryKey(),
		ticketId: integer("ticket_id")
			.notNull()
			.references(() => tickets.id, {
				onDelete: "cascade",
			}),
		authorUserId: text("author_user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),
		authorRole: text("author_role").notNull(),
		body: text().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		ticketIdIdx: index("ticket_messages_ticket_id_idx").on(table.ticketId),
		createdAtIdx: index("ticket_messages_created_at_idx").on(table.createdAt),
	}),
);
