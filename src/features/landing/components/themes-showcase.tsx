import { Check, Palette } from "lucide-react";
import { useState } from "react";
import { useTheme } from "#/components/layout/theme-provider";
import { cn } from "#/lib/utils";
import { BrowserFrame, PhoneFrame } from "./landing-device-frames";
import { getThemeDashboardImage, LANDING_THEMES } from "./landing-themes";
import {
	ScrollReveal,
	ViewportToggle,
	type ViewportMode,
} from "./landing-ui-bits";

function ThemeScreenshotCard({
	theme,
	viewport,
	active,
	onSelect,
}: {
	theme: (typeof LANDING_THEMES)[number];
	viewport: ViewportMode;
	active: boolean;
	onSelect: () => void;
}) {
	const image = getThemeDashboardImage(theme, viewport);
	const alt = `Money Diary dashboard — ${theme.name} ${theme.modeLabel} theme`;

	return (
		<button
			type="button"
			onClick={onSelect}
			aria-pressed={active}
			className={cn(
				"group block w-full overflow-hidden rounded-panel border bg-card text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
				active
					? "border-primary ring-2 ring-primary/30"
					: "border-border hover:border-primary/40",
			)}
		>
			<div className="p-3 sm:p-4">
				{viewport === "desktop" ? (
					<BrowserFrame
						urlLabel="moneydiary.app/dashboard"
						image={image}
						alt={alt}
					/>
				) : (
					<PhoneFrame image={image} alt={alt} />
				)}
			</div>

			<div className="flex items-center justify-between border-t border-border px-4 py-3">
				<div>
					<p className="text-sm font-semibold text-foreground">
						{theme.name}
						<span className="font-normal text-muted-foreground">
							{" "}
							· {theme.modeLabel}
						</span>
					</p>
					<p className="mt-0.5 text-xs text-muted-foreground">
						{theme.description}
					</p>
				</div>
				{active ? (
					<span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
						<Check className="size-3" />
						Active
					</span>
				) : (
					<span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
						Try it
					</span>
				)}
			</div>
		</button>
	);
}

/**
 * Theme gallery — real dashboard screenshots for every palette × mode.
 * Tapping a card applies that theme live across the landing page.
 */
export function ThemesShowcase() {
	const { palette, mode, setPalette, setMode } = useTheme();
	const [viewport, setViewport] = useState<ViewportMode>("desktop");

	return (
		<section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
			<div className="mb-12 text-center">
				<span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1 text-xs font-semibold text-muted-foreground">
					<Palette className="size-3.5 text-primary" />
					Personalization
				</span>
				<h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
					Make it yours
				</h2>
				<p className="mx-auto mt-3 max-w-lg text-muted-foreground">
					Two hand-crafted palettes — Calm and Aurora — each in light and dark.
					<span className="font-medium text-foreground">
						{" "}
						Tap any theme to preview it live
					</span>{" "}
					across this page.
				</p>
				<div className="mt-6 flex justify-center">
					<ViewportToggle mode={viewport} onChange={setViewport} />
				</div>
			</div>

			<ScrollReveal>
				<div className="grid gap-6 sm:grid-cols-2">
					{LANDING_THEMES.map((theme) => (
						<ThemeScreenshotCard
							key={theme.id}
							theme={theme}
							viewport={viewport}
							active={
								palette === theme.palette && mode === theme.themeMode
							}
							onSelect={() => {
								setPalette(theme.palette);
								setMode(theme.themeMode);
							}}
						/>
					))}
				</div>
			</ScrollReveal>
		</section>
	);
}
