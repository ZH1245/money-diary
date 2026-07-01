import { Link } from "@tanstack/react-router";
import { ShieldCheck, Sparkles } from "lucide-react";
import { useTheme } from "#/components/layout/theme-provider";
import { Button } from "#/components/ui/button";
import { LandingJsonLd } from "#/lib/seo/landing-json-ld";
import { LANDING_SEO } from "#/lib/seo/public-seo";
import { cn } from "#/lib/utils";
import { DeviceMockups } from "./device-mockups";
import { FeatureGrid } from "./feature-grid";
import { FeatureShowcase } from "./feature-showcase";
import { LANDING_THEMES } from "./landing-themes";
import { ScrollReveal } from "./landing-ui-bits";
import { LandingNav } from "./landing-nav";
import { PrivacySection } from "./privacy-section";
import { ThemesShowcase } from "./themes-showcase";

/**
 * Compact 4-pill theme switcher for the hero section.
 * Wires directly to the global theme so DeviceMockups react live.
 */
function HeroThemeSwitcher() {
	const { palette, mode, setPalette, setMode } = useTheme();

	return (
		<div className="mt-8 flex flex-col items-center gap-2">
			<p className="text-xs font-medium text-muted-foreground">
				Try a theme →
			</p>
			<div className="flex flex-wrap items-center justify-center gap-2">
				{LANDING_THEMES.map((theme) => {
					const active = palette === theme.palette && mode === theme.themeMode;
					return (
						<button
							key={theme.id}
							type="button"
							aria-pressed={active}
							onClick={() => {
								setPalette(theme.palette);
								setMode(theme.themeMode);
							}}
							className={cn(
								"inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
								active
									? "border-primary bg-primary text-primary-foreground shadow-sm"
									: "border-border bg-panel text-muted-foreground hover:border-primary/40 hover:text-foreground",
							)}
						>
							<span
								aria-hidden
								className={cn(
									"block size-2 rounded-full",
									theme.palette === "c" ? "bg-emerald-500" : "bg-indigo-500",
								)}
							/>
							{theme.name}
							<span className="opacity-70">· {theme.modeLabel}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}

export function LandingPage() {
	return (
		<div className="min-h-screen bg-canvas text-foreground">
			<LandingJsonLd description={LANDING_SEO.description} />
			<LandingNav />

			{/* ── Hero ───────────────────────────────────────────────── */}
			<section className="relative overflow-hidden">
				{/* decorative backdrop glow */}
				<div
					aria-hidden
					className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-[28rem] max-w-4xl bg-[radial-gradient(closest-side,rgba(var(--accent-rgb),0.18),transparent)]"
				/>
				<div className="relative mx-auto w-full max-w-6xl px-4 pb-12 pt-16 sm:pb-16 sm:pt-24">
					<div className="mx-auto max-w-3xl text-center">
						<span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
							<Sparkles className="size-3.5 text-primary" />
							Personal finance &amp; expense tracker
						</span>
						<h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
							Your money,{" "}
							<span className="text-primary">finally in focus.</span>
						</h1>
						<p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-foreground/70 sm:text-lg">
							Track income, expenses, and savings goals, stay ahead of recurring
							bills, and log transactions in plain English with AI — all in one
							beautifully simple app.
						</p>
						<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
							<Button size="lg" asChild>
								<Link to="/sign-up" className="no-underline">
									Get started — it&apos;s free
								</Link>
							</Button>
							<Button variant="outline" size="lg" asChild>
								<Link to="/sign-in" className="no-underline">
									Sign in
								</Link>
							</Button>
						</div>
						<p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
							<ShieldCheck className="size-3.5" />
							Free to start · No card required · Your data stays private
						</p>

						{/* ── Hero theme switcher ─────────────────────────── */}
						<HeroThemeSwitcher />
					</div>
				</div>

				{/* ── Device mockups ───────────────────────────────────── */}
				{/*
				  Extra bottom padding on sm+ accommodates the overlapping phone
				  that hangs ~40px below the desktop frame (-bottom-10).
				*/}
				<div className="relative mx-auto w-full max-w-6xl px-4 pb-20 sm:pb-20 sm:pt-4 lg:pb-24">
					<DeviceMockups />
				</div>
			</section>

			{/* ── Feature showcase (screenshot carousel) ─────────────── */}
			<FeatureShowcase />

			{/* ── Feature grid ───────────────────────────────────────── */}
			<ScrollReveal>
				<FeatureGrid />
			</ScrollReveal>

			{/* ── Privacy section ────────────────────────────────────── */}
			<PrivacySection />

			{/* ── Themes showcase ────────────────────────────────────── */}
			<ThemesShowcase />

			{/* ── Bottom CTA band ────────────────────────────────────── */}
			<ScrollReveal>
			<section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:pb-24">
				<div className="relative overflow-hidden rounded-panel bg-primary px-6 py-14 text-center text-primary-foreground sm:px-10">
					<div
						aria-hidden
						className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary-foreground/10"
					/>
					<div
						aria-hidden
						className="pointer-events-none absolute -bottom-20 -left-12 size-64 rounded-full bg-primary-foreground/10"
					/>
					<h2 className="relative text-2xl font-bold tracking-tight sm:text-3xl">
						Take control of your finances today
					</h2>
					<p className="relative mx-auto mt-3 max-w-md text-sm text-primary-foreground/80 sm:text-base">
						Join people who use Money Diary to understand, plan, and grow their
						money.
					</p>
					<div className="relative mt-8">
						<Button
							variant="secondary"
							size="lg"
							asChild
							className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
						>
							<Link to="/sign-up" className="no-underline">
								Create your free account
							</Link>
						</Button>
					</div>
				</div>
			</section>
			</ScrollReveal>

			{/* ── Footer ─────────────────────────────────────────────── */}
			<footer className="border-t border-border">
				<div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between">
					<div className="text-center sm:text-left">
						<p className="text-sm font-semibold text-foreground">Money Diary</p>
						<p className="mt-0.5 text-xs text-muted-foreground">
							Personal finance, made beautiful.
						</p>
					</div>
					<nav
						className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-muted-foreground"
						aria-label="Footer"
					>
						<Link
							to="/"
							hash="features"
							className="no-underline transition-colors hover:text-foreground"
						>
							Features
						</Link>
						<Link
							to="/privacy"
							className="no-underline transition-colors hover:text-foreground"
						>
							Privacy
						</Link>
						<Link
							to="/terms"
							className="no-underline transition-colors hover:text-foreground"
						>
							Terms
						</Link>
						<Link
							to="/sign-up"
							className="no-underline transition-colors hover:text-foreground"
						>
							Sign up
						</Link>
						<Link
							to="/sign-in"
							className="no-underline transition-colors hover:text-foreground"
						>
							Sign in
						</Link>
					</nav>
				</div>
			</footer>
		</div>
	);
}
