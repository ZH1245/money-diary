import type { LucideIcon } from "lucide-react";
import {
	BarChart3,
	EyeOff,
	LayoutDashboard,
	ReceiptText,
	Sparkles,
	WalletCards,
} from "lucide-react";
import type { ThemeMode, ThemePalette } from "#/components/layout/theme-provider";
import { useTheme } from "#/components/layout/theme-provider";

export type LandingThemeSlug =
	| "calm-light"
	| "calm-dark"
	| "aurora-light"
	| "aurora-dark";

export type LandingViewport = "desktop" | "mobile";

export const LANDING_SCREENSHOT_DIMENSIONS = {
	desktop: { width: 1280, height: 800 },
	mobile: { width: 390, height: 844 },
} as const;

/** Width descriptors emitted by `pnpm optimize:landing` — keep in sync with that script. */
export const LANDING_SCREENSHOT_WIDTHS = {
	desktop: [768, 1280] as const,
	mobile: [240, 390] as const,
} as const;

/** `sizes` hint for hero desktop screenshots (max content width ~1024px). */
export function getLandingDesktopSizes(): string {
	return "(max-width: 640px) 100vw, min(1024px, 80vw)";
}

/** `sizes` hint for hero phone mockup (stacked vs overlap layouts). */
export function getLandingPhoneSizes(): string {
	return "(max-width: 640px) 210px, 185px";
}

/** Max-width files omit a suffix; smaller variants use `-{width}.webp`. */
export function getThemedScreenshotPathForWidth(
	basePath: string,
	width: number,
	viewport: LandingViewport,
): string {
	const maxWidth = LANDING_SCREENSHOT_WIDTHS[viewport].at(-1);
	if (width === maxWidth) {
		return basePath;
	}
	return basePath.replace(/\.webp$/, `-${width}.webp`);
}

function viewportFromScreenshotPath(path: string): LandingViewport {
	return path.includes("-mobile-") ? "mobile" : "desktop";
}

/** Builds a `srcset` string from a canonical themed screenshot path. */
export function buildThemedScreenshotSrcSet(path: string): string {
	const viewport = viewportFromScreenshotPath(path);
	const widths = LANDING_SCREENSHOT_WIDTHS[viewport];
	return widths
		.map(
			(width) =>
				`${getThemedScreenshotPathForWidth(path, width, viewport)} ${width}w`,
		)
		.join(", ");
}

export interface LandingScreenshot {
	id: string;
	title: string;
	description: string;
	urlLabel: string;
	icon: LucideIcon;
}

/** Maps palette + mode to screenshot filename slug. */
export function themeSlugFromTheme(
	palette: ThemePalette,
	mode: ThemeMode,
): LandingThemeSlug {
	const name = palette === "c" ? "calm" : "aurora";
	return `${name}-${mode}` as LandingThemeSlug;
}

/**
 * Path for a themed landing screenshot.
 * Files follow `{feature}-{viewport}-{themeSlug}.webp` — capture with
 * `pnpm capture:landing` then `pnpm optimize:landing`.
 */
export function getThemedScreenshotPath(
	featureId: string,
	viewport: LandingViewport,
	palette: ThemePalette,
	mode: ThemeMode,
): string {
	const slug = themeSlugFromTheme(palette, mode);
	return `/landing/${featureId}-${viewport}-${slug}.webp`;
}

/** Resolves screenshot path for the active landing-page theme. */
export function useThemedScreenshot(
	featureId: string,
	viewport: LandingViewport,
): string {
	const { palette, mode } = useTheme();
	return getThemedScreenshotPath(featureId, viewport, palette, mode);
}

export const LANDING_SCREENSHOTS: LandingScreenshot[] = [
	{
		id: "dashboard",
		title: "Dashboard",
		description:
			"See balances across wallets and banks, income vs spending, upcoming bills, and recent activity at a glance.",
		urlLabel: "moneydiary.app/dashboard",
		icon: LayoutDashboard,
	},
	{
		id: "ai-assistant",
		title: "AI assistant",
		description:
			"Log transactions, ask questions, and manage goals in plain English — no forms to hunt through.",
		urlLabel: "moneydiary.app/dashboard",
		icon: Sparkles,
	},
	{
		id: "analytics",
		title: "Analytics",
		description:
			"Spot spending trends, top categories, and where your money goes over any date range.",
		urlLabel: "moneydiary.app/analytics",
		icon: BarChart3,
	},
	{
		id: "transactions",
		title: "Transactions",
		description:
			"Filter, search, and edit income and expenses with category breakdowns and quick totals.",
		urlLabel: "moneydiary.app/transactions",
		icon: ReceiptText,
	},
	{
		id: "accounts",
		title: "Cards & accounts",
		description:
			"Track NayaPay, JazzCash, bank cards, and cash — each with its own balance and brand colour.",
		urlLabel: "moneydiary.app/accounts",
		icon: WalletCards,
	},
	{
		id: "privacy",
		title: "Privacy mode",
		description:
			"Hide every balance and amount with one tap — open your finances anywhere without showing the numbers.",
		urlLabel: "moneydiary.app/dashboard",
		icon: EyeOff,
	},
];
