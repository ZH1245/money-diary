import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { z } from "zod";
import { ThemeToggle } from "#/components/layout/theme-toggle";
import { Button } from "#/components/ui/button";

const accountSuspendedSearchSchema = z.object({
	status: z.enum(["restricted", "banned"]).optional().catch("restricted"),
	reason: z.string().optional().catch(""),
});

export const Route = createFileRoute("/account-suspended")({
	validateSearch: accountSuspendedSearchSchema,
	component: AccountSuspendedPage,
});

function AccountSuspendedPage() {
	const { status, reason } = Route.useSearch();
	const title = status === "banned" ? "Account banned" : "Account restricted";

	return (
		<main className="flex min-h-screen items-center justify-center bg-canvas px-5 py-10">
			<article className="rise-in w-full max-w-lg rounded-panel border border-border bg-panel p-6 shadow-sm sm:p-8">
				<div className="flex items-start justify-between gap-3">
					<div className="flex items-center gap-3">
						<span className="flex size-10 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
							<ShieldAlert className="size-5" />
						</span>
						<div>
							<h1 className="display-title text-2xl font-bold text-foreground">
								{title}
							</h1>
							<p className="mt-1 text-sm text-muted-foreground">
								You cannot use Money Diary with this account right now.
							</p>
						</div>
					</div>
					<ThemeToggle />
				</div>

				{reason ? (
					<div className="mt-5 rounded-lg border border-border bg-input-bg px-4 py-3 text-sm text-foreground">
						<p>{reason}</p>
					</div>
				) : null}

				<div className="mt-6 flex flex-wrap gap-3">
					<Button asChild variant="outline">
						<Link to="/sign-in">Back to sign in</Link>
					</Button>
				</div>
			</article>
		</main>
	);
}
