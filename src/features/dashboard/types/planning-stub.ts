/**
 * Temporary client-side stubs for dashboard planning widgets that do not yet
 * have a backing API. Replace these with real query hooks once available.
 */

export interface MonthlyBudgetStub {
	/** Budget ceiling for the current month, in the user's currency. */
	limit: number;
	/** Amount already spent this month, in the user's currency. */
	spent: number;
	/** Human label for the period (e.g. "June 2026"). */
	periodLabel: string;
}

export interface UpcomingBillStub {
	id: string;
	name: string;
	/** Short label rendered inside the avatar chip. */
	badge: string;
	/** Display label for the due date (e.g. "Jun 28"). */
	dueLabel: string;
	/** Amount due, in the user's currency. */
	amount: number;
}

// TODO(api): wire monthly budget — replace with a real budget query/hook.
export const MONTHLY_BUDGET_STUB: MonthlyBudgetStub = {
	limit: 3200,
	spent: 2140,
	periodLabel: new Intl.DateTimeFormat(undefined, {
		month: "long",
		year: "numeric",
	}).format(new Date()),
};

// TODO(api): wire upcoming bills — replace with a real upcoming-bills query/hook.
export const UPCOMING_BILLS_STUB: UpcomingBillStub[] = [
	{ id: "rent", name: "Rent", badge: "RT", dueLabel: "Jul 1", amount: 1200 },
	{
		id: "electricity",
		name: "Electricity",
		badge: "EL",
		dueLabel: "Jun 28",
		amount: 86.4,
	},
	{
		id: "internet",
		name: "Internet",
		badge: "IN",
		dueLabel: "Jun 30",
		amount: 54.99,
	},
	{
		id: "streaming",
		name: "Streaming",
		badge: "ST",
		dueLabel: "Jul 3",
		amount: 17.99,
	},
];
