import { useStore } from "@tanstack/react-store";
import { format, parseISO } from "date-fns";
import { PiggyBank, CreditCard, TrendingDown, Wallet } from "lucide-react";
import { useMemo } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	AnalyticsLoadingSkeleton,
	PageEmptyState,
	PageErrorState,
} from "#/components/feedback/page-state";
import { SensitiveText } from "#/components/privacy/sensitive-text";
import { CategoryExpenseGroups } from "#/features/analytics/components/category-expense-groups";
import { InsightTable } from "#/features/analytics/components/insight-table";
import {
	buildAnalyticsStats,
	buildCategoryExpenseGroups,
	buildNetWorth,
	buildRangeSavingsRate,
	buildSpendingByPaymentAccount,
	buildTopCategories,
	buildTopIncome,
	buildTopTitles,
	type AnalyticsInsightRow,
} from "#/features/analytics/utils/analytics-stats";
import { useCategoriesQuery } from "#/features/categories/hooks/use-categories";
import { formatPaymentAccountLabel } from "#/features/payment-accounts/utils/account-label";
import { usePaymentAccountsQuery } from "#/features/payment-accounts/hooks/use-payment-accounts";
import { useSavingsQuery } from "#/features/savings/hooks/use-savings";
import { dashboardDateRangeStore } from "#/features/dashboard/store/dashboard-date-range-store";
import {
	buildTrendSeriesForDateRange,
	isDateInRange,
} from "#/features/dashboard/utils/dashboard-date-range";
import { parseLedgerAmount } from "#/features/shared/utils/amount";
import { useTransactionsQuery } from "#/features/transactions/hooks/use-transactions";
import { chartColors } from "#/lib/chart-colors";
import {
	formatSensitiveCompactAmount,
	formatSensitiveCurrency,
	formatSensitiveText,
	usePrivacyModeEnabled,
} from "#/lib/privacy/sensitive-format";

interface AnalyticsPageContentProps {
	userCurrency: string;
}

