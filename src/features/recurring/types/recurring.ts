import type { RecurringCadence } from "#/features/recurring/utils/recurring-schedule";

/** A recurring rule as returned by the API (timestamps are ISO strings). */
export interface RecurringRuleDto {
	id: number;
	userId: string;
	title: string;
	amount: string;
	currency: string;
	type: "income" | "expense" | "transfer";
	categoryId: number | null;
	paymentAccountId: number | null;
	source: string | null;
	note: string | null;
	sourceTransactionId: number | null;
	cadence: string;
	nextRunAt: string;
	lastRunAt: string | null;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface CreateRecurringInput {
	title: string;
	amount: string;
	currency: string;
	type: "income" | "expense" | "transfer";
	categoryId?: number | null;
	paymentAccountId?: number | null;
	source?: string | null;
	note?: string | null;
	sourceTransactionId?: number | null;
	cadence: RecurringCadence;
	/** ISO date of the first future occurrence. Defaults server-side to now + one cadence. */
	nextRunAt?: string;
}

export interface UpdateRecurringInput {
	title?: string;
	amount?: string;
	currency?: string;
	type?: "income" | "expense" | "transfer";
	categoryId?: number | null;
	paymentAccountId?: number | null;
	source?: string | null;
	note?: string | null;
	cadence?: RecurringCadence;
	nextRunAt?: string;
	isActive?: boolean;
}
