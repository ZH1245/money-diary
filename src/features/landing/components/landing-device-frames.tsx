/**
 * Browser and phone frames for landing-page screenshot mockups.
 */

import {
	getLandingDesktopSizes,
	getLandingPhoneSizes,
	LANDING_SCREENSHOT_DIMENSIONS,
} from "./landing-screenshots";

export function BrowserFrame({
	urlLabel,
	image,
	alt,
}: {
	urlLabel: string;
	image: string;
	alt: string;
}) {
	return (
		<div className="overflow-hidden rounded-panel border border-border bg-panel shadow-xl">
			<div className="flex items-center gap-3 border-b border-border bg-canvas px-4 py-2.5">
				<div className="flex shrink-0 items-center gap-1.5">
					<span className="block size-2.5 rounded-full bg-expense/80" />
					<span className="block size-2.5 rounded-full bg-[#c9952f]/80" />
					<span className="block size-2.5 rounded-full bg-income/80" />
				</div>
				<div className="flex min-w-0 flex-1 justify-center">
					<span className="max-w-[260px] truncate rounded-full border border-border bg-input-bg px-3 py-0.5 text-[11px] text-foreground/70">
						{urlLabel}
					</span>
				</div>
			</div>
			<img
				src={image}
				alt={alt}
				className="block w-full bg-canvas"
				width={LANDING_SCREENSHOT_DIMENSIONS.desktop.width}
				height={LANDING_SCREENSHOT_DIMENSIONS.desktop.height}
				sizes={getLandingDesktopSizes()}
				loading="lazy"
				decoding="async"
			/>
		</div>
	);
}

export function PhoneFrame({
	image,
	alt,
}: {
	image: string;
	alt: string;
}) {
	return (
		<div className="mx-auto w-full max-w-[280px]">
			<div className="overflow-hidden rounded-[2.2rem] border-[5px] border-border bg-panel shadow-xl ring-1 ring-black/10">
				<div className="relative flex justify-center bg-canvas pb-1 pt-2">
					<div className="h-1.5 w-12 rounded-full bg-border" />
				</div>
				<img
					src={image}
					alt={alt}
					className="block w-full bg-canvas"
					width={LANDING_SCREENSHOT_DIMENSIONS.mobile.width}
					height={LANDING_SCREENSHOT_DIMENSIONS.mobile.height}
					sizes={getLandingPhoneSizes()}
					loading="lazy"
					decoding="async"
				/>
				<div className="flex justify-center bg-canvas pb-2 pt-0.5">
					<div className="h-1 w-10 rounded-full bg-border" />
				</div>
			</div>
		</div>
	);
}
