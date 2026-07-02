import { Navigate, createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "#/features/landing/components/landing-page";
import {
	buildPublicPageHead,
	DEFAULT_OG_IMAGE_PATH,
	LANDING_SEO,
} from "#/lib/seo/public-seo";
import { useAuthSession } from "#/lib/use-auth-session";

export const Route = createFileRoute("/")({
	component: Home,
	head: () => {
		const base = buildPublicPageHead({
			...LANDING_SEO,
			path: "/",
		});
		return {
			...base,
			links: [
				...base.links,
				{
					rel: "preload",
					href: DEFAULT_OG_IMAGE_PATH,
					as: "image",
					fetchPriority: "high",
				},
			],
		};
	},
});

function Home() {
	const { data: session, isPending } = useAuthSession();

	// Redirect signed-in users once the session is known; never block crawlers on auth.
	if (!isPending && session?.user) {
		return <Navigate to="/dashboard" />;
	}

	return <LandingPage />;
}
