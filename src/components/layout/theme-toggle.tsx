import { Moon, Sun } from "lucide-react";
import { useTheme } from "#/components/layout/theme-provider";
import { toolbarExpandableButtonClass } from "#/components/layout/toolbar-control-styles";
import { ToolbarTooltip } from "#/components/layout/toolbar-tooltip";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";

/**
 * Toggles persisted light/dark mode. Backed by the app-wide ThemeProvider.
 */
export function ThemeToggle() {
	const { isDark, toggleMode } = useTheme();

	const tooltipLabel = isDark ? "Switch to light mode" : "Switch to dark mode";

	return (
		<ToolbarTooltip label={tooltipLabel}>
			<Button
				type="button"
				variant="ghost"
				className={toolbarExpandableButtonClass}
				onClick={toggleMode}
				aria-label={tooltipLabel}
			>
				{isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
				<span className="hidden xl:inline">{isDark ? "Light" : "Dark"}</span>
			</Button>
		</ToolbarTooltip>
	);
}

/** Display names for the two color palettes (internal values stay c/a). */
const PALETTE_LABELS = {
	c: "Calm",
	a: "Aurora",
} as const;

/**
 * Segmented control to switch between the Calm (default, green) and Aurora
 * (indigo) color palettes.
 */
export function ThemePaletteToggle({ className }: { className?: string }) {
	const { palette, setPalette } = useTheme();

	return (
		<div
			className={cn(
				"inline-flex items-center gap-0.5 rounded-full border border-border p-0.5",
				className,
			)}
		>
			{(["c", "a"] as const).map((value) => {
				const active = palette === value;
				return (
					<button
						key={value}
						type="button"
						onClick={() => setPalette(value)}
						aria-pressed={active}
						className={cn(
							"rounded-full px-3 py-1 text-[11px] font-bold transition-colors",
							active
								? "bg-foreground text-canvas"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{PALETTE_LABELS[value]}
					</button>
				);
			})}
		</div>
	);
}

/**
 * Combined palette (C/A) + light/dark control, for use in sidebar/menu footers.
 */
export function ThemeControls({ className }: { className?: string }) {
	const { isDark, toggleMode } = useTheme();

	return (
		<div className={cn("flex items-center justify-between gap-2", className)}>
			<ThemePaletteToggle />
			<button
				type="button"
				onClick={toggleMode}
				aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
				className="inline-flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
			>
				{isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
			</button>
		</div>
	);
}
