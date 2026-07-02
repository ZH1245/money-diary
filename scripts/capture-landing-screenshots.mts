/**
 * Captures landing-page screenshots from the demo user (fictional PKR data).
 *
 * Every feature is captured in all four palette × mode combinations so the
 * landing page can swap images reactively when the visitor changes theme.
 *
 * Prereqs:
 *   pnpm dev
 *   pnpm seed:demo
 *
 * Usage:
 *   pnpm capture:landing
 *   HEADLESS=1 pnpm capture:landing
 */
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type LaunchOptions, type Page } from "playwright";

const BASE_URL = process.env.LANDING_SHOT_URL ?? "http://localhost:3000";
const DEMO_EMAIL = "demo@moneydiary.app";
const DEMO_PASSWORD = "Demo@Money2026";
const HEADLESS = process.env.HEADLESS === "1";
const PRIVACY_STORAGE_KEY = "money-diary-privacy-mode";
const PALETTE_KEY = "md-theme";
const MODE_KEY = "md-mode";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../public/landing");

interface ViewportSpec {
	slug: "desktop" | "mobile";
	width: number;
	height: number;
}

interface ThemeSpec {
	slug: string;
	palette: "c" | "a";
	mode: "light" | "dark";
}

interface FeatureSpec {
	id: string;
	prepareDesktop: (page: Page) => Promise<void>;
	prepareMobile: (page: Page) => Promise<void>;
}

/** Full viewport — no clip crop so bottom nav / shell chrome stay visible. */
const VIEWPORTS: ViewportSpec[] = [
	{ slug: "desktop", width: 1280, height: 800 },
	{ slug: "mobile", width: 390, height: 844 },
];

const THEMES: ThemeSpec[] = [
	{ slug: "calm-light", palette: "c", mode: "light" },
	{ slug: "calm-dark", palette: "c", mode: "dark" },
	{ slug: "aurora-light", palette: "a", mode: "light" },
	{ slug: "aurora-dark", palette: "a", mode: "dark" },
];

function getBrowserLaunchOptions(): LaunchOptions {
	const options: LaunchOptions = {
		headless: HEADLESS,
		slowMo: HEADLESS ? 0 : 80,
	};

	if (process.platform === "darwin") {
		options.executablePath =
			"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
	} else {
		options.channel = "chrome";
	}

	return options;
}

async function hideDevtools(page: Page) {
	await page.addStyleTag({
		content: `
      button[aria-label*="TanStack"],
      button[title*="TanStack"],
      .tsqd-open-btn-container,
      .tsqd-parent-container {
        display: none !important;
        visibility: hidden !important;
      }
    `,
	});
}

async function signInAsDemo(page: Page) {
	const response = await page.request.post(
		`${BASE_URL}/api/auth/sign-in/email`,
		{
			data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
		},
	);

	if (!response.ok()) {
		throw new Error(
			`Sign-in failed (${response.status()}): ${await response.text()}`,
		);
	}

	console.log(`Signed in as ${DEMO_EMAIL}`);
}

async function waitForNoSkeletons(page: Page) {
	await page.waitForFunction(
		() => document.querySelectorAll('[data-slot="skeleton"]').length === 0,
		undefined,
		{ timeout: 60_000 },
	);
}

async function applyTheme(
	page: Page,
	palette: "c" | "a",
	mode: "light" | "dark",
) {
	await page.evaluate(
		({ palette, mode, paletteKey, modeKey }) => {
			localStorage.setItem(paletteKey, palette);
			localStorage.setItem(modeKey, mode);
			document.documentElement.setAttribute("data-theme", palette);
			document.documentElement.classList.toggle("dark", mode === "dark");
		},
		{ palette, mode, paletteKey: PALETTE_KEY, modeKey: MODE_KEY },
	);
}

async function collapseSidebarIfVisible(page: Page) {
	const collapseBtn = page.getByRole("button", { name: /collapse sidebar/i });
	if (await collapseBtn.isVisible().catch(() => false)) {
		await collapseBtn.click();
	}
}

async function prepareDashboardDesktop(page: Page) {
	await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
	await page.getByText("Net balance", { exact: false }).first().waitFor({
		state: "visible",
		timeout: 60_000,
	});
	await waitForNoSkeletons(page);
	await page.getByText("Recent activity").waitFor({
		state: "visible",
		timeout: 60_000,
	});
	await collapseSidebarIfVisible(page);
	await page.waitForTimeout(600);
}

async function prepareDashboardMobile(page: Page) {
	await prepareDashboardDesktop(page);
}

/**
 * Loads the dashboard with privacy mode ON so balances render masked.
 * Toggles privacy via the UI (not localStorage) — a reload re-runs
 * addInitScript which would reset the stored flag back to 'false'.
 */
