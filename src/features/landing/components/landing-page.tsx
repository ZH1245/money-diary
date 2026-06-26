import { Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { DeviceMockups } from "./device-mockups";
import { FeatureGrid } from "./feature-grid";
import { LandingNav } from "./landing-nav";

export function LandingPage() {
	return (
		<div className="min-h-screen bg-canvas text-foreground">
			<LandingNav />

			{/* ── Hero ───────────────────────────────────────────────── */}
			<section className="mx-auto w-full max-w-6xl px-4 pb-10 pt-16 sm:pb-14 sm:pt-24">
				<div className="mx-auto max-w-2xl text-center">
					<h1 className="text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
						Your money, <span className="text-primary">finally in focus.</span>
					</h1>
					<p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
						Track income, expenses, and savings goals. Stay on top of recurring
						bills. Get AI-assisted transaction entry. All in one beautifully
						simple app.
					</p>
					<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
						<Button size="lg" asChild>
							<Link to="/sign-up">Get started — it&apos;s free</Link>
						</Button>
						<Button variant="outline" size="lg" asChild>
							<Link to="/sign-in">Sign in</Link>
						</Button>
					</div>
				</div>
			</section>

			{/* ── Device mockups ─────────────────────────────────────── */}
			<section className="mx-auto w-full max-w-6xl overflow-hidden pb-20 sm:pb-32">
				<DeviceMockups />
			</section>

			{/* ── Feature grid ───────────────────────────────────────── */}
			<FeatureGrid />

			{/* ── Bottom CTA band ────────────────────────────────────── */}
			<section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:pb-24">
				<div className="rounded-panel bg-primary px-6 py-12 text-center text-primary-foreground sm:px-10">
					<h2 className="text-2xl font-bold sm:text-3xl">
						Take control of your finances today
					</h2>
					<p className="mt-3 text-sm opacity-80 sm:text-base">
						Join thousands of people who use Money Diary to understand and grow
						their money.
					</p>
					<div className="mt-8">
						<Button
							variant="secondary"
							size="lg"
							asChild
							className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
						>
							<Link to="/sign-up">Create your free account</Link>
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
							className="hover:text-foreground no-underline transition-colors"
						>
							Privacy
						</Link>
						<Link
							to="/terms"
							className="hover:text-foreground no-underline transition-colors"
						>
							Terms
						</Link>
						<Link
							to="/sign-in"
							className="hover:text-foreground no-underline transition-colors"
						>
							Sign in
						</Link>
					</nav>
				</div>
			</footer>
		</div>
	);
}
