import { relations, sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

export const authRoles = pgTable("auth_roles", {
	slug: text("slug").primaryKey(),
	label: text("label").notNull(),
	description: text("description"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const user = pgTable(
	"user",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		email: text("email").notNull().unique(),
		emailVerified: boolean("email_verified").default(false).notNull(),
		image: text("image"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		role: text("role")
			.default("user")
			.notNull()
			.references(() => authRoles.slug),
		currency: text("currency").default("PKR").notNull(),
		accountStatus: text("account_status").default("active").notNull(),
		moderationReason: text("moderation_reason"),
		moderatedAt: timestamp("moderated_at"),
		moderatedBy: text("moderated_by"),
		// When set, the restriction/ban auto-expires and the account returns to
		// active. Null means the moderation is indefinite.
		moderationExpiresAt: timestamp("moderation_expires_at"),
	},
	(table) => [index("user_account_status_idx").on(table.accountStatus)],
);

export const userSecurityProfile = pgTable(
	"user_security_profile",
	{
		userId: text("user_id")
			.primaryKey()
			.references(() => user.id, { onDelete: "cascade" }),
		recoveryEmail: text("recovery_email").notNull(),
		recoveryEmailVerified: boolean("recovery_email_verified")
			.default(false)
			.notNull(),
		questionOneKey: text("question_one_key").notNull(),
		answerOneHash: text("answer_one_hash").notNull(),
		failedRecoveryAttempts: integer("failed_recovery_attempts")
			.default(0)
			.notNull(),
		recoveryLockedUntil: timestamp("recovery_locked_until", {
			withTimezone: true,
		}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("user_security_profile_recovery_email_lower_unique_idx").on(
			sql`lower(${table.recoveryEmail})`,
		),
	],
);

export const session = pgTable(
	"session",
	{
		id: text("id").primaryKey(),
		expiresAt: timestamp("expires_at").notNull(),
		token: text("token").notNull().unique(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
	"account",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: timestamp("access_token_expires_at"),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
		scope: text("scope"),
		password: text("password"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
	"verification",
	{
		id: text("id").primaryKey(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ one, many }) => ({
	sessions: many(session),
	accounts: many(account),
	securityProfile: one(userSecurityProfile, {
		fields: [user.id],
		references: [userSecurityProfile.userId],
	}),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}));

export const userSecurityProfileRelations = relations(
	userSecurityProfile,
	({ one }) => ({
		user: one(user, {
			fields: [userSecurityProfile.userId],
			references: [user.id],
		}),
	}),
);
