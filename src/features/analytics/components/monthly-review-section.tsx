import { format, parseISO } from "date-fns";
import { CalendarRange, PiggyBank } from "lucide-react";
import { useMemo, useState } from "react";
import { SensitiveText } from "#/components/privacy/sensitive-text";
import { Button } from "#/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import {
	MonthlyReviewSavingsDialog,
	type MonthlyReviewSavingsPreset,
} from "#/features/analytics/components/monthly-review-savings-dialog";
import {
	buildMonthlyReview,
	getDefaultReviewMonthKey,
	getReviewMonthOptions,
} from "#/features/analytics/utils/monthly-review";
import type { SavingDto } from "#/features/savings/types/saving";
import type { PaymentAccountDto } from "#/features/payment-accounts/types/payment-account";
import { formatPaymentAccountLabel } from "#/features/payment-accounts/utils/account-label";
import type { TransactionDto } from "#/features/transactions/types/transaction";
import {
	formatSensitiveCurrency,
	usePrivacyModeEnabled,
} from "#/lib/privacy/sensitive-format";

interface MonthlyReviewSectionProps {
	userCurrency: string;
	transactions: TransactionDto[];
	savings: SavingDto[];
	paymentAccounts: PaymentAccountDto[];
}

function formatMonthLabel(monthKey: string): string {
	return format(startOfMonthSafe(monthKey), "MMMM yyyy");
}

function startOfMonthSafe(monthKey: string): Date {
	return parseISO(`${monthKey}-01`);
}

/**
 * Month-end review: cash flow in the month plus balances as of the last day.
 */
