import type { ThemeMode, ThemePalette } from "#/components/layout/theme-provider";
import { getThemedScreenshotPath } from "./landing-screenshots";

export interface LandingTheme {
	id: string;
	name: string;
	modeLabel: string;
	palette: ThemePalette;
	themeMode: ThemeMode;
	description: string;
}

/** Palette × mode variants shown in the themes gallery. */
export const LANDING_THEMES: LandingTheme[] = [
	{
		id: "calm-light",
		name: "Calm",
		modeLabel: "Light",
		palette: "c",
		themeMode: "light",
		description: "Warm greens and soft neutrals — relaxed and readable.",
	},
	{
		id: "calm-dark",
		name: "Calm",
		modeLabel: "Dark",
		palette: "c",
		themeMode: "dark",
		description: "Deep forest tones with bright income accents for night use.",
	},
	{
		id: "aurora-light",
		name: "Aurora",
		modeLabel: "Light",
		palette: "a",
		themeMode: "light",
		description: "Crisp indigo highlights on a clean, modern light canvas.",
	},
	{
		id: "aurora-dark",
		name: "Aurora",
		modeLabel: "Dark",
		palette: "a",
		themeMode: "dark",
		description: "Violet accents and deep panels — polished dark mode.",
	},
];

/** Dashboard screenshot for a specific palette × mode. */
export function getThemeDashboardImage(
	theme: LandingTheme,
	viewport: "desktop" | "mobile",
): string {
	return getThemedScreenshotPath(
		"dashboard",
		viewport,
		theme.palette,
		theme.themeMode,
	);
}
