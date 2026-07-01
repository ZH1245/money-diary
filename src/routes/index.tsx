import { Navigate, createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "#/features/landing/components/landing-page";
import { buildPublicPageHead, LANDING_SEO } from "#/lib/seo/public-seo";
import { useAuthSession } from "#/lib/use-auth-session";

export const Route = createFileRoute("/")({
	component: Home,
	head: () =>
		buildPublicPageHead({
			...LANDING_SEO,
			path: "/",
		}),
});

function Home() {
	const { data: session, isPending } = useAuthSession();

	// Redirect signed-in users once the session is known; never block crawlers on auth.
	if (!isPending && session?.user) {
		return <Navigate to="/dashboard" />;
	}

	return <LandingPage />;
}