export function MonthlyReviewSection({
	userCurrency,
	transactions,
	savings,
	paymentAccounts,
}: MonthlyReviewSectionProps) {
	const currency = userCurrency.toUpperCase();
	const isPrivacyMode = usePrivacyModeEnabled();

	const monthOptions = useMemo(
		() => getReviewMonthOptions(transactions, savings),
		[transactions, savings],
	);

	const [monthKey, setMonthKey] = useState(() => {
		const defaultMonth = getDefaultReviewMonthKey();
		return monthOptions.includes(defaultMonth)
			? defaultMonth
			: (monthOptions[0] ?? defaultMonth);
	});

	const accountLabels = useMemo(() => {
		const labels = new Map<number, string>();
		for (const account of paymentAccounts) {
			labels.set(account.id, formatPaymentAccountLabel(account));
		}
		return labels;
	}, [paymentAccounts]);

	const review = useMemo(
		() =>
			buildMonthlyReview({
				monthKey,
				transactions: transactions.map((transaction) => ({
					amount: transaction.amount,
					type: transaction.type,
					happenedAt: transaction.happenedAt,
					paymentAccountId: transaction.paymentAccountId,
					source: transaction.source,
				})),
				savings: savings.map((entry) => ({
					amount: entry.amount,
					savedAt: entry.savedAt,
					paymentAccountId: entry.paymentAccountId,
					entryType: entry.entryType,
					goalId: entry.goalId,
				})),
				paymentAccounts,
				resolveAccountLabel: (accountId) =>
					accountLabels.get(accountId) ?? `Account #${accountId}`,
			}),
		[monthKey, transactions, savings, paymentAccounts, accountLabels],
	);

	const [savingsDialogOpen, setSavingsDialogOpen] = useState(false);
	const [savingsPreset, setSavingsPreset] =
		useState<MonthlyReviewSavingsPreset | null>(null);

	function openSavingsDialog(preset: MonthlyReviewSavingsPreset) {
		setSavingsPreset(preset);
		setSavingsDialogOpen(true);
	}

	const hasActivity =
		review.income > 0 ||
		review.expense > 0 ||
		review.savingsDeposits > 0 ||
		review.accountBalances.some((row) => row.balance !== 0);

	return (
		<div className="bg-panel rounded-panel border border-border p-[22px] shadow-sm">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<div className="flex items-center gap-2">
						<CalendarRange className="size-4 text-muted-foreground" />
						<p className="text-sm font-semibold text-foreground">
							Monthly review
						</p>
					</div>
					<p className="mt-1 text-xs text-muted-foreground">
						How the month went, and what you had in accounts at month end
					</p>
				</div>
				<Select value={monthKey} onValueChange={setMonthKey}>
					<SelectTrigger className="w-full sm:w-44" aria-label="Review month">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{monthOptions.map((option) => (
							<SelectItem key={option} value={option}>
								{formatMonthLabel(option)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{!hasActivity ? (
				<p className="mt-4 text-sm text-muted-foreground">
					No activity in {review.monthLabel} yet.
				</p>
			) : (
				<>
					<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						<ReviewStat
							label="Income"
							value={formatSensitiveCurrency(
								review.income,
								currency,
								isPrivacyMode,
							)}
						/>
						<ReviewStat
							label="Spent"
							value={formatSensitiveCurrency(
								review.expense,
								currency,
								isPrivacyMode,
							)}
						/>
						<ReviewStat
							label="Saved"
							value={formatSensitiveCurrency(
								review.netSavedInMonth,
								currency,
								isPrivacyMode,
							)}
						/>
						<ReviewStat
							label="Net worth (month end)"
							value={formatSensitiveCurrency(
								review.endingNetWorth,
								currency,
								isPrivacyMode,
							)}
						/>
					</div>

					<div className="mt-4 rounded-panel border border-border bg-input-bg p-3">
						<div className="flex flex-wrap items-start justify-between gap-2">
							<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								In accounts at month end
							</p>
							{review.accountBalances.some((row) => row.balance > 0) ? (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-7 gap-1.5 px-2 text-xs"
									onClick={() =>
										openSavingsDialog({ accountId: null, amount: 0 })
									}
								>
									<PiggyBank className="size-3.5" />
									Log savings
								</Button>
							) : null}
						</div>
						<p className="font-num mt-1 text-xl font-extrabold tabular-nums text-foreground">
							<SensitiveText
								text={formatSensitiveCurrency(
									review.endingInAccounts,
									currency,
									isPrivacyMode,
								)}
							/>
						</p>
						{review.accountBalances.length ? (
							<ul className="mt-3 space-y-2">
								{review.accountBalances.map((row) => (
									<li
										key={row.accountId}
										className="flex items-center justify-between gap-3 text-sm"
									>
										<SensitiveText
											text={row.label}
											className="min-w-0 truncate text-foreground"
										/>
										<div className="flex shrink-0 items-center gap-2">
											<span className="font-num font-semibold tabular-nums text-foreground">
												{formatSensitiveCurrency(
													row.balance,
													currency,
													isPrivacyMode,
												)}
											</span>
											{row.balance > 0 ? (
												<Button
													type="button"
													variant="outline"
													size="sm"
													className="h-7 px-2 text-xs"
													onClick={() =>
														openSavingsDialog({
															accountId: row.accountId,
															amount: row.balance,
														})
													}
												>
													To savings
												</Button>
											) : null}
										</div>
									</li>
								))}
							</ul>
						) : (
							<p className="mt-2 text-xs text-muted-foreground">
								Link transactions to accounts to see per-card balances.
							</p>
						)}
					</div>

					{review.unallocatedCashFlow > 0 ? (
						<div className="mt-4 flex flex-col gap-3 rounded-panel border border-border bg-input-bg p-3 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<p className="text-sm font-medium text-foreground">
									Unallocated this month
								</p>
								<p className="mt-0.5 text-xs text-muted-foreground">
									Income minus spending minus savings already logged this month —
									separate from account balances above
								</p>
								<p className="font-num mt-2 text-lg font-bold tabular-nums text-foreground">
									<SensitiveText
										text={formatSensitiveCurrency(
											review.unallocatedCashFlow,
											currency,
											isPrivacyMode,
										)}
									/>
								</p>
							</div>
							<Button
								type="button"
								variant="outline"
								className="shrink-0 gap-2"
								onClick={() =>
									openSavingsDialog({
										accountId: null,
										amount: review.unallocatedCashFlow,
									})
								}
							>
								<PiggyBank className="size-4" />
								Log savings deposit…
							</Button>
						</div>
					) : null}

					<MonthlyReviewSavingsDialog
						open={savingsDialogOpen}
						onOpenChange={setSavingsDialogOpen}
						preset={savingsPreset}
						monthKey={review.monthKey}
						monthLabel={review.monthLabel}
						userCurrency={currency}
						paymentAccounts={paymentAccounts}
						accountBalances={review.accountBalances}
						unallocatedCashFlow={review.unallocatedCashFlow}
					/>
				</>
			)}
		</div>
	);
}

interface ReviewStatProps {
	label: string;
	value: string;
}

function ReviewStat({ label, value }: ReviewStatProps) {
	return (
		<div className="rounded-panel border border-border-faint bg-input-bg px-3 py-2.5">
			<p className="text-xs text-muted-foreground">{label}</p>
			<p className="font-num mt-1 text-base font-bold tabular-nums text-foreground">
				<SensitiveText text={value} />
			</p>
		</div>
	);
}
