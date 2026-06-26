import { Navigate, createFileRoute } from "@tanstack/react-router";
import { SessionLoadingSkeleton } from "#/components/feedback/page-state";
import { AuthenticatedAppShell } from "#/components/layout/authenticated-app-shell";
import { DashboardPageContent } from "#/features/dashboard/components/dashboard-page-content";
import { DEFAULT_CURRENCY } from "#/lib/currency";
import { useAuthSession } from "#/lib/use-auth-session";
import { toSessionUser } from "#/types/auth";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
	const { data: session, isInitialPending } = useAuthSession();

	if (isInitialPending) {
		return <SessionLoadingSkeleton />;
	}

	if (!session?.user) {
		return <Navigate to="/sign-in" />;
	}

	const userCurrency = (
		(session.user as { currency?: string }).currency ?? DEFAULT_CURRENCY
	).toUpperCase();

	return (
		<AuthenticatedAppShell user={toSessionUser(session.user)}>
			<DashboardPageContent userCurrency={userCurrency} />
		</AuthenticatedAppShell>
	);
}