export function AnalyticsPageContent({
	userCurrency,
}: AnalyticsPageContentProps) {
	const dateRange = useStore(dashboardDateRangeStore, (state) => state);
	const {
		data: transactions = [],
		isPending,
		isError,
		error,
	} = useTransactionsQuery();
	const { data: categories = [] } = useCategoriesQuery();
	const { data: paymentAccounts = [] } = usePaymentAccountsQuery();
	const { data: savings = [] } = useSavingsQuery();
	const currency = userCurrency.toUpperCase();
	const isPrivacyMode = usePrivacyModeEnabled();

	const filteredTransactions = useMemo(
		() =>
			transactions.filter((transaction) =>
				isDateInRange(transaction.happenedAt, dateRange.from, dateRange.to),
			),
		[transactions, dateRange.from, dateRange.to],
	);

	const stats = useMemo(
		() => buildAnalyticsStats(filteredTransactions),
		[filteredTransactions],
	);
	const trendData = useMemo(
		() =>
			buildTrendSeriesForDateRange(
				filteredTransactions,
				dateRange.from,
				dateRange.to,
				parseLedgerAmount,
			),
		[filteredTransactions, dateRange.from, dateRange.to],
	);
	const topCategories = useMemo(
		() => buildTopCategories(filteredTransactions, categories),
		[filteredTransactions, categories],
	);
	const topTitles = useMemo(
		() => buildTopTitles(filteredTransactions),
		[filteredTransactions],
	);
	const spendingByCard = useMemo(
		() =>
			buildSpendingByPaymentAccount(filteredTransactions, paymentAccounts, (account) =>
				formatPaymentAccountLabel(account),
			),
		[filteredTransactions, paymentAccounts],
	);
	const categoryExpenseGroups = useMemo(
		() => buildCategoryExpenseGroups(filteredTransactions, categories),
		[filteredTransactions, categories],
	);
	const categoryChartData = useMemo(
		() =>
			topCategories.map((row, index) => ({
				name: row.label,
				amount: row.amount,
				color: chartColors.series[index % chartColors.series.length],
			})),
		[topCategories],
	);

	// Number of distinct months covered by the selected range, for the average.
	const monthSpan = useMemo(() => {
		const from = parseISO(dateRange.from);
		const to = parseISO(dateRange.to);
		const months =
			(to.getFullYear() - from.getFullYear()) * 12 +
			(to.getMonth() - from.getMonth()) +
			1;
		return Math.max(months, 1);
	}, [dateRange.from, dateRange.to]);

	const avgMonthlySpend = stats.expense / monthSpan;
	const netWorth = useMemo(
		() =>
			buildNetWorth({
				accountIds: paymentAccounts.map((account) => account.id),
				transactions: transactions.map((transaction) => ({
					amount: transaction.amount,
					type: transaction.type,
					paymentAccountId: transaction.paymentAccountId,
					source: transaction.source,
				})),
				savings: savings.map((entry) => ({
					amount: entry.amount,
					paymentAccountId: entry.paymentAccountId,
					entryType: entry.entryType,
					goalId: entry.goalId,
				})),
			}),
		[paymentAccounts, transactions, savings],
	);
	const savingsInRange = useMemo(
		() =>
			savings.filter((entry) =>
				isDateInRange(entry.savedAt, dateRange.from, dateRange.to),
			),
		[savings, dateRange.from, dateRange.to],
	);
	const savingsRate = useMemo(
		() => buildRangeSavingsRate(stats.income, stats.expense, savingsInRange),
		[stats.income, stats.expense, savingsInRange],
	);

	const categoryTotal = categoryChartData.reduce(
		(sum, entry) => sum + entry.amount,
		0,
	);
	const dateRangeLabel = `${format(parseISO(dateRange.from), "MMM d, yyyy")} – ${format(parseISO(dateRange.to), "MMM d, yyyy")}`;
	const hasExpenseData = stats.expense > 0;
	const hasTrend = trendData.some(
		(point) => point.income > 0 || point.expense > 0,
	);

	return (
		<main className="bg-canvas p-5 md:p-8">
			<section className="mx-auto max-w-6xl space-y-6">
				<header>
					<h1 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
						Analytics
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Spending insights for{" "}
						<span className="font-medium text-foreground">
							{dateRangeLabel}
						</span>
						. Use the date range in the top bar to filter workspace data.
					</p>
				</header>

				{isPending ? <AnalyticsLoadingSkeleton /> : null}
				{isError ? (
					<div className="bg-panel rounded-panel border border-border p-6">
						<PageErrorState message={error.message} />
					</div>
				) : null}

				{!isPending && !isError ? (
					<>
						{/* (a) KPI tiles */}
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
							<KpiTile
								icon={<Wallet className="size-4" />}
								label="Net worth"
								value={formatSensitiveCurrency(
									netWorth.netWorth,
									currency,
									isPrivacyMode,
								)}
								hint="Account balances plus savings ledger"
								isSensitive
							/>
							<KpiTile
								icon={<TrendingDown className="size-4" />}
								label="Avg monthly spend"
								value={formatSensitiveCurrency(
									avgMonthlySpend,
									currency,
									isPrivacyMode,
								)}
								hint={`Over ${monthSpan} ${monthSpan === 1 ? "month" : "months"}`}
								isSensitive
							/>
							<KpiTile
								icon={<PiggyBank className="size-4" />}
								label="Savings rate"
								value={`${savingsRate.percent.toFixed(0)}%`}
								hint={savingsRate.hint}
							/>
						</div>

						{/* (b) Income vs spending grouped bars */}
						<div className="bg-panel rounded-panel border border-border p-[22px] shadow-sm">
							<div className="flex items-baseline justify-between gap-3">
								<div>
									<p className="text-sm font-semibold text-foreground">
										Income vs spending
									</p>
									<p className="mt-1 text-xs text-muted-foreground">
										Grouped totals across the selected range
									</p>
								</div>
								<div className="flex items-center gap-4 text-xs text-muted-foreground">
									<LegendDot color="var(--income)" label="Income" />
									<LegendDot color="var(--expense)" label="Spending" />
								</div>
							</div>
							<div className="mt-5 h-72">
								{hasTrend ? (
									<ResponsiveContainer width="100%" height="100%">
										<BarChart data={trendData} barGap={6} barCategoryGap="28%">
											<CartesianGrid
												strokeDasharray="3 3"
												vertical={false}
												stroke="var(--border)"
											/>
											<XAxis
												dataKey="week"
												tickLine={false}
												axisLine={false}
												tick={{ fontSize: 11, fill: "var(--muted)" }}
											/>
											<YAxis
												tickLine={false}
												axisLine={false}
												tick={{ fontSize: 11, fill: "var(--muted)" }}
												tickFormatter={(value) =>
													formatSensitiveCompactAmount(
														Number(value),
														currency,
														isPrivacyMode,
													)
												}
											/>
											<Tooltip
												cursor={{ fill: "var(--row-hover)" }}
												contentStyle={tooltipStyle}
												formatter={(value, name) => [
													formatSensitiveCurrency(
														Number(value ?? 0),
														currency,
														isPrivacyMode,
													),
													String(name) === "income" ? "Income" : "Spending",
												]}
											/>
											<Bar
												dataKey="income"
												radius={[6, 6, 0, 0]}
												fill="var(--income)"
												maxBarSize={26}
											/>
											<Bar
												dataKey="expense"
												radius={[6, 6, 0, 0]}
												fill="var(--expense)"
												maxBarSize={26}
											/>
										</BarChart>
									</ResponsiveContainer>
								) : (
									<div className="flex h-full items-center justify-center">
										<PageEmptyState message="No income or spending in this date range." />
									</div>
								)}
							</div>
						</div>

						{/* (c) Top merchants + cards + (d) Where it goes donut */}
						<div className="grid gap-4 lg:grid-cols-2">
							<InsightTable
								title="Top merchants"
								description="Grouped by transaction title — stores, subscriptions, and payees you log"
								rows={topTitles}
								currency={currency}
								colors={[...chartColors.series]}
								isPrivacyMode={isPrivacyMode}
							/>
							<RankedSpendPanel
								icon={<CreditCard className="size-4" />}
								title="Spending by card"
								subtitle="Which accounts you paid from most"
								rows={spendingByCard}
								currency={currency}
								isPrivacyMode={isPrivacyMode}
								emptyMessage="No card or account spending in this range."
							/>
						</div>

						<div className="bg-panel rounded-panel border border-border p-[22px] shadow-sm">
								<p className="text-sm font-semibold text-foreground">
									Where it goes
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									Spending split by category
								</p>
								{categoryChartData.length ? (
									<div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
										<div className="h-48 w-48 shrink-0">
											<ResponsiveContainer width="100%" height="100%">
												<PieChart>
													<Pie
														data={categoryChartData}
														dataKey="amount"
														nameKey="name"
														innerRadius={54}
														outerRadius={88}
														paddingAngle={2}
														stroke="var(--panel)"
														strokeWidth={2}
													>
														{categoryChartData.map((entry) => (
															<Cell key={entry.name} fill={entry.color} />
														))}
													</Pie>
													<Tooltip
														contentStyle={tooltipStyle}
														formatter={(value) =>
															formatSensitiveCurrency(
																Number(value ?? 0),
																currency,
																isPrivacyMode,
															)
														}
													/>
												</PieChart>
											</ResponsiveContainer>
										</div>
										<ul className="min-w-0 flex-1 space-y-2">
											{categoryChartData.map((entry) => {
												const share =
													categoryTotal > 0
														? (entry.amount / categoryTotal) * 100
														: 0;
												return (
													<li
														key={entry.name}
														className="flex items-center gap-2 text-sm"
													>
														<span
															className="size-2.5 shrink-0 rounded-full"
															style={{ backgroundColor: entry.color }}
														/>
														<SensitiveText
															text={entry.name}
															className="min-w-0 flex-1 truncate text-foreground"
														/>
														<span className="font-num shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
															{share.toFixed(0)}%
														</span>
													</li>
												);
											})}
										</ul>
									</div>
								) : (
									<div className="mt-4 flex h-48 items-center justify-center">
										<PageEmptyState message="No expense categories yet." />
									</div>
								)}
						</div>

						{hasExpenseData ? (
							<>
								<InsightTable
									title="Top categories"
									description="Grouped by category — how spending splits across your budget"
									rows={topCategories}
									currency={currency}
									colors={[...chartColors.series]}
									isPrivacyMode={isPrivacyMode}
								/>

								<div className="bg-panel rounded-panel border border-border p-[22px] shadow-sm">
									<p className="text-sm font-semibold text-foreground">
										Expenses by category
									</p>
									<p className="mt-1 text-xs text-muted-foreground">
										All expense entries grouped under their category
									</p>
									<div className="mt-4">
										<CategoryExpenseGroups
											groups={categoryExpenseGroups}
											currency={currency}
											isPrivacyMode={isPrivacyMode}
										/>
									</div>
								</div>
							</>
						) : (
							<div className="bg-panel rounded-panel border border-border p-6">
								<PageEmptyState message="No expense data in this date range. Log expenses to see category and title breakdowns." />
							</div>
						)}

						{stats.income > 0 ? (
							<div className="bg-panel rounded-panel border border-border p-[22px] shadow-sm">
								<p className="text-sm font-semibold text-foreground">
									Income sources
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									Top income entries in this range
								</p>
								<div className="mt-4 h-56">
									<ResponsiveContainer width="100%" height="100%">
										<BarChart
											data={buildTopIncome(filteredTransactions)}
											layout="vertical"
											margin={{ left: 12, right: 12 }}
										>
											<CartesianGrid
												strokeDasharray="3 3"
												horizontal={false}
												stroke="var(--border)"
											/>
											<XAxis
												type="number"
												tick={{ fontSize: 11, fill: "var(--muted)" }}
												tickFormatter={(value) =>
													formatSensitiveCompactAmount(
														Number(value),
														currency,
														isPrivacyMode,
													)
												}
											/>
											<YAxis
												type="category"
												dataKey="label"
												width={100}
												tick={{ fontSize: 11, fill: "var(--muted)" }}
												tickFormatter={(value) =>
													formatSensitiveText(String(value), isPrivacyMode)
												}
											/>
											<Tooltip
												contentStyle={tooltipStyle}
												cursor={{ fill: "var(--row-hover)" }}
												formatter={(value) =>
													formatSensitiveCurrency(
														Number(value ?? 0),
														currency,
														isPrivacyMode,
													)
												}
											/>
											<Bar
												dataKey="amount"
												radius={[0, 6, 6, 0]}
												fill="var(--income)"
												maxBarSize={22}
											/>
										</BarChart>
									</ResponsiveContainer>
								</div>
							</div>
						) : null}
					</>
				) : null}
			</section>
		</main>
	);
}

