import { createFileRoute } from "@tanstack/react-router";
import { AuthenticatedRoutePage } from "#/components/layout/authenticated-route-page";
import { AdminBansSection } from "#/features/admin/components/admin-bans-section";
import { AdminGlobalAiSection } from "#/features/admin/components/admin-global-ai-section";
import { AdminGlobalCategoriesSection } from "#/features/admin/components/admin-global-categories-section";
import { AdminUsersSection } from "#/features/admin/components/admin-users-section";
import { AdminTicketsSection } from "#/features/feedback/components/admin-tickets-section";
import {
	type SettingsNavGroup,
	SettingsPageLayout,
} from "#/features/settings/components/settings-page-layout";
import { createAuthenticatedRouteLoader } from "#/lib/authenticated-route";

export const Route = createFileRoute("/admin")({
	loader: createAuthenticatedRouteLoader("admin", { requireAdmin: true }),
	component: AdminPage,
});

const ADMIN_NAV_GROUPS: SettingsNavGroup[] = [
	{
		label: "Platform",
		items: [
			{
				id: "global-ai",
				label: "AI provider",
				title: "Global AI provider",
				description:
					"Configure the AI service users can use by default. API keys are encrypted and never shown to regular users.",
			},
			{
				id: "categories",
				label: "Categories",
				title: "Global categories",
				description:
					"Built-in categories appear for every user. Users can still create personal categories.",
			},
		],
	},
	{
		label: "Administration",
		items: [
			{
				id: "users",
				label: "Users",
				title: "Users",
				description:
					"Review accounts, restrict access with a reason, ban sign-in, or permanently delete users.",
			},
			{
				id: "bans",
				label: "Bans",
				title: "Bans",
				description:
					"Block sign-in by email or IP address with an optional expiry.",
			},
			{
				id: "tickets",
				label: "Tickets",
				title: "Tickets",
				description:
					"Bug reports, feature requests, and support messages from users.",
			},
		],
	},
];

function AdminPage() {
	const loaderData = Route.useLoaderData();

	return (
		<AuthenticatedRoutePage loaderData={loaderData} requireAdmin>
			{() => (
				<main className="p-4 md:p-6 lg:p-8">
					<SettingsPageLayout
						pageLabel="Global settings"
						pageNote="Configure shared resources for all users. Your personal transactions, savings, goals, and settings are unchanged — use Dashboard and the rest of the app for your own finances."
						navAriaLabel="Global settings sections"
						groups={ADMIN_NAV_GROUPS}
					>
						{(item) => {
							if (item.id === "global-ai") {
								return <AdminGlobalAiSection />;
							}

							if (item.id === "categories") {
								return <AdminGlobalCategoriesSection />;
							}

							if (item.id === "bans") {
								return <AdminBansSection />;
							}

							if (item.id === "tickets") {
								return <AdminTicketsSection />;
							}

							return <AdminUsersSection />;
						}}
					</SettingsPageLayout>
				</main>
			)}
		</AuthenticatedRoutePage>
	);
}
