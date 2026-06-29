import { and, asc, eq, lte } from "drizzle-orm";
import { db } from "#/db/index";
import { recurringRules } from "#/db/schema";
import {
	computeNextRun,
	normalizeCadence,
	type RecurringCadence,
} from "#/features/recurring/utils/recurring-schedule";
import { createUserTransaction } from "#/features/transactions/server/transactions-repository";

interface CreateRecurringRuleParams {
	userId: string;
	title: string;
	amount: string;
	currency: string;
	type: "income" | "expense" | "transfer";
	categoryId: number | null;
	paymentAccountId: number | null;
	source: string | null;
	note: string | null;
	sourceTransactionId?: number | null;
	cadence: RecurringCadence;
	nextRunAt: Date;
}

interface UpdateRecurringRuleParams {
	userId: string;
	ruleId: number;
	title?: string;
	amount?: string;
	currency?: string;
	type?: "income" | "expense" | "transfer";
	categoryId?: number | null;
	paymentAccountId?: number | null;
	source?: string | null;
	note?: string | null;
	cadence?: RecurringCadence;
	nextRunAt?: Date;
	isActive?: boolean;
}

/** Loads a user's recurring rules, soonest due first. */
export async function getUserRecurringRules(userId: string) {
	return db
		.select()
		.from(recurringRules)
		.where(eq(recurringRules.userId, userId))
		.orderBy(asc(recurringRules.nextRunAt));
}

/** Loads one rule owned by the user. */
export async function getUserRecurringRuleById(userId: string, ruleId: number) {
	const [row] = await db
		.select()
		.from(recurringRules)
		.where(
			and(eq(recurringRules.userId, userId), eq(recurringRules.id, ruleId)),
		)
		.limit(1);

	return row ?? null;
}

/** Creates a recurring rule for a user. */
export async function createUserRecurringRule(
	params: CreateRecurringRuleParams,
) {
	const [row] = await db
		.insert(recurringRules)
		.values({
			userId: params.userId,
			title: params.title,
			amount: params.amount,
			currency: params.currency,
			type: params.type,
			categoryId: params.categoryId,
			paymentAccountId: params.paymentAccountId,
			source: params.source,
			note: params.note,
			sourceTransactionId: params.sourceTransactionId ?? null,
			cadence: params.cadence,
			nextRunAt: params.nextRunAt,
		})
		.returning();

	return row;
}

/** Updates a recurring rule owned by a user. */
export async function updateUserRecurringRule(
	params: UpdateRecurringRuleParams,
) {
	const [row] = await db
		.update(recurringRules)
		.set({
			...(params.title !== undefined ? { title: params.title } : {}),
			...(params.amount !== undefined ? { amount: params.amount } : {}),
			...(params.currency !== undefined ? { currency: params.currency } : {}),
			...(params.type !== undefined ? { type: params.type } : {}),
			...(params.categoryId !== undefined
				? { categoryId: params.categoryId }
				: {}),
			...(params.paymentAccountId !== undefined
				? { paymentAccountId: params.paymentAccountId }
				: {}),
			...(params.source !== undefined ? { source: params.source } : {}),
			...(params.note !== undefined ? { note: params.note } : {}),
			...(params.cadence !== undefined ? { cadence: params.cadence } : {}),
			...(params.nextRunAt !== undefined
				? { nextRunAt: params.nextRunAt }
				: {}),
			...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(recurringRules.userId, params.userId),
				eq(recurringRules.id, params.ruleId),
			),
		)
		.returning();

	return row ?? null;
}

/** Deletes a recurring rule owned by a user. */
export async function deleteUserRecurringRule(userId: string, ruleId: number) {
	const [row] = await db
		.delete(recurringRules)
		.where(
			and(eq(recurringRules.userId, userId), eq(recurringRules.id, ruleId)),
		)
		.returning({ id: recurringRules.id });

	return row ?? null;
}

/**
 * Cron worker: for every active rule whose nextRunAt is due, create the
 * transaction it represents and advance its schedule past `now`. Idempotent
 * across runs because nextRunAt always moves into the future after processing.
 */
export async function processDueRecurringRules(now: Date = new Date()) {
	const dueRules = await db
		.select()
		.from(recurringRules)
		.where(
			and(
				eq(recurringRules.isActive, true),
				lte(recurringRules.nextRunAt, now),
			),
		);

	let processed = 0;

	for (const rule of dueRules) {
		const cadence = normalizeCadence(rule.cadence);

		await createUserTransaction({
			userId: rule.userId,
			title: rule.title,
			amount: rule.amount,
			sourceAmount: null,
			sourceCurrency: rule.currency,
			exchangeRate: "1",
			type: rule.type as "income" | "expense" | "transfer",
			categoryId: rule.categoryId,
			paymentAccountId: rule.paymentAccountId,
			source: rule.source ?? "recurring",
			note: rule.note,
			happenedAt: rule.nextRunAt,
		});

		await db
			.update(recurringRules)
			.set({
				nextRunAt: computeNextRun(rule.nextRunAt, cadence, now),
				lastRunAt: now,
				updatedAt: now,
			})
			.where(eq(recurringRules.id, rule.id));

		processed += 1;
	}

	return { processed };
}