const tooltipStyle = {
	background: "var(--panel)",
	border: "1px solid var(--border)",
	borderRadius: 12,
	fontSize: 12,
	color: "var(--fg)",
} as const;

interface KpiTileProps {
	icon: React.ReactNode;
	label: string;
	value: string;
	hint: string;
	isSensitive?: boolean;
}

function KpiTile({
	icon,
	label,
	value,
	hint,
	isSensitive = false,
}: KpiTileProps) {
	return (
		<div className="bg-panel rounded-panel border border-border p-[22px] shadow-sm">
			<div className="flex items-center gap-2 text-muted-foreground">
				<span className="bg-soft-accent text-primary flex size-7 items-center justify-center rounded-full">
					{icon}
				</span>
				<p className="text-xs font-medium uppercase tracking-wide">{label}</p>
			</div>
			<p className="font-num mt-4 text-2xl font-extrabold tracking-tight tabular-nums text-foreground">
				{isSensitive ? <SensitiveText text={value} /> : value}
			</p>
			<p className="mt-1 text-xs text-muted-foreground">{hint}</p>
		</div>
	);
}

function LegendDot({ color, label }: { color: string; label: string }) {
	return (
		<span className="flex items-center gap-1.5">
			<span
				className="size-2.5 rounded-full"
				style={{ backgroundColor: color }}
			/>
			{label}
		</span>
	);
}

