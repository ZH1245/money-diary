import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
	ArrowRight,
	Receipt,
	TrendingDown,
	TrendingUp,
	Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DashboardLoadingSkeleton } from "#/components/feedback/page-state";
import { SensitiveText } from "#/components/privacy/sensitive-text";
import {
	SignedTransactionAmount,
	type TransactionFlowType,
} from "#/components/privacy/signed-transaction-amount";
import { Button } from "#/components/ui/button";
import { useCategoriesQuery } from "#/features/categories/hooks/use-categories";
import { AccountCardsRow } from "#/features/dashboard/components/account-cards-row";
import { InsightMiniCard } from "#/features/dashboard/components/insight-mini-card";
import { dashboardDateRangeStore } from "#/features/dashboard/store/dashboard-date-range-store";
import {
	MONTHLY_BUDGET_STUB,
	UPCOMING_BILLS_STUB,
} from "#/features/dashboard/types/planning-stub";
import { isDateInRange } from "#/features/dashboard/utils/dashboard-date-range";
import { buildDashboardStats } from "#/features/dashboard/utils/dashboard-stats";
import { useGoalsQuery } from "#/features/goals/hooks/use-goals";
import { usePaymentAccountsQuery } from "#/features/payment-accounts/hooks/use-payment-accounts";
import {
	buildPaymentAccountBalances,
	findCashPaymentAccountId,
} from "#/features/payment-accounts/utils/payment-account-balance";
import { useSavingsQuery } from "#/features/savings/hooks/use-savings";
import { useTransactionsQuery } from "#/features/transactions/hooks/use-transactions";
import { useWishlistQuery } from "#/features/wishlist/hooks/use-wishlist";
import {
	formatSensitiveCompactAmount,
	formatSensitiveCurrency,
	formatSensitiveText,
	usePrivacyModeEnabled,
} from "#/lib/privacy/sensitive-format";
import { cn } from "#/lib/utils";

interface DashboardPageContentProps {
	userCurrency: string;
}

