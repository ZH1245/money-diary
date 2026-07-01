import { SensitiveText } from "#/components/privacy/sensitive-text";
import type { AnalyticsInsightRow } from "#/features/analytics/utils/analytics-stats";
import { formatSensitiveCurrency } from "#/lib/privacy/sensitive-format";

interface InsightTableProps {
	title: string;
	description?: string;
	rows: AnalyticsInsightRow[];
	currency: string;
	colors: string[];
	isPrivacyMode: boolean;
}

/** Ranked insight list with share bars for analytics breakdowns. */
export function InsightTable({
	title,
	description,
	rows,
	currency,
	colors,
	isPrivacyMode,
}: InsightTableProps) {
	const total = rows.reduce((sum, row) => sum + row.amount, 0);

	return (
		<div className="bg-panel rounded-panel border border-border p-[22px] shadow-sm">
			<p className="text-sm font-semibold text-foreground">{title}</p>
			{description ? (
				<p className="mt-1 text-xs text-muted-foreground">{description}</p>
			) : null}
			{rows.length ? (
				<ul className="mt-4 space-y-3">
					{rows.map((row, index) => {
						const share = total > 0 ? (row.amount / total) * 100 : 0;
						const color = colors[index % colors.length];

						return (
							<li key={row.label}>
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
				<p className="mt-3 text-sm text-muted-foreground">No data yet.</p>
			)}
		</div>
	);
}
