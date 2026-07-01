import { Landmark, PiggyBank, ShoppingBag, Target } from "lucide-react";
import { InsightMiniCard } from "#/features/dashboard/components/insight-mini-card";
import type { DashboardWealthStats } from "#/features/dashboard/utils/dashboard-wealth-stats";
import {
	formatSensitiveCompactAmount,
	usePrivacyModeEnabled,
} from "#/lib/privacy/sensitive-format";

interface DashboardWealthRowProps {
	userCurrency: string;
	stats: DashboardWealthStats;
}

/**
 * Compact all-time wealth tiles — same style as Income / Spent / Txns.
 */
export function DashboardWealthRow({
	userCurrency,
	stats,
}: DashboardWealthRowProps) {
	const isPrivacyMode = usePrivacyModeEnabled();

	return (
		<div className="border-t border-border-faint pt-6">
			<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
				Wealth
			</p>
			<div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
				<InsightMiniCard
					to="/savings"
					icon={<PiggyBank className="size-4 text-primary" />}
					label="Savings"
					value={formatSensitiveCompactAmount(
						stats.savings.totalSaved,
						userCurrency,
						isPrivacyMode,
					)}
					isSensitive
					tooltip="All-time savings ledger total"
				/>
				<InsightMiniCard
					to="/goals"
					icon={<Target className="size-4 text-primary" />}
					label="Goals"
					value={
						stats.goals.activeCount > 0
							? `${stats.goals.overallPercent.toFixed(0)}%`
							: "—"
					}
					isSensitive={stats.goals.activeCount > 0}
					tooltip={
						stats.goals.activeCount > 0
							? `${stats.goals.activeCount} active goals · overall progress`
							: "No active goals"
					}
				/>
				<InsightMiniCard
					to="/wishlist"
					icon={<ShoppingBag className="size-4 text-primary" />}
					label="Wishlist"
					value={
						stats.wishlist.activeCount > 0
							? `${stats.wishlist.overallPercent.toFixed(0)}%`
							: "—"
					}
					isSensitive={stats.wishlist.activeCount > 0}
					tooltip={
						stats.wishlist.activeCount > 0
							? `${stats.wishlist.activeCount} active items · overall progress`
							: "No active wishlist items"
					}
				/>
				<InsightMiniCard
					to="/analytics"
					icon={<Landmark className="size-4 text-primary" />}
					label="Net worth"
					value={formatSensitiveCompactAmount(
						stats.netWorth,
						userCurrency,
						isPrivacyMode,
					)}
					isSensitive
					tooltip="Account balances plus savings ledger"
				/>
			</div>
		</div>
	);
}
