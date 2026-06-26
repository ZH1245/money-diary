import { SensitiveText } from "#/components/privacy/sensitive-text";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "#/components/ui/tooltip";

interface InsightMiniCardProps {
	icon: React.ReactNode;
	label: string;
	value: string;
	isSensitive?: boolean;
	/** Optional explanation shown on hover/focus. */
	tooltip?: string;
}

/** Compact stat tile used on the dashboard balance card. */
export function InsightMiniCard({
	icon,
	label,
	value,
	isSensitive = false,
	tooltip,
}: InsightMiniCardProps) {
	const card = (
		<div className="md-stat min-w-0">
			<div className="flex items-center gap-1.5 text-muted-foreground">
				<span className="shrink-0">{icon}</span>
				<p className="truncate text-[0.6rem] font-medium uppercase tracking-wide sm:text-xs">
					{label}
				</p>
			</div>
			<p className="mt-1.5 truncate font-num text-base font-extrabold leading-tight tracking-tight tabular-nums text-foreground sm:mt-2 sm:text-lg">
				{isSensitive ? <SensitiveText text={value} /> : value}
			</p>
		</div>
	);

	if (!tooltip) return card;

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button type="button" className="block w-full text-left">
					{card}
				</button>
			</TooltipTrigger>
			<TooltipContent>{tooltip}</TooltipContent>
		</Tooltip>
	);
}
