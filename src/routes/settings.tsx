import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Loader2, ScrollText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { InlineError } from "#/components/feedback/inline-error";
import { SearchableSelect } from "#/components/forms/searchable-select";
import { AuthenticatedRoutePage } from "#/components/layout/authenticated-route-page";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import { ChangePasswordSection } from "#/features/auth/components/change-password-section";
import { FeedbackFormSection } from "#/features/feedback/components/feedback-form-section";
import { AboutSection } from "#/features/settings/components/about-section";
import { AiSettingsSection } from "#/features/settings/components/ai-settings-section";
import {
	type SettingsNavGroup,
	SettingsPageLayout,
} from "#/features/settings/components/settings-page-layout";
import { createAuthenticatedRouteLoader } from "#/lib/authenticated-route";
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from "#/lib/currency";
import { apiFetch } from "#/lib/api-fetch";
import { useAuthSession } from "#/lib/use-auth-session";

export const Route = createFileRoute("/settings")({
	loader: createAuthenticatedRouteLoader("settings"),
	component: SettingsPage,
});

const updateCurrencySchema = z.object({
	currency: z.string().trim().length(3, "Select a valid currency"),
});

const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
	{
		label: "Account",
		items: [
			{
				id: "general",
				label: "General",
				title: "General",
				description: "Currency and display preferences for your workspace.",
			},
			{
				id: "security",
				label: "Security",
				title: "Security",
				description: "Update your password with recovery verification.",
			},
		],
	},
	{
		label: "Preferences",
		items: [
			{
				id: "ai",
				label: "AI provider",
				title: "AI provider",
				description:
					"Choose the app AI service or bring your own provider credentials.",
			},
		],
	},
	{
		label: "Support",
		items: [
			{
				id: "feedback",
				label: "Feedback",
				title: "Feedback & support",
				description:
					"Report a bug, request a feature, or ask for help.",
			},
		],
	},
	{
		label: "About & Legal",
		items: [
			{
				id: "about",
				label: "About",
				title: "About",
				description: "App version, build, and release notes.",
			},
			{
				id: "legal",
				label: "Legal",
				title: "About & Legal",
				description:
					"Review how Money Diary handles your data and the terms of use.",
			},
		],
	},
];

function SettingsPage() {
	const loaderData = Route.useLoaderData();
	const { data: session, refetch: refetchSession } = useAuthSession();
	const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
	const [isCurrencySubmitting, setIsCurrencySubmitting] = useState(false);
	const [currencyError, setCurrencyError] = useState<string | null>(null);
	const selectedCurrency = (
		(session?.user as { currency?: string } | undefined)?.currency ??
		loaderData?.user.currency ??
		DEFAULT_CURRENCY
	).toUpperCase();
	const currencyOptions = useMemo(
		() =>
			SUPPORTED_CURRENCIES.map((currencyOption) => ({
				value: currencyOption.code,
				label: currencyOption.label,
			})),
		[],
	);

	useEffect(() => {
		if (!session?.user) return;
		if (isCurrencySubmitting || currencyError) return;

		setCurrency((previousCurrency) => {
			if (previousCurrency === selectedCurrency) return previousCurrency;
			return selectedCurrency;
		});
	}, [session?.user, selectedCurrency, isCurrencySubmitting, currencyError]);

	async function handleCurrencySubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setCurrencyError(null);

		const parsed = updateCurrencySchema.safeParse({ currency });
		if (!parsed.success) {
			setCurrencyError(parsed.error.issues[0]?.message ?? "Invalid currency");
			return;
		}

		setIsCurrencySubmitting(true);

		const requestPromise = apiFetch("/api/settings/currency", {
			method: "PATCH",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({
				currency: parsed.data.currency.toUpperCase(),
			}),
		}).then(async (response) => {
			const payload = (await response.json().catch(() => null)) as {
				success?: boolean;
				error?: string;
			} | null;
			if (!response.ok || !payload?.success) {
				throw new Error(payload?.error ?? "Unable to update currency");
			}
			return payload;
		});

		toast.promise(requestPromise, {
			loading: "Updating currency...",
			success: "Currency updated",
			error: "Unable to update currency",
		});

		try {
			await requestPromise;
			await refetchSession();
		} catch (error) {
			setCurrencyError(
				error instanceof Error ? error.message : "Unable to update currency",
			);
		} finally {
			setIsCurrencySubmitting(false);
		}
	}

	const profileName = session?.user?.name ?? loaderData?.user.name ?? "";
	const profileEmail = session?.user?.email ?? loaderData?.user.email ?? "";
	const profileImage = session?.user?.image ?? loaderData?.user.image ?? null;

	return (
		<AuthenticatedRoutePage loaderData={loaderData}>
			{() => (
			<main className="p-4 md:p-6 lg:p-8">
				<ProfileCard
					name={profileName}
					email={profileEmail}
					image={profileImage}
				/>
				<SettingsPageLayout groups={SETTINGS_NAV_GROUPS}>
					{(item) => {
						if (item.id === "general") {
							return (
								<article className="md-panel p-5 md:p-6">
									<h2 className="text-lg font-semibold text-foreground">
										Preferred currency
									</h2>
									<p className="mt-1 text-xs text-muted-foreground">
										Transaction totals are calculated and shown in this
										currency.
									</p>

									<form
										className="mt-4 space-y-4"
										onSubmit={handleCurrencySubmit}
									>
										<div>
											<label
												htmlFor="currency"
												className="mb-1 block text-sm font-medium text-foreground"
											>
												Currency
											</label>
											<SearchableSelect
												id="currency"
												value={currency}
												onValueChange={setCurrency}
												options={currencyOptions}
												placeholder="Select currency"
												searchPlaceholder="Search currencies..."
												emptyMessage="No currencies found."
												disabled={isCurrencySubmitting}
												triggerClassName="h-10"
											/>
										</div>

										{currencyError ? (
											<InlineError message={currencyError} />
										) : null}

										<button
											type="submit"
											disabled={
												isCurrencySubmitting ||
												currency === selectedCurrency
											}
											className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
										>
											{isCurrencySubmitting ? (
												<>
													<Loader2 className="h-4 w-4 animate-spin" />
													Saving...
												</>
											) : (
												"Save currency"
											)}
										</button>
									</form>
								</article>
							);
						}

						if (item.id === "security") {
							return <ChangePasswordSection />;
						}

						if (item.id === "ai") {
							return <AiSettingsSection />;
						}

						if (item.id === "feedback") {
							return <FeedbackFormSection />;
						}

						if (item.id === "about") {
							return <AboutSection />;
						}

						return <LegalLinksSection />;
					}}
				</SettingsPageLayout>
			</main>
			)}
		</AuthenticatedRoutePage>
	);
}

