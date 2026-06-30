/**
 * Landing hero device frames — dashboard screenshot follows the active theme.
 */

import { useTheme } from "#/components/layout/theme-provider";
import { useThemedScreenshot } from "./landing-screenshots";

function BrowserChrome() {
	return (
		<div className="flex items-center gap-3 border-b border-border bg-canvas px-4 py-2.5">
			<div className="flex shrink-0 items-center gap-1.5">
				<span className="block size-2.5 rounded-full bg-expense/80" />
				<span className="block size-2.5 rounded-full bg-[#c9952f]/80" />
				<span className="block size-2.5 rounded-full bg-income/80" />
			</div>
			<div className="flex min-w-0 flex-1 justify-center">
				<span className="max-w-[220px] truncate rounded-full border border-border bg-input-bg px-3 py-0.5 text-[11px] text-muted-foreground">
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

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 sm:flex-row sm:items-end sm:gap-6">
			<div className="w-full overflow-hidden rounded-panel border border-border bg-panel shadow-2xl sm:min-w-0 sm:flex-1">
				<BrowserChrome />
				<img
					key={`desktop-${themeKey}`}
					src={desktopImage}
					alt="Money Diary dashboard on desktop — demo balances"
					className="block w-full bg-canvas transition-opacity duration-300"
					width={1280}
					height={800}
					loading="eager"
					decoding="async"
				/>
			</div>

			<div className="mx-auto w-[210px] shrink-0 sm:mx-0 sm:w-[190px] lg:w-[215px]">
				<div className="overflow-hidden rounded-[2.2rem] border-[5px] border-border bg-panel shadow-2xl ring-1 ring-black/10">
					<div className="relative flex justify-center bg-canvas pb-1 pt-2">
						<div className="h-1.5 w-12 rounded-full bg-border" />
					</div>
					<img
						key={`mobile-${themeKey}`}
						src={mobileImage}
						alt="Money Diary dashboard on mobile — demo balances"
						className="block w-full bg-canvas transition-opacity duration-300"
						width={390}
						height={844}
						loading="eager"
						decoding="async"
					/>
					<div className="flex justify-center bg-canvas pb-2 pt-0.5">
						<div className="h-1 w-10 rounded-full bg-border" />
					</div>
				</div>
			</div>
		</div>
	);
}
