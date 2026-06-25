import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { LogOut, MessageSquare, ShieldCheck, Sparkles } from "lucide-react";
import { SessionLoadingSkeleton } from "#/components/feedback/page-state";
import { AuthFeaturePanel } from "#/components/layout/auth-feature-panel";
import { AuthSplitLayout } from "#/components/layout/auth-split-layout";
import { ThemeToggle } from "#/components/layout/theme-toggle";
import { SecuritySetupForm } from "#/features/auth/components/security-setup-form";
import { useSecurityProfile } from "#/features/auth/hooks/use-security-profile";
import { authClient } from "#/lib/auth-client";
import { useAuthSession } from "#/lib/use-auth-session";

export const Route = createFileRoute("/setup-security")({
	component: SetupSecurityPage,
});

function SetupSecurityPage() {
	const navigate = useNavigate();
	const { data: session, isInitialPending } = useAuthSession();
	const { data: profile, isLoading: isProfileLoading } = useSecurityProfile(
		Boolean(session?.user),
	);

	async function handleSignOut() {
		await authClient.signOut();
		await navigate({ to: "/sign-in" });
	}

	if (isInitialPending) {
		return <SessionLoadingSkeleton />;
	}

	if (!session?.user) {
		return <Navigate to="/sign-in" />;
	}

	if (isProfileLoading) {
		return <SessionLoadingSkeleton />;
	}

	if (profile) {
		return <Navigate to="/" />;
	}

	return (
		<AuthSplitLayout
			formPanel={
				<article className="rise-in w-full max-w-[340px] rounded-panel border border-border bg-panel p-6 shadow-sm sm:p-7">
					<div className="flex items-start justify-between gap-3">
						<div>
							<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
								Step 2 of 2
							</p>
							<h2 className="display-title text-2xl font-bold text-foreground">
								Secure your account
							</h2>
						</div>
						<ThemeToggle />
					</div>
					<p className="mt-2 text-sm text-muted-foreground">
						Your account is ready. Add recovery details before you start
						tracking money.
					</p>

					<SecuritySetupForm />

					<button
						type="button"
						onClick={() => void handleSignOut()}
						className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-row-hover"
					>
						<LogOut className="size-4" />
						Sign out
					</button>
				</article>
			}
			featurePanel={
				<AuthFeaturePanel
					kicker="Almost done"
					title="Secure first. Then talk to your diary."
					description="Recovery answers protect your account. Right after this step, AI helps you log and understand your money in plain language."
					tags={["One-time setup", "Hashed answers", "AI ready next"]}
					features={[
						{
							icon: ShieldCheck,
							title: "Password protection",
							description:
								"Your security answer is required when you update your password in Settings.",
						},
						{
							icon: MessageSquare,
							title: "AI chat waiting for you",
							description:
								"Log “Groceries 2,500” or ask “How much went to subscriptions?” once you are in.",
						},
						{
							icon: Sparkles,
							title: "Finish setup once",
							description:
								"Complete recovery now, then manage money with chat and dashboards.",
						},
					]}
				/>
			}
		/>
	);
}
