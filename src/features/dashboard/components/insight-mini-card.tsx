import { SensitiveText } from "#/components/privacy/sensitive-text";

interface InsightMiniCardProps {
	icon: React.ReactNode;
	label: string;
	value: string;
	isSensitive?: boolean;
}

/** Compact stat tile used on the dashboard balance card. */
export function InsightMiniCard({
	icon,
	label,
	value,
	isSensitive = false,
}: InsightMiniCardProps) {
	return (
		<div className="md-stat min-w-0">
			<div className="flex items-center gap-1.5 text-muted-foreground">
				<span className="shrink-0">{icon}</span>
				<p className="truncate text-[0.6rem] font-medium uppercase tracking-wide sm:text-xs">
					{label}
				</p>
			</div>
			<p className="mt-1.5 break-words font-num text-base font-extrabold leading-tight tracking-tight tabular-nums text-foreground sm:mt-2 sm:text-lg">
				{isSensitive ? <SensitiveText text={value} /> : value}
			</p>
		</div>
	);
}
