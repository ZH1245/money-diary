import { useNavigate } from "@tanstack/react-router";
import { SiteFooter } from "#/components/layout/site-footer";
import { ThemeToggle } from "#/components/layout/theme-toggle";

interface LegalPageLayoutProps {
	title: string;
	lastUpdated: string;
	backTo: string;
	backLabel: string;
	children: React.ReactNode;
}

/**
 * Public layout for legal documents such as the privacy policy.
 */
export function LegalPageLayout({
	title,
	lastUpdated,
	backTo,
	backLabel,
	children,
}: LegalPageLayoutProps) {
	const navigate = useNavigate();
	const canGoBack = typeof window !== "undefined" && window.history.length > 1;

	function handleBackClick() {
		if (canGoBack) {
			window.history.back();
			return;
		}

		void navigate({ to: backTo });
	}

	return (
		<main className="min-h-screen bg-canvas text-foreground">
			<header className="border-b border-border-faint bg-panel px-5 py-4 md:px-8">
				<div className="mx-auto flex w-full max-w-[720px] items-center justify-between gap-4">
					<button
						type="button"
						onClick={handleBackClick}
						className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
					>
						← {canGoBack ? "Back to previous page" : backLabel}
					</button>
					<div className="flex items-center gap-3">
						<p className="island-kicker text-xs">Money Diary</p>
						<ThemeToggle />
					</div>
				</div>
			</header>

			<div className="mx-auto w-full max-w-[720px] px-4 py-8 md:py-12">
				<article className="md-panel rise-in p-6 md:p-10">
					<p className="island-kicker text-primary">Legal</p>
					<h1 className="display-title mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
						{title}
					</h1>
					<p className="mt-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
						Last updated {lastUpdated}
					</p>
					<div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
						{children}
					</div>
				</article>
			</div>

			<SiteFooter />
		</main>
	);
}
