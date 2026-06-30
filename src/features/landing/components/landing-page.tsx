import { Link } from "@tanstack/react-router";
import { ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "#/components/ui/button";
import { DeviceMockups } from "./device-mockups";
import { FeatureGrid } from "./feature-grid";
import { FeatureShowcase } from "./feature-showcase";
import { LandingNav } from "./landing-nav";
import { ThemesShowcase } from "./themes-showcase";

export function LandingPage() {
	return (
		<div className="min-h-screen bg-canvas text-foreground">
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
							Personal finance, made simple
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
					</div>
				</div>

				{/* ── Device mockups ───────────────────────────────────── */}
				<div className="relative mx-auto w-full max-w-6xl overflow-hidden px-4 pb-20 sm:pb-32">
					<DeviceMockups />
				</div>
			</section>

			{/* ── Feature showcase (screenshot carousel) ─────────────── */}
			<FeatureShowcase />

			{/* ── Feature grid ───────────────────────────────────────── */}
			<FeatureGrid />

			{/* ── Themes showcase ────────────────────────────────────── */}
			<ThemesShowcase />

			{/* ── Bottom CTA band ────────────────────────────────────── */}
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

			{/* ── Footer ─────────────────────────────────────────────── */}
			<footer className="border-t border-border">
				<div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between">
					<div className="text-center sm:text-left">
						<p className="text-sm font-semibold text-foreground">Money Diary</p>
						<p className="mt-0.5 text-xs text-muted-foreground">
							Personal finance, made beautiful.
						</p>
					</div>
					<nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
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
