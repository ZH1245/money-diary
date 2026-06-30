import { createFileRoute, Navigate } from "@tanstack/react-router";
import { SessionLoadingSkeleton } from "#/components/feedback/page-state";
import { AuthenticatedAppShell } from "#/components/layout/authenticated-app-shell";
import { AdminBansSection } from "#/features/admin/components/admin-bans-section";
import { AdminGlobalAiSection } from "#/features/admin/components/admin-global-ai-section";
import { AdminGlobalCategoriesSection } from "#/features/admin/components/admin-global-categories-section";
import { AdminUsersSection } from "#/features/admin/components/admin-users-section";
import { AdminTicketsSection } from "#/features/feedback/components/admin-tickets-section";
import { OnlineNowBadge } from "#/features/presence/components/online-now-badge";
import {
	type SettingsNavGroup,
	SettingsPageLayout,
} from "#/features/settings/components/settings-page-layout";
import { AUTH_ROLES } from "#/lib/auth-roles";
import { useAuthSession } from "#/lib/use-auth-session";

export const Route = createFileRoute("/admin")({
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
	const { data: session, isInitialPending } = useAuthSession();

	if (isInitialPending) {
		return <SessionLoadingSkeleton />;
	}

	// Don't render an "access denied" page — that confirms the admin route exists.
	// Unauthenticated users go to sign-in; signed-in non-admins are sent to their
	// dashboard as if the route were just any other page.
	if (!session?.user) {
		return <Navigate to="/sign-in" />;
	}
	const role = (session.user as { role?: string }).role;
	if (role !== AUTH_ROLES.admin) {
		return <Navigate to="/dashboard" />;
	}

	return (
		<AuthenticatedAppShell
			user={{
				name: session.user.name,
				email: session.user.email,
				image: session.user.image,
				role,
				currency: (session.user as { currency?: string }).currency,
			}}
		>
			<main className="p-4 md:p-6 lg:p-8">
				<div className="mb-4 flex justify-end">
					<OnlineNowBadge />
				</div>
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
		</AuthenticatedAppShell>
	);
}
