import { addMonths, addWeeks, addYears } from "date-fns";

export type RecurringCadence = "weekly" | "monthly" | "yearly";

export const RECURRING_CADENCES: { value: RecurringCadence; label: string }[] =
	[
		{ value: "weekly", label: "Weekly" },
		{ value: "monthly", label: "Monthly" },
		{ value: "yearly", label: "Yearly" },
	];

/** Advances a date by exactly one cadence step. */
export function advanceRecurringDate(
	from: Date,
	cadence: RecurringCadence,
): Date {
	switch (cadence) {
		case "weekly":
			return addWeeks(from, 1);
		case "yearly":
			return addYears(from, 1);
		default:
			return addMonths(from, 1);
	}
}

/**
 * Returns the next run strictly after `now`, stepping by cadence from `from`.
 * Handles missed runs (e.g. the cron didn't fire for a while) by skipping ahead.
 */
export function computeNextRun(
	from: Date,
	cadence: RecurringCadence,
	now: Date,
): Date {
	let next = from;
	let guard = 0;
	while (next <= now && guard < 1000) {
		next = advanceRecurringDate(next, cadence);
		guard += 1;
	}
	return next;
}

/** Narrows an arbitrary string to a known cadence, defaulting to monthly. */
export function normalizeCadence(
	value: string | null | undefined,
): RecurringCadence {
	return value === "weekly" || value === "yearly" ? value : "monthly";
}
