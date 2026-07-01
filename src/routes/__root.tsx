import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalyticsRouteReporter, GoogleAnalyticsScripts } from "#/components/observability/google-analytics";
import { SpeedInsightsRouteReporter } from "#/components/observability/speed-insights-route-reporter";
import { Toaster } from "sonner";
import { NotFoundPage } from "#/components/layout/not-found-page";
import {
	ThemeProvider,
	themeNoFlashScript,
} from "#/components/layout/theme-provider";
import { ServiceWorkerRegistration } from "#/components/pwa/service-worker-registration";
import { AppUpdateNotifier } from "#/components/app/app-update-notifier";
import { TooltipProvider } from "#/components/ui/tooltip";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";
import { LANDING_SEO, SITE_NAME } from "#/lib/seo/public-seo";

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: SITE_NAME,
			},
			{
				name: "description",
				content: LANDING_SEO.description,
			},
			{
				name: "application-name",
				content: SITE_NAME,
			},
			{
				name: "theme-color",
				content: "#2563eb",
			},
			{
				name: "mobile-web-app-capable",
				content: "yes",
			},
			{
				name: "apple-mobile-web-app-capable",
				content: "yes",
			},
			{
				name: "apple-mobile-web-app-status-bar-style",
				content: "default",
			},
			{
				name: "apple-mobile-web-app-title",
				content: "Money Diary",
			},
		],
		links: [
			{
				rel: "preload",
				href: appCss,
				as: "style",
			},
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "icon",
				href: "/favicon.ico",
			},
			{
				rel: "icon",
				type: "image/png",
				href: "/favicon.png",
			},
			{
				rel: "manifest",
				href: "/manifest.json",
			},
			{
				rel: "apple-touch-icon",
				href: "/favicon.png",
			},
		],
	}),
	notFoundComponent: NotFoundPage,
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
				<script dangerouslySetInnerHTML={{ __html: themeNoFlashScript }} />
				<GoogleAnalyticsScripts />
			</head>
			<body>
				<ThemeProvider>
					<TooltipProvider delayDuration={300}>
						<div className="route-transition">{children}</div>
					</TooltipProvider>
				</ThemeProvider>
				<Toaster richColors position="top-right" closeButton />
				<ServiceWorkerRegistration />
				<AppUpdateNotifier />
				<Analytics />
				<GoogleAnalyticsRouteReporter />
				<SpeedInsightsRouteReporter />
				{import.meta.env.DEV ? (
					<TanStackDevtools
						config={{
							position: "bottom-right",
						}}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
							TanStackQueryDevtools,
						]}
					/>
				) : null}
				<Scripts />
			</body>
		</html>
	);
}

interface MyRouterContext {
	queryClient: QueryClient;
}
