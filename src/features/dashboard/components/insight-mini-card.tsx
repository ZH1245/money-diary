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
			<div className="flex items-center gap-2 text-muted-foreground">
				{icon}
				<p className="truncate text-[0.65rem] font-medium uppercase tracking-wide sm:text-xs">
					{label}
				</p>
			</div>
			<p className="mt-2 wrap-break-word font-num text-lg font-extrabold leading-tight tracking-tight tabular-nums text-foreground">
				{isSensitive ? <SensitiveText text={value} /> : value}
			</p>
		</div>
	);
}
