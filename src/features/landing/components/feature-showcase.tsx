import { useState } from "react";
import { useTheme } from "#/components/layout/theme-provider";
import { cn } from "#/lib/utils";
import { BrowserFrame, PhoneFrame } from "./landing-device-frames";
import {
	LANDING_SCREENSHOTS,
	useThemedScreenshot,
} from "./landing-screenshots";
import {
	ScrollReveal,
	ViewportToggle,
	type ViewportMode,
} from "./landing-ui-bits";

/**
 * Scroll-triggered feature grid — screenshots react to the active theme.
 */
export function FeatureShowcase() {
	const [viewport, setViewport] = useState<ViewportMode>("desktop");
	const { palette, mode } = useTheme();

	return (
		<section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
			<div className="mb-12 text-center">
				<h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
					See it in action
				</h2>
				<p className="mx-auto mt-3 max-w-lg text-muted-foreground">
					Real screens from Money Diary — demo data only, so nothing personal
					ever appears on the landing page.
				</p>
				<div className="mt-6 flex justify-center">
					<ViewportToggle mode={viewport} onChange={setViewport} />
				</div>
			</div>

			<div className="flex flex-col gap-20 sm:gap-24">
				{LANDING_SCREENSHOTS.map((item, index) => (
					<FeatureShowcaseRow
						key={item.id}
						item={item}
						index={index}
						viewport={viewport}
						themeKey={`${palette}-${mode}`}
					/>
				))}
			</div>
		</section>
	);
}

function FeatureShowcaseRow({
	item,
	index,
	viewport,
	themeKey,
}: {
	item: (typeof LANDING_SCREENSHOTS)[number];
	index: number;
	viewport: ViewportMode;
	themeKey: string;
}) {
	const image = useThemedScreenshot(item.id, viewport);
	const Icon = item.icon;
	const alt = `Money Diary ${item.title} on ${viewport} — demo screenshot`;
	const reverse = index % 2 === 1;

	return (
		<ScrollReveal
			className={cn(
				"grid items-center gap-8 lg:grid-cols-2 lg:gap-12",
				reverse && "lg:[&>*:first-child]:order-2",
			)}
		>
			<div className="space-y-4">
				<span className="inline-flex size-11 items-center justify-center rounded-xl bg-soft-accent text-primary">
					<Icon className="size-5" />
				</span>
				<h3 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
					{item.title}
				</h3>
				<p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
					{item.description}
				</p>
			</div>

			<div className="min-w-0" key={themeKey}>
				{viewport === "desktop" ? (
					<BrowserFrame urlLabel={item.urlLabel} image={image} alt={alt} />
				) : (
					<PhoneFrame image={image} alt={alt} />
				)}
			</div>
		</ScrollReveal>
	);
}
