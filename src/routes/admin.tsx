import { createFileRoute } from "@tanstack/react-router";
import { SessionLoadingSkeleton } from "#/components/feedback/page-state";
import { AuthenticatedAppShell } from "#/components/layout/authenticated-app-shell";
import { AdminGlobalAiSection } from "#/features/admin/components/admin-global-ai-section";
import { AdminGlobalCategoriesSection } from "#/features/admin/components/admin-global-categories-section";
import { AdminUsersSection } from "#/features/admin/components/admin-users-section";
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
		],
	},
];

function AdminPage() {
	const { data: session, isInitialPending } = useAuthSession();

	if (isInitialPending) {
		return <SessionLoadingSkeleton />;
	}

	const role = (session?.user as { role?: string } | undefined)?.role;
	if (!session?.user || role !== AUTH_ROLES.admin) {
		return (
			<main className="page-wrap py-6">
				<section className="md-panel p-5 md:p-6">
					<h1 className="text-2xl font-semibold tracking-tight text-foreground">
						Forbidden
					</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						Admin access is required to manage global settings.
					</p>
				</section>
			</main>
		);
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

						return <AdminUsersSection />;
					}}
				</SettingsPageLayout>
			</main>
		</AuthenticatedAppShell>
	);
}