export function DashboardPageContent({
	userCurrency,
}: DashboardPageContentProps) {
	const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
		null,
	);
	const dateRange = useStore(dashboardDateRangeStore, (state) => state);
	const {
		data: transactions = [],
		isPending: isTransactionsPending,
		isError: isTransactionsError,
		error: transactionsError,
	} = useTransactionsQuery();
	const {
		data: categories = [],
		isPending: isCategoriesPending,
		isError: isCategoriesError,
		error: categoriesError,
	} = useCategoriesQuery();
	const {
		data: savings = [],
		isError: isSavingsError,
		error: savingsError,
	} = useSavingsQuery();
	const { data: paymentAccounts = [], isPending: isPaymentAccountsPending } =
		usePaymentAccountsQuery();
	const {
		data: wishlist = [],
		isError: isWishlistError,
		error: wishlistError,
	} = useWishlistQuery();
	const {
		data: goals = [],
		isError: isGoalsError,
		error: goalsError,
	} = useGoalsQuery();
	const isPrivacyMode = usePrivacyModeEnabled();

	const filteredTransactions = useMemo(
		() =>
			transactions.filter(
				(transaction) =>
					isDateInRange(transaction.happenedAt, dateRange.from, dateRange.to) &&
					(selectedAccountId == null ||
						transaction.paymentAccountId === selectedAccountId),
			),
		[transactions, dateRange.from, dateRange.to, selectedAccountId],
	);
	const filteredSavings = useMemo(
		() =>
			savings.filter((saving) =>
				isDateInRange(saving.savedAt, dateRange.from, dateRange.to),
			),
		[savings, dateRange.from, dateRange.to],
	);
	const cashPaymentAccountId = useMemo(
		() => findCashPaymentAccountId(paymentAccounts),
		[paymentAccounts],
	);

	const accountBalances = useMemo(
		() =>
			buildPaymentAccountBalances({
				accountIds: paymentAccounts.map((account) => account.id),
				transactions: transactions.map((transaction) => ({
					amount: transaction.amount,
					type: transaction.type,
					paymentAccountId: transaction.paymentAccountId,
					source: transaction.source,
				})),
				savings: savings.map((saving) => ({
					amount: saving.amount,
					paymentAccountId: saving.paymentAccountId,
					entryType: saving.entryType,
				})),
			}),
		[paymentAccounts, transactions, savings],
	);

	const stats = useMemo(
		() =>
			buildDashboardStats({
				transactions: filteredTransactions,
				allTransactions: transactions.map((transaction) => ({
					amount: transaction.amount,
					type: transaction.type,
					paymentAccountId: transaction.paymentAccountId,
					source: transaction.source,
				})),
				allSavings: savings.map((saving) => ({
					amount: saving.amount,
					paymentAccountId: saving.paymentAccountId,
					entryType: saving.entryType,
				})),
				cashPaymentAccountId,
				categories,
				savings: filteredSavings,
				wishlist,
				goals,
				dateRange,
			}),
		[
			filteredTransactions,
			transactions,
			savings,
			cashPaymentAccountId,
			categories,
			filteredSavings,
			wishlist,
			goals,
			dateRange,
		],
	);

	// Period-over-period change: compare net flow of the latest trend bucket
	// against the previous one, derived from existing stats (no new API).
	const changePercent = useMemo(() => {
		const trend = stats.weeklyTrend;
		if (trend.length < 2) return 0;
		const latest = trend[trend.length - 1];
		const prev = trend[trend.length - 2];
		const latestNet = latest.income - latest.expense;
		const prevNet = prev.income - prev.expense;
		if (prevNet === 0) return latestNet === 0 ? 0 : 100;
		return ((latestNet - prevNet) / Math.abs(prevNet)) * 100;
	}, [stats.weeklyTrend]);

	const maxTrendValue = useMemo(
		() =>
			Math.max(
				1,
				...stats.weeklyTrend.map((bucket) =>
					Math.max(bucket.income, bucket.expense),
				),
			),
		[stats.weeklyTrend],
	);

	const categorySpending = useMemo(() => {
		const byCategory = new Map<number, number>();
		for (const transaction of filteredTransactions) {
			if (transaction.type !== "expense" || transaction.categoryId === null)
				continue;
			byCategory.set(
				transaction.categoryId,
				(byCategory.get(transaction.categoryId) ?? 0) +
					Number(transaction.amount),
			);
		}
		const rows = [...byCategory.entries()]
			.map(([categoryId, amount]) => ({
				id: categoryId,
				name:
					categories.find((category) => category.id === categoryId)?.name ??
					"Uncategorized",
				amount,
			}))
			.sort((a, b) => b.amount - a.amount)
			.slice(0, 5);
		const max = Math.max(1, ...rows.map((row) => row.amount));
		return { rows, max };
	}, [filteredTransactions, categories]);

	const isStatsPending =
		isTransactionsPending || isCategoriesPending || isPaymentAccountsPending;
	const statsError = isTransactionsError
		? transactionsError
		: isCategoriesError
			? categoriesError
			: null;
	const secondaryDataError = isSavingsError
		? savingsError
		: isWishlistError
			? wishlistError
			: isGoalsError
				? goalsError
				: null;

	const budgetUsedPercent = Math.min(
		100,
		Math.round((MONTHLY_BUDGET_STUB.spent / MONTHLY_BUDGET_STUB.limit) * 100),
	);
	const budgetRemaining = MONTHLY_BUDGET_STUB.limit - MONTHLY_BUDGET_STUB.spent;

	return (
		<main className="w-full max-w-full overflow-x-hidden p-4 sm:p-6 lg:p-8">
			<section className="space-y-6">
				{isStatsPending ? <DashboardLoadingSkeleton /> : null}
				{statsError ? (
					<p className="text-sm text-expense">{statsError.message}</p>
				) : null}
				{secondaryDataError ? (
					<p className="text-sm text-muted-foreground">
						Some dashboard data could not be loaded:{" "}
						{secondaryDataError.message}
					</p>
				) : null}

				{!isStatsPending && !statsError ? (
					<>
						{/* 1) Account cards row */}
						<AccountCardsRow
							accounts={paymentAccounts}
							balances={accountBalances}
							selectedAccountId={selectedAccountId}
							onSelect={setSelectedAccountId}
							currency={userCurrency}
							isPrivacyMode={isPrivacyMode}
						/>

						{/* 2) Big balance + change% + mini-stats + 12-bar mini chart */}
						<div className="md-panel p-5 sm:p-6">
							<div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
								<div className="lg:w-2/5">
									<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
										{selectedAccountId == null
											? "Net balance"
											: "Account balance"}
									</p>
									<p className="mt-2 font-num text-4xl font-extrabold tracking-tight tabular-nums text-foreground sm:text-5xl">
										<SensitiveText
											text={formatSensitiveCurrency(
												stats.balance,
												userCurrency,
												isPrivacyMode,
											)}
										/>
									</p>
									<div className="mt-3 flex items-center gap-2 text-sm">
										<span
											className={cn(
												"inline-flex items-center gap-1 font-num font-extrabold tabular-nums",
												changePercent >= 0 ? "text-income" : "text-expense",
											)}
										>
											{changePercent >= 0 ? (
												<TrendingUp className="size-4" />
											) : (
												<TrendingDown className="size-4" />
											)}
											{changePercent >= 0 ? "+" : ""}
											{changePercent.toFixed(1)}%
										</span>
										<span className="text-muted-foreground">
											vs previous period
										</span>
									</div>

									<div className="mt-6 grid grid-cols-3 gap-3">
										<InsightMiniCard
											icon={<TrendingUp className="size-4 text-income" />}
											label="Income"
											value={formatSensitiveCompactAmount(
												stats.totalIncome,
												userCurrency,
												isPrivacyMode,
											)}
											isSensitive
										/>
										<InsightMiniCard
											icon={<TrendingDown className="size-4 text-expense" />}
											label="Spent"
											value={formatSensitiveCompactAmount(
												stats.totalExpense,
												userCurrency,
												isPrivacyMode,
											)}
											isSensitive
										/>
										<InsightMiniCard
											icon={
												<Receipt className="size-4 text-muted-foreground" />
											}
											label="Txns"
											value={String(stats.transactionCount)}
										/>
									</div>
								</div>

								{/* 12-bar mini bar chart (income vs expense per bucket) */}
								<div className="flex-1 rounded-panel border border-border-faint bg-canvas p-4">
									<div className="flex items-center justify-between">
										<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
											Income vs spending
										</p>
										<div className="flex items-center gap-3 text-xs text-muted-foreground">
											<span className="inline-flex items-center gap-1.5">
												<span className="size-2 rounded-full bg-income" />
												In
											</span>
											<span className="inline-flex items-center gap-1.5">
												<span className="size-2 rounded-full bg-expense" />
												Out
											</span>
										</div>
									</div>
									<div className="mt-4 flex h-40 items-end gap-1.5 sm:gap-2">
										{stats.weeklyTrend.length === 0 ? (
											<p className="m-auto text-sm text-muted-foreground">
												No activity in range.
											</p>
										) : (
											stats.weeklyTrend.map((bucket) => (
												<div
													key={bucket.week}
													className="flex h-full flex-1 flex-col items-center justify-end gap-1"
													title={`${bucket.week}`}
												>
													<div className="flex h-full w-full items-end justify-center gap-0.5">
														<div
															className="w-1/2 rounded-t-sm bg-income/80"
															style={{
																height: `${(bucket.income / maxTrendValue) * 100}%`,
															}}
														/>
														<div
															className="w-1/2 rounded-t-sm bg-expense/80"
															style={{
																height: `${(bucket.expense / maxTrendValue) * 100}%`,
															}}
														/>
													</div>
													<span className="truncate text-[0.6rem] text-muted-foreground">
														{bucket.week}
													</span>
												</div>
											))
										)}
									</div>
								</div>
							</div>
						</div>

						{/* 3) Two-up: Monthly budget + Upcoming bills */}
						<div className="grid gap-4 lg:grid-cols-2">
							{/* Monthly budget — TODO(api): wire monthly budget */}
							<div className="md-panel p-5 sm:p-6">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-base font-bold text-foreground">
											Monthly budget
										</p>
										<p className="text-xs text-muted-foreground">
											{MONTHLY_BUDGET_STUB.periodLabel}
										</p>
									</div>
									<span
										className="md-chip"
										data-active={budgetUsedPercent >= 90 ? "true" : undefined}
									>
										{budgetUsedPercent}% used
									</span>
								</div>
								<div className="mt-5 flex items-baseline gap-2">
									<span className="font-num text-2xl font-extrabold tracking-tight tabular-nums text-foreground">
										<SensitiveText
											text={formatSensitiveCurrency(
												MONTHLY_BUDGET_STUB.spent,
												userCurrency,
												isPrivacyMode,
											)}
										/>
									</span>
									<span className="text-sm text-muted-foreground">
										/{" "}
										{formatSensitiveCurrency(
											MONTHLY_BUDGET_STUB.limit,
											userCurrency,
											isPrivacyMode,
										)}
									</span>
								</div>
								<div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-track">
									<div
										className={cn(
											"h-full rounded-full",
											budgetUsedPercent >= 90 ? "bg-expense" : "bg-primary",
										)}
										style={{ width: `${budgetUsedPercent}%` }}
									/>
								</div>
								<p className="mt-3 text-sm text-muted-foreground">
									<span className="font-num font-extrabold tabular-nums text-foreground">
										<SensitiveText
											text={formatSensitiveCurrency(
												budgetRemaining,
												userCurrency,
												isPrivacyMode,
											)}
										/>
									</span>{" "}
									remaining this month
								</p>
							</div>

							{/* Upcoming bills — TODO(api): wire upcoming bills */}
							<div className="md-panel p-5 sm:p-6">
								<div className="flex items-center justify-between">
									<p className="text-base font-bold text-foreground">
										Upcoming bills
									</p>
									<span className="text-xs text-muted-foreground">
										{UPCOMING_BILLS_STUB.length} due soon
									</span>
								</div>
								<ul className="mt-4 space-y-1">
									{UPCOMING_BILLS_STUB.map((bill) => (
										<li
											key={bill.id}
											className="md-row flex items-center gap-3 px-2 py-2.5"
										>
											<span className="grid size-9 shrink-0 place-items-center rounded-lg bg-soft-accent text-xs font-bold text-primary">
												{bill.badge}
											</span>
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-medium text-foreground">
													{bill.name}
												</p>
												<p className="text-xs text-muted-foreground">
													Due {bill.dueLabel}
												</p>
											</div>
											<span className="font-num font-extrabold tabular-nums text-foreground">
												<SensitiveText
													text={formatSensitiveCurrency(
														bill.amount,
														userCurrency,
														isPrivacyMode,
													)}
												/>
											</span>
										</li>
									))}
								</ul>
							</div>
						</div>

						{/* 4) Two-up: Recent activity + Spending by category */}
						<div className="grid gap-4 lg:grid-cols-2">
							{/* Recent activity — fixed-layout table so long titles/amounts
							    truncate instead of forcing horizontal overflow. */}
							<div className="md-panel overflow-hidden p-5 sm:p-6">
								<div className="flex items-center justify-between">
									<p className="text-base font-bold text-foreground">
										Recent activity
									</p>
									<Button
										asChild
										variant="ghost"
										size="sm"
										className="text-primary"
									>
										<Link to="/transactions">
											View all
											<ArrowRight className="size-4" />
										</Link>
									</Button>
								</div>
								<table className="mt-3 w-full table-fixed">
									<tbody>
										{stats.recentTransactions.length === 0 ? (
											<tr>
												<td className="px-2 py-6 text-center text-sm text-muted-foreground">
													No transactions yet.
												</td>
											</tr>
										) : (
											stats.recentTransactions.map((transaction) => (
												<tr key={transaction.id} className="md-row">
													<td className="w-11 py-2.5 pl-2 align-middle">
														<span
															className={cn(
																"grid size-9 place-items-center rounded-lg",
																transaction.type === "income"
																	? "bg-income/15 text-income"
																	: transaction.type === "expense"
																		? "bg-expense/15 text-expense"
																		: "bg-soft-accent text-primary",
															)}
														>
															{transaction.type === "income" ? (
																<TrendingUp className="size-4" />
															) : transaction.type === "expense" ? (
																<TrendingDown className="size-4" />
															) : (
																<Wallet className="size-4" />
															)}
														</span>
													</td>
													<td className="truncate py-2.5 pl-3 align-middle">
														<p className="truncate text-sm font-medium text-foreground">
															<SensitiveText text={transaction.title} />
														</p>
														<p className="truncate text-xs text-muted-foreground">
															{transaction.happenedAtLabel}
														</p>
													</td>
													<td className="w-[7rem] py-2.5 pr-2 text-right align-middle">
														<SignedTransactionAmount
															amount={transaction.amount}
															currency={userCurrency}
															type={transaction.type as TransactionFlowType}
															className="font-num whitespace-nowrap"
														/>
													</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>

							{/* Spending by category — fixed-layout table for the name/amount
							    line; the progress bar sits full-width below each row. */}
							<div className="md-panel overflow-hidden p-5 sm:p-6">
								<div className="flex items-center justify-between gap-3">
									<p className="text-base font-bold text-foreground">
										Spending by category
									</p>
									<span className="shrink-0 truncate text-xs text-muted-foreground">
										Top:{" "}
										{formatSensitiveText(
											stats.topExpenseCategoryLabel,
											isPrivacyMode,
										)}
									</span>
								</div>
								<div className="mt-4 space-y-4">
									{categorySpending.rows.length === 0 ? (
										<p className="py-6 text-center text-sm text-muted-foreground">
											No spending in range.
										</p>
									) : (
										categorySpending.rows.map((row) => (
											<div key={row.id}>
												<table className="w-full table-fixed">
													<tbody>
														<tr>
															<td className="truncate pr-3 align-middle text-sm font-medium text-foreground">
																<SensitiveText text={row.name} />
															</td>
															<td className="w-[7rem] text-right align-middle">
																<span className="font-num whitespace-nowrap font-extrabold tabular-nums text-foreground">
																	<SensitiveText
																		text={formatSensitiveCurrency(
																			row.amount,
																			userCurrency,
																			isPrivacyMode,
																		)}
																	/>
																</span>
															</td>
														</tr>
													</tbody>
												</table>
												<div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-track">
													<div
														className="h-full rounded-full bg-primary"
														style={{
															width: `${(row.amount / categorySpending.max) * 100}%`,
														}}
													/>
												</div>
											</div>
										))
									)}
								</div>
							</div>
						</div>
					</>
				) : null}
			</section>
		</main>
	);
}