interface RankedSpendPanelProps {
	icon: React.ReactNode;
	title: string;
	subtitle: string;
	rows: AnalyticsInsightRow[];
	currency: string;
	isPrivacyMode: boolean;
	emptyMessage: string;
}

/** Ranked spend list used for merchants and card analytics panels. */
function RankedSpendPanel({
	icon,
	title,
	subtitle,
	rows,
	currency,
	isPrivacyMode,
	emptyMessage,
}: RankedSpendPanelProps) {
	return (
		<div className="bg-panel rounded-panel border border-border p-[22px] shadow-sm">
			<div className="flex items-center gap-2">
				<span className="text-muted-foreground">{icon}</span>
				<p className="text-sm font-semibold text-foreground">{title}</p>
			</div>
			<p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
			{rows.length ? (
				<ul className="mt-4 space-y-2">
					{rows.map((row, index) => (
						<li
							key={row.label}
							className="hover:bg-row-hover flex items-center gap-3 rounded-lg px-2 py-2 transition-colors"
						>
							<span className="bg-soft-accent text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold">
								{index + 1}
							</span>
							<SensitiveText
								text={row.label}
								className="min-w-0 flex-1 truncate text-sm font-medium text-foreground"
							/>
							<span className="font-num text-sm font-bold tabular-nums text-foreground">
								{formatSensitiveCurrency(row.amount, currency, isPrivacyMode)}
							</span>
						</li>
					))}
				</ul>
			) : (
				<div className="mt-4 flex min-h-32 items-center justify-center">
					<PageEmptyState message={emptyMessage} />
				</div>
			)}
		</div>
	);
}