interface ProfileCardProps {
	name: string;
	email: string;
	image?: string | null;
}

function ProfileCard({ name, email, image }: ProfileCardProps) {
	const initials = name
		.split(" ")
		.map((part) => part.charAt(0))
		.filter(Boolean)
		.slice(0, 2)
		.join("")
		.toUpperCase();

	return (
		<section className="md-panel mb-6 flex items-center gap-4 p-5 md:mb-8 md:p-6">
			<Avatar size="lg" className="size-14">
				{image ? <AvatarImage src={image} alt={name} /> : null}
				<AvatarFallback className="bg-avatar text-base font-semibold text-avatar-fg">
					{initials || "?"}
				</AvatarFallback>
			</Avatar>
			<div className="min-w-0">
				<p className="truncate text-lg font-semibold text-foreground">{name}</p>
				<p className="truncate text-sm text-muted-foreground">{email}</p>
			</div>
		</section>
	);
}

function LegalLinksSection() {
	const legalLinks = [
		{
			to: "/privacy",
			icon: FileText,
			title: "Privacy Policy",
			description: "How Money Diary collects, uses, and protects your data.",
		},
		{
			to: "/terms",
			icon: ScrollText,
			title: "Terms of Service",
			description: "The terms you agree to when using Money Diary.",
		},
	] as const;

	return (
		<article className="md-panel p-5 md:p-6">
			<h2 className="text-lg font-semibold text-foreground">
				About &amp; Legal
			</h2>
			<p className="mt-1 text-xs text-muted-foreground">
				Read our policies. These open the full document.
			</p>
			<ul className="mt-4 space-y-1">
				{legalLinks.map((link) => (
					<li key={link.to}>
						<Link
							to={link.to}
							className="md-row flex items-center gap-3 px-3 py-3"
						>
							<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-soft-accent text-primary">
								<link.icon className="size-4" aria-hidden="true" />
							</span>
							<span className="min-w-0">
								<span className="block text-sm font-medium text-foreground">
									{link.title}
								</span>
								<span className="block truncate text-xs text-muted-foreground">
									{link.description}
								</span>
							</span>
							<span
								aria-hidden="true"
								className="ml-auto text-muted-foreground"
							>
								→
							</span>
						</Link>
					</li>
				))}
			</ul>
		</article>
	);
}
