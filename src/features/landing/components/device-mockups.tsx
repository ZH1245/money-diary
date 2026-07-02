/**
 * Landing hero device frames — dashboard screenshot follows the active theme.
 *
 * Single desktop image (LCP) with phone mockup stacked on mobile or
 * overlapping bottom-right on sm+.
 */

import { useTheme } from "#/components/layout/theme-provider";
import {
	buildThemedScreenshotSrcSet,
	getLandingDesktopSizes,
	getLandingPhoneSizes,
	LANDING_SCREENSHOT_DIMENSIONS,
	useThemedScreenshot,
} from "./landing-screenshots";

function BrowserChrome() {
	return (
		<div className="flex items-center gap-3 border-b border-border bg-canvas px-4 py-2.5">
			<div className="flex shrink-0 items-center gap-1.5">
				<span className="block size-2.5 rounded-full bg-expense/80" />
				<span className="block size-2.5 rounded-full bg-[#c9952f]/80" />
				<span className="block size-2.5 rounded-full bg-income/80" />
			</div>
			<div className="flex min-w-0 flex-1 justify-center">
				<span className="max-w-[220px] truncate rounded-full border border-border bg-input-bg px-3 py-0.5 text-[11px] text-foreground/70">
					moneydiary.app/dashboard
				</span>
			</div>
		</div>
	);
}

export function DeviceMockups() {
	const { palette, mode } = useTheme();
	const desktopImage = useThemedScreenshot("dashboard", "desktop");
	const mobileImage = useThemedScreenshot("dashboard", "mobile");
	const themeKey = `${palette}-${mode}`;
	const desktopDims = LANDING_SCREENSHOT_DIMENSIONS.desktop;
	const mobileDims = LANDING_SCREENSHOT_DIMENSIONS.mobile;

	return (
		<div className="mx-auto w-full max-w-5xl">
			<div className="relative flex flex-col items-center gap-6 sm:block">
				<div className="w-full overflow-hidden rounded-panel border border-border bg-panel shadow-2xl">
					<BrowserChrome />
					<img
						key={`desktop-${themeKey}`}
						src={desktopImage}
						srcSet={buildThemedScreenshotSrcSet(desktopImage)}
						alt="Money Diary dashboard on desktop — demo balances"
						className="block w-full bg-canvas transition-opacity duration-300"
						width={desktopDims.width}
						height={desktopDims.height}
						sizes={getLandingDesktopSizes()}
						loading="eager"
						fetchPriority="high"
						decoding="async"
					/>
				</div>

				<div className="w-[210px] drop-shadow-2xl sm:absolute sm:-bottom-10 sm:right-6 sm:z-10 sm:w-[150px] lg:w-[185px]">
					<div className="overflow-hidden rounded-[2.2rem] border-[5px] border-border bg-panel shadow-2xl ring-1 ring-black/10 sm:rounded-[2rem] sm:border-[4px] sm:ring-black/15">
						<div className="relative flex justify-center bg-canvas pb-1 pt-2">
							<div className="h-1.5 w-12 rounded-full bg-border sm:w-10" />
						</div>
						<img
							key={`mobile-${themeKey}`}
							src={mobileImage}
							srcSet={buildThemedScreenshotSrcSet(mobileImage)}
							alt="Money Diary dashboard on mobile — demo balances"
							className="block w-full bg-canvas transition-opacity duration-300"
							width={mobileDims.width}
							height={mobileDims.height}
							sizes={getLandingPhoneSizes()}
							loading="lazy"
							decoding="async"
						/>
						<div className="flex justify-center bg-canvas pb-2 pt-0.5">
							<div className="h-1 w-10 rounded-full bg-border sm:w-8" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
