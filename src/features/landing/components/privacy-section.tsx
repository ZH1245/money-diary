/**
 * Landing-page Privacy section — highlights the app's one-tap balance-masking feature.
 * Uses the `privacy` screenshot entry from landing-screenshots so images react
 * to the active theme and regenerate with `pnpm capture:landing`.
 */

import { EyeOff, Lock, ShieldCheck } from "lucide-react";
import { useTheme } from "#/components/layout/theme-provider";
import { BrowserFrame, PhoneFrame } from "./landing-device-frames";
import { useThemedScreenshot } from "./landing-screenshots";
import { ScrollReveal } from "./landing-ui-bits";

const PRIVACY_POINTS = [
	{
		icon: EyeOff,
		heading: "One-tap masking",
		body: "Tap the eye icon to hide every balance and amount instantly — no settings menu needed.",
	},
	{
		icon: ShieldCheck,
		heading: "Your data stays yours",
		body: "Nothing is shared with third parties. All financial data lives in your account only.",
	},
	{
		icon: Lock,
		heading: "Persists across sessions",
		body: "Privacy mode remembers your preference so you never accidentally expose numbers on reopen.",
	},
] as const;

export function PrivacySection() {
	const { palette, mode } = useTheme();
	const themeKey = `${palette}-${mode}`;
	const desktopImage = useThemedScreenshot("privacy", "desktop");
	const mobileImage = useThemedScreenshot("privacy", "mobile");

	return (
		<section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
			<ScrollReveal>
				<div className="mb-12 text-center">
					<span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
						<EyeOff className="size-3.5 text-primary" />
						Built-in privacy
					</span>
					<h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
						Private by default
					</h2>
					<p className="mx-auto mt-3 max-w-lg text-muted-foreground">
						Open Money Diary anywhere — commute, cafe, meeting — without anyone
						seeing your numbers.
					</p>
				</div>
			</ScrollReveal>

			<ScrollReveal className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
				{/* ── Copy ──────────────────────────────────────────────── */}
				<div className="flex flex-col gap-6">
					{PRIVACY_POINTS.map(({ icon: Icon, heading, body }) => (
						<div key={heading} className="flex gap-4">
							<span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-soft-accent text-primary">
								<Icon className="size-4" />
							</span>
							<div>
								<p className="text-sm font-semibold text-foreground">{heading}</p>
								<p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
									{body}
								</p>
							</div>
						</div>
					))}
				</div>

				{/* ── Frames ────────────────────────────────────────────── */}
				<div className="min-w-0" key={themeKey}>
					{/* Desktop frame — hidden on small screens */}
					<div className="hidden sm:block">
						<BrowserFrame
							urlLabel="moneydiary.app/dashboard"
							image={desktopImage}
							alt="Money Diary dashboard with privacy mode enabled — balances hidden"
						/>
					</div>
					{/* Phone frame — shown on small screens */}
					<div className="sm:hidden">
						<PhoneFrame
							image={mobileImage}
							alt="Money Diary on mobile with privacy mode — balances masked"
						/>
					</div>
				</div>
			</ScrollReveal>
		</section>
	);
}
