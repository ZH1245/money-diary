import { format } from "date-fns";
import { SensitiveText } from "#/components/privacy/sensitive-text";
import { SignedTransactionAmount } from "#/components/privacy/signed-transaction-amount";
import type { CategoryExpenseGroup } from "#/features/analytics/utils/analytics-stats";
import { formatSensitiveCurrency } from "#/lib/privacy/sensitive-format";

interface CategoryExpenseGroupsProps {
	groups: CategoryExpenseGroup[];
	currency: string;
	isPrivacyMode: boolean;
}

/** Expense transactions grouped under each category. */
export function CategoryExpenseGroups({
	groups,
	currency,
	isPrivacyMode,
}: CategoryExpenseGroupsProps) {
	if (!groups.length) {
		return (
			<p className="text-sm text-muted-foreground">
				No categorized expenses in this range.
			</p>
		);
	}

	return (
		<div className="space-y-4">
			{groups.map((group) => (
				<section
					key={group.categoryId ?? "uncategorized"}
					className="rounded-panel border border-border-faint p-4"
				>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<h3 className="text-sm font-semibold text-foreground">
							<SensitiveText text={group.label} />
						</h3>
						<p className="font-num text-sm font-bold tabular-nums text-foreground">
							{formatSensitiveCurrency(group.total, currency, isPrivacyMode)}
							<span className="ml-2 text-xs font-normal text-muted-foreground">
								{group.transactions.length}{" "}
								{group.transactions.length === 1 ? "entry" : "entries"}
							</span>
						</p>
					</div>
					<ul className="mt-3 divide-y divide-border-faint">
						{group.transactions.map((transaction) => (
							<li
								key={`${transaction.title}-${transaction.happenedAt}-${transaction.amount}`}
								className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0"
							>
								<div className="min-w-0">
									<SensitiveText
										text={transaction.title}
										className="font-medium text-foreground truncate"
									/>
									<p className="text-xs text-muted-foreground">
										{format(new Date(transaction.happenedAt), "MMM d, yyyy")}
									</p>
								</div>
								<SignedTransactionAmount
									amount={String(transaction.amount)}
									currency={currency}
									type="expense"
									className="shrink-0 font-medium"
								/>
							</li>
						))}
					</ul>
				</section>
			))}
		</div>
	);
}
