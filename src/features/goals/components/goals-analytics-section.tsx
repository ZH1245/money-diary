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
import { SensitiveText } from "#/components/privacy/sensitive-text";
import type { GoalDto } from "#/features/goals/types/goal";
import {
	buildGoalPaceSummary,
	buildGoalProgressChartRows,
	type GoalPaceStatus,
} from "#/features/goals/utils/goals-analytics";
import { buildLinkedSavingsByGoalId } from "#/features/goals/utils/goal-progress";
import type { SavingDto } from "#/features/savings/types/saving";
import {
	formatSensitiveCurrency,
	usePrivacyModeEnabled,
} from "#/lib/privacy/sensitive-format";
import { cn } from "#/lib/utils";

interface GoalsAnalyticsSectionProps {
	userCurrency: string;
	goals: GoalDto[];
	savings: SavingDto[];
}

const tooltipStyle = {
	background: "var(--panel)",
	border: "1px solid var(--border)",
	borderRadius: 12,
	fontSize: 12,
	color: "var(--fg)",
} as const;

const PACE_LABELS: Record<GoalPaceStatus, string> = {
	completed: "Completed",
	on_track: "On track",
	behind: "Behind",
	in_progress: "In progress",
};

/**
 * Goals analytics: progress bars and on-track vs behind summary.
 */
export function GoalsAnalyticsSection({
	userCurrency,
	goals,
	savings,
}: GoalsAnalyticsSectionProps) {
	const currency = userCurrency.toUpperCase();
	const isPrivacyMode = usePrivacyModeEnabled();

	const linkedSavingsByGoalId = useMemo(
		() => buildLinkedSavingsByGoalId(savings),
		[savings],
	);
	const progressRows = useMemo(
		() => buildGoalProgressChartRows(goals, linkedSavingsByGoalId),
		[goals, linkedSavingsByGoalId],
	);
	const paceSummary = useMemo(
		() => buildGoalPaceSummary(progressRows),
		[progressRows],
	);

	if (progressRows.length === 0) {
		return null;
	}

	return (
		<div className="mt-6 bg-panel rounded-panel border border-border p-[22px] shadow-sm">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p className="text-sm font-semibold text-foreground">Goal progress</p>
					<p className="mt-1 text-xs text-muted-foreground">
						Active goals — combined logged progress and linked savings
					</p>
				</div>
				<div className="flex flex-wrap gap-2 text-xs">
					<PaceBadge label="On track" count={paceSummary.onTrack} tone="income" />
					<PaceBadge label="Behind" count={paceSummary.behind} tone="expense" />
					<PaceBadge
						label="In progress"
						count={paceSummary.inProgress}
						tone="muted"
					/>
				</div>
			</div>

			<div className="mt-5 h-64">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart
						data={progressRows}
						layout="vertical"
						margin={{ left: 8, right: 12 }}
					>
						<CartesianGrid
							strokeDasharray="3 3"
							horizontal={false}
							stroke="var(--border)"
						/>
						<XAxis
							type="number"
							domain={[0, 100]}
							tick={{ fontSize: 11, fill: "var(--muted)" }}
							tickFormatter={(value) => `${value}%`}
						/>
						<YAxis
							type="category"
							dataKey="title"
							width={110}
							tick={{ fontSize: 11, fill: "var(--muted)" }}
							tickFormatter={(value) =>
								String(value).length > 14
									? `${String(value).slice(0, 14)}…`
									: String(value)
							}
						/>
						<Tooltip
							contentStyle={tooltipStyle}
							cursor={{ fill: "var(--row-hover)" }}
							formatter={(value, _name, item) => {
								const row = item.payload as (typeof progressRows)[number];
								return [
									`${Number(value ?? 0).toFixed(0)}% · ${formatSensitiveCurrency(row.achieved, currency, isPrivacyMode)} / ${formatSensitiveCurrency(row.target, currency, isPrivacyMode)}`,
									PACE_LABELS[row.paceStatus],
								];
							}}
						/>
						<Bar
							dataKey="percent"
							radius={[0, 6, 6, 0]}
							fill="var(--primary)"
							maxBarSize={22}
						/>
					</BarChart>
				</ResponsiveContainer>
			</div>

			<ul className="mt-4 space-y-2">
				{progressRows.map((row) => (
					<li
						key={row.id}
						className="flex items-center justify-between gap-3 text-sm"
					>
						<div className="min-w-0">
							<SensitiveText
								text={row.title}
								className="truncate font-medium text-foreground"
							/>
							<p className="text-xs text-muted-foreground">
								{PACE_LABELS[row.paceStatus]}
								{row.targetDate
									? ` · due ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(row.targetDate))}`
									: ""}
							</p>
						</div>
						<span className="font-num shrink-0 font-semibold tabular-nums text-foreground">
							{row.percent.toFixed(0)}%
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}

interface PaceBadgeProps {
	label: string;
	count: number;
	tone: "income" | "expense" | "muted";
}

function PaceBadge({ label, count, tone }: PaceBadgeProps) {
	return (
		<span
			className={cn(
				"rounded-full border px-2.5 py-1 font-medium",
				tone === "income" && "border-income/30 bg-income/10 text-income",
				tone === "expense" && "border-expense/30 bg-expense/10 text-expense",
				tone === "muted" && "border-border bg-input-bg text-muted-foreground",
			)}
		>
			{label}: {count}
		</span>
	);
}
