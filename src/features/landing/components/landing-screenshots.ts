import type { LucideIcon } from "lucide-react";
import {
	BarChart3,
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
 * Files follow `{feature}-{viewport}-{themeSlug}.png` — regenerate with `pnpm capture:landing`.
 */
export function getThemedScreenshotPath(
	featureId: string,
	viewport: LandingViewport,
	palette: ThemePalette,
	mode: ThemeMode,
): string {
	const slug = themeSlugFromTheme(palette, mode);
	return `/landing/${featureId}-${viewport}-${slug}.png`;
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
];
