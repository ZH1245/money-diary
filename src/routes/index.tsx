import { Navigate, createFileRoute } from "@tanstack/react-router";
import { SessionLoadingSkeleton } from "#/components/feedback/page-state";
import { LandingPage } from "#/features/landing/components/landing-page";
import { useAuthSession } from "#/lib/use-auth-session";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const { data: session, isInitialPending } = useAuthSession();

	if (isInitialPending) {
		return <SessionLoadingSkeleton />;
	}

	// Signed-in users skip the marketing page and go straight to the app.
	if (session?.user) {
		return <Navigate to="/dashboard" />;
	}

	// Public landing page — intentionally NOT behind the auth redirect.
	return <LandingPage />;
}
