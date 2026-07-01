import { Link } from "@tanstack/react-router";
import { ArrowRight, PiggyBank, Target, Wallet } from "lucide-react";
import { useMemo } from "react";
import { SensitiveText } from "#/components/privacy/sensitive-text";
import { buildWealthGoalSummary } from "#/features/analytics/utils/wealth-summary";
import type { RangeSavingsRate } from "#/features/analytics/utils/analytics-stats";
import type { GoalDto } from "#/features/goals/types/goal";
import type { SavingDto } from "#/features/savings/types/saving";
import {
	formatSensitiveCurrency,
	usePrivacyModeEnabled,
} from "#/lib/privacy/sensitive-format";

interface AnalyticsWealthSectionProps {
	userCurrency: string;
	netWorth: number;
	savingsRate: RangeSavingsRate;
	goals: GoalDto[];
	savings: SavingDto[];
}

/**
 * Compact wealth rollup on Analytics: net worth, savings rate, and goals summary.
 */
export function AnalyticsWealthSection({
	userCurrency,
	netWorth,
	savingsRate,
	goals,
	savings,
}: AnalyticsWealthSectionProps) {
	const currency = userCurrency.toUpperCase();
	const isPrivacyMode = usePrivacyModeEnabled();

	const goalSummary = useMemo(
		() => buildWealthGoalSummary(goals, savings),
		[goals, savings],
	);

	return (
		<div className="bg-panel rounded-panel border border-border p-[22px] shadow-sm">
			<p className="text-sm font-semibold text-foreground">Wealth</p>
			<p className="mt-1 text-xs text-muted-foreground">
				Your overall position and progress toward goals
			</p>
			<div className="mt-4 grid gap-3 sm:grid-cols-3">
				<WealthTile
					icon={<Wallet className="size-4" />}
					label="Net worth"
					value={formatSensitiveCurrency(netWorth, currency, isPrivacyMode)}
					hint="Accounts plus savings ledger"
					isSensitive
				/>
				<WealthTile
					icon={<PiggyBank className="size-4" />}
					label="Savings rate"
					value={`${savingsRate.percent.toFixed(0)}%`}
					hint={savingsRate.hint}
				/>
				<WealthTile
					icon={<Target className="size-4" />}
					label="Goals"
					value={
						goalSummary.activeCount > 0
							? `${goalSummary.overallPercent.toFixed(0)}%`
							: "—"
					}
					hint={
						goalSummary.activeCount > 0
							? `${goalSummary.activeCount} active · ${formatSensitiveCurrency(goalSummary.totalAchieved, currency, isPrivacyMode)} saved`
							: "No active goals"
					}
					isSensitive={goalSummary.activeCount > 0}
				/>
			</div>
			{goalSummary.activeCount > 0 ? (
				<Link
					to="/goals"
					className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
				>
					View goals
					<ArrowRight className="size-4" />
				</Link>
			) : null}
		</div>
	);
}

interface WealthTileProps {
	icon: React.ReactNode;
	label: string;
	value: string;
	hint: string;
	isSensitive?: boolean;
}

function WealthTile({
	icon,
	label,
	value,
	hint,
	isSensitive = false,
}: WealthTileProps) {
	return (
		<div className="rounded-panel border border-border-faint bg-input-bg px-3 py-3">
			<div className="flex items-center gap-2 text-muted-foreground">
				<span className="bg-soft-accent text-primary flex size-7 items-center justify-center rounded-full">
					{icon}
				</span>
				<p className="text-xs font-medium uppercase tracking-wide">{label}</p>
			</div>
			<p className="font-num mt-3 text-xl font-extrabold tracking-tight tabular-nums text-foreground">
				{isSensitive ? <SensitiveText text={value} /> : value}
			</p>
			<p className="mt-1 text-xs text-muted-foreground">{hint}</p>
		</div>
	);
}