async function preparePrivacyDashboard(page: Page) {
	await prepareDashboardDesktop(page);
	// Privacy is OFF here (addInitScript set the flag to 'false'); the toggle's
	// label in that state is "Hide amounts and titles". Click it to mask live.
	await page
		.getByRole("button", { name: "Hide amounts and titles" })
		.click();
	await page.waitForTimeout(400);
}

async function prepareAiDesktop(page: Page) {
	await prepareDashboardDesktop(page);
	await page.getByRole("button", { name: "Open AI assistant" }).click();
	await page.getByText("How can I help?", { exact: false }).waitFor({
		state: "visible",
		timeout: 15_000,
	});
	await page.waitForTimeout(400);
}

async function prepareAiMobile(page: Page) {
	await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
	await page.getByText("Net balance", { exact: false }).first().waitFor({
		state: "visible",
		timeout: 60_000,
	});
	await waitForNoSkeletons(page);
	await page.getByRole("button", { name: "Open AI assistant" }).click();
	await page.getByText("How can I help?", { exact: false }).waitFor({
		state: "visible",
		timeout: 15_000,
	});
	await page.waitForTimeout(400);
}

async function prepareRoute(
	page: Page,
	route: string,
	heading: string | RegExp,
	readyText: string | RegExp,
) {
	await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
	await page.getByRole("heading", { name: heading }).first().waitFor({
		state: "visible",
		timeout: 60_000,
	});
	await waitForNoSkeletons(page);
	await page.getByText(readyText).first().waitFor({
		state: "visible",
		timeout: 60_000,
	});
	await collapseSidebarIfVisible(page);
	await page.waitForTimeout(400);
}

const FEATURES: FeatureSpec[] = [
	{
		id: "dashboard",
		prepareDesktop: prepareDashboardDesktop,
		prepareMobile: prepareDashboardMobile,
	},
	{
		id: "ai-assistant",
		prepareDesktop: prepareAiDesktop,
		prepareMobile: prepareAiMobile,
	},
	{
		id: "analytics",
		prepareDesktop: (page) =>
			prepareRoute(page, "/analytics", /analytics/i, /Income vs spending/i),
		prepareMobile: (page) =>
			prepareRoute(page, "/analytics", /analytics/i, /Income vs spending/i),
	},
	{
		id: "transactions",
		prepareDesktop: (page) =>
			prepareRoute(page, "/transactions", /transactions/i, /Flow by type/i),
		prepareMobile: (page) =>
			prepareRoute(page, "/transactions", /transactions/i, /Flow by type/i),
	},
	{
		id: "accounts",
		prepareDesktop: (page) =>
			prepareRoute(page, "/accounts", "Cards & accounts", /NayaPay|Meezan/i),
		prepareMobile: (page) =>
			prepareRoute(page, "/accounts", "Cards & accounts", /NayaPay|Meezan/i),
	},
	{
		id: "privacy",
		prepareDesktop: preparePrivacyDashboard,
		prepareMobile: preparePrivacyDashboard,
	},
];

async function main() {
	await mkdir(OUT_DIR, { recursive: true });

	console.log(
		HEADLESS ? "Launching headless browser…" : "Launching Brave (visible)…",
	);

	const browser = await chromium.launch(getBrowserLaunchOptions());
	const context = await browser.newContext({ deviceScaleFactor: 1 });

	await context.addInitScript(
		({ storageKey }) => {
			localStorage.setItem(storageKey, "false");
		},
		{ storageKey: PRIVACY_STORAGE_KEY },
	);

	const page = await context.newPage();
	await signInAsDemo(page);
	await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
	await hideDevtools(page);

	let shotCount = 0;

	for (const theme of THEMES) {
		console.log(`\nTheme: ${theme.slug}`);
		await applyTheme(page, theme.palette, theme.mode);

		for (const feature of FEATURES) {
			for (const viewport of VIEWPORTS) {
				const filename = `${feature.id}-${viewport.slug}-${theme.slug}.webp`;
				console.log(`  ${filename}`);

				await page.setViewportSize({
					width: viewport.width,
					height: viewport.height,
				});

				const prepare =
					viewport.slug === "desktop"
						? feature.prepareDesktop
						: feature.prepareMobile;

				await prepare(page);
				await hideDevtools(page);
				await page.screenshot({
					path: join(OUT_DIR, filename),
					fullPage: false,
					type: "webp",
					quality: 82,
				});
				shotCount += 1;
			}
		}
	}

	if (!HEADLESS) {
		console.log("\nDone — closing browser in 2s…");
		await page.waitForTimeout(2000);
	}

	await browser.close();
	console.log(`\nSaved ${shotCount} screenshots to ${OUT_DIR}`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
