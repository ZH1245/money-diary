import { useMemo } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { PageEmptyState } from "#/components/feedback/page-state";
import { SensitiveText } from "#/components/privacy/sensitive-text";
import {
	buildSavingsByGoalBreakdown,
	buildSavingsTrendSeries,
} from "#/features/savings/utils/savings-analytics";
import type { SavingDto } from "#/features/savings/types/saving";
import type { GoalDto } from "#/features/goals/types/goal";
import { chartColors } from "#/lib/chart-colors";
import {
	formatSensitiveCompactAmount,
	formatSensitiveCurrency,
	usePrivacyModeEnabled,
} from "#/lib/privacy/sensitive-format";

interface SavingsAnalyticsSectionProps {
	userCurrency: string;
	savings: SavingDto[];
	goals: GoalDto[];
	dateRangeFrom: string;
	dateRangeTo: string;
}

const tooltipStyle = {
	background: "var(--panel)",
	border: "1px solid var(--border)",
	borderRadius: 12,
	fontSize: 12,
	color: "var(--fg)",
} as const;

/**
 * Savings analytics: deposits vs withdrawals trend and by-goal breakdown.
 */
export function SavingsAnalyticsSection({
	userCurrency,
	savings,
	goals,
	dateRangeFrom,
	dateRangeTo,
}: SavingsAnalyticsSectionProps) {
	const currency = userCurrency.toUpperCase();
	const isPrivacyMode = usePrivacyModeEnabled();

	const trendData = useMemo(
		() => buildSavingsTrendSeries(savings, dateRangeFrom, dateRangeTo),
		[savings, dateRangeFrom, dateRangeTo],
	);
	const goalBreakdown = useMemo(
		() => buildSavingsByGoalBreakdown(savings, goals),
		[savings, goals],
	);

	const hasTrend = trendData.some(
		(point) => point.deposits > 0 || point.withdrawals > 0,
	);
	const breakdownTotal = goalBreakdown.reduce((sum, row) => sum + row.amount, 0);

	if (!hasTrend && goalBreakdown.length === 0) {
		return null;
	}

	return (
		<div className="mt-6 grid gap-4 lg:grid-cols-2">
			<div className="bg-panel rounded-panel border border-border p-[22px] shadow-sm">
				<p className="text-sm font-semibold text-foreground">
					Deposits vs withdrawals
				</p>
				<p className="mt-1 text-xs text-muted-foreground">
					Savings flow in the selected date range
				</p>
				<div className="mt-5 h-56">
					{hasTrend ? (
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={trendData} barGap={6} barCategoryGap="28%">
								<CartesianGrid
									strokeDasharray="3 3"
									vertical={false}
									stroke="var(--border)"
								/>
								<XAxis
									dataKey="label"
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
										String(name) === "deposits" ? "Deposits" : "Withdrawals",
									]}
								/>
								<Bar
									dataKey="deposits"
									radius={[6, 6, 0, 0]}
									fill="var(--income)"
									maxBarSize={26}
								/>
								<Bar
									dataKey="withdrawals"
									radius={[6, 6, 0, 0]}
									fill="var(--expense)"
									maxBarSize={26}
								/>
							</BarChart>
						</ResponsiveContainer>
					) : (
						<div className="flex h-full items-center justify-center">
							<PageEmptyState message="No savings activity in this range." />
						</div>
					)}
				</div>
			</div>

			<div className="bg-panel rounded-panel border border-border p-[22px] shadow-sm">
				<p className="text-sm font-semibold text-foreground">By goal</p>
				<p className="mt-1 text-xs text-muted-foreground">
					Net savings linked to each goal in this range
				</p>
				{goalBreakdown.length ? (
					<ul className="mt-4 space-y-3">
						{goalBreakdown.map((row, index) => {
							const share =
								breakdownTotal > 0 ? (row.amount / breakdownTotal) * 100 : 0;
							const color = chartColors.series[index % chartColors.series.length];

							return (
								<li key={row.goalId ?? "general"}>
									<div className="flex items-center justify-between gap-3 text-sm">
										<SensitiveText
											text={row.label}
											className="min-w-0 truncate font-medium text-foreground"
										/>
										<span className="font-num shrink-0 font-bold tabular-nums text-foreground">
											{formatSensitiveCurrency(
												row.amount,
												currency,
												isPrivacyMode,
											)}
										</span>
									</div>
									<div className="mt-1.5 flex items-center gap-2">
										<div className="bg-track h-2 flex-1 overflow-hidden rounded-full">
											<div
												className="h-full rounded-full"
												style={{ width: `${share}%`, backgroundColor: color }}
											/>
										</div>
										<span className="font-num w-10 text-right text-xs tabular-nums text-muted-foreground">
											{share.toFixed(0)}%
										</span>
									</div>
								</li>
							);
						})}
					</ul>
				) : (
					<div className="mt-4 flex min-h-40 items-center justify-center">
						<PageEmptyState message="No goal-linked savings in this range." />
					</div>
				)}
			</div>
		</div>
	);
}
