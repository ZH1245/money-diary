import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, KeyRound, Loader2, Shield } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { InlineError } from "#/components/feedback/inline-error";
import { FormField } from "#/components/forms/form-field";
import { AuthFeaturePanel } from "#/components/layout/auth-feature-panel";
import { AuthSplitLayout } from "#/components/layout/auth-split-layout";
import { ThemeToggle } from "#/components/layout/theme-toggle";

export const Route = createFileRoute("/reset-password")({
	component: ResetPasswordPage,
});

const resetTokenSchema = z
	.object({
		newPassword: z.string().min(8, "Password must be at least 8 characters"),
		confirmPassword: z.string().min(8, "Confirm your password"),
	})
	.refine((values) => values.newPassword === values.confirmPassword, {
		message: "Passwords must match",
		path: ["confirmPassword"],
	});

const featureItems = [
	{
		icon: KeyRound,
		title: "Secure token",
		description: "Each reset link contains a one-time secure token.",
	},
	{
		icon: Shield,
		title: "Link expires",
		description: "Reset links expire after 1 hour for security.",
	},
	{
		icon: CheckCircle2,
		title: "Sessions revoked",
		description: "All active sessions are revoked after a successful reset.",
	},
];

function ResetPasswordPage() {
	const token =
		typeof window !== "undefined"
			? new URLSearchParams(window.location.search).get("token")
			: null;

	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);

	const featurePanel = (
		<AuthFeaturePanel
			kicker="Money Diary"
			title="Password reset."
			description="Set a new password for your account using the admin-provided link."
			tags={["Secure reset", "One-time link", "Admin generated"]}
			features={featureItems}
		/>
	);

	if (!token) {
		return (
			<AuthSplitLayout
				featurePanel={featurePanel}
				formPanel={
					<article className="rise-in w-full max-w-[340px] rounded-panel border border-border bg-panel p-6 shadow-sm sm:p-7">
						<div className="flex items-start justify-between gap-3">
							<h2 className="display-title text-2xl font-bold text-foreground">
								Invalid link
							</h2>
							<ThemeToggle />
						</div>
						<p className="mt-2 text-sm text-muted-foreground">
							This reset link is invalid or missing. Please contact your
							administrator for a new link.
						</p>
						<p className="mt-5 text-center text-sm text-muted-foreground">
							<Link
								to="/sign-in"
								className="font-medium text-primary underline-offset-4 hover:underline"
							>
								Back to sign in
							</Link>
						</p>
					</article>
				}
			/>
		);
	}

	if (isSuccess) {
		return (
			<AuthSplitLayout
				featurePanel={featurePanel}
				formPanel={
					<article className="rise-in w-full max-w-[340px] rounded-panel border border-border bg-panel p-6 shadow-sm sm:p-7">
						<div className="flex items-start justify-between gap-3">
							<h2 className="display-title text-2xl font-bold text-foreground">
								Password updated
							</h2>
							<ThemeToggle />
						</div>
						<p className="mt-2 text-sm text-muted-foreground">
							Your password has been successfully updated. All active sessions
							have been revoked.
						</p>
						<p className="mt-5 text-center text-sm text-muted-foreground">
							<Link
								to="/sign-in"
								className="font-medium text-primary underline-offset-4 hover:underline"
							>
								Sign in with your new password
							</Link>
						</p>
					</article>
				}
			/>
		);
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setErrorMessage(null);
		setFieldErrors({});

		const parsed = resetTokenSchema.safeParse({ newPassword, confirmPassword });
		if (!parsed.success) {
			const nextErrors: Record<string, string> = {};
			for (const issue of parsed.error.issues) {
				const key = issue.path[0];
				if (typeof key === "string" && !nextErrors[key]) {
					nextErrors[key] = issue.message;
				}
			}
			setFieldErrors(nextErrors);
			return;
		}

		setIsSubmitting(true);
		try {
			const response = await fetch("/api/auth/reset-password-token", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					token,
					newPassword: parsed.data.newPassword,
				}),
			});

			const payload = (await response.json().catch(() => null)) as {
				success?: boolean;
				error?: string;
			} | null;

			if (!response.ok || !payload?.success) {
				throw new Error(payload?.error ?? "Unable to reset password");
			}

			setIsSuccess(true);
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Unable to reset password",
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<AuthSplitLayout
			featurePanel={featurePanel}
			formPanel={
				<article className="rise-in w-full max-w-[340px] rounded-panel border border-border bg-panel p-6 shadow-sm sm:p-7">
					<div className="flex items-start justify-between gap-3">
						<h2 className="display-title text-2xl font-bold text-foreground">
							Set new password
						</h2>
						<ThemeToggle />
					</div>
					<p className="mt-2 text-sm text-muted-foreground">
						Enter a new password for your account.
					</p>

					<form
						className="mt-6 space-y-4"
						onSubmit={handleSubmit}
						noValidate
						autoComplete="off"
					>
						<FormField
							id="new-password"
							label="New password"
							type="password"
							value={newPassword}
							onChange={setNewPassword}
							placeholder="At least 8 characters"
							error={fieldErrors.newPassword}
							isDisabled={isSubmitting}
							autoComplete="new-password"
						/>
						<FormField
							id="confirm-password"
							label="Confirm password"
							type="password"
							value={confirmPassword}
							onChange={setConfirmPassword}
							placeholder="Repeat new password"
							error={fieldErrors.confirmPassword}
							isDisabled={isSubmitting}
							autoComplete="new-password"
						/>

						{errorMessage ? <InlineError message={errorMessage} /> : null}

						<button
							type="submit"
							disabled={isSubmitting}
							className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
						>
							{isSubmitting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : null}
							Reset password
						</button>
					</form>

					<p className="mt-5 text-center text-sm text-muted-foreground">
						<Link
							to="/sign-in"
							className="font-medium text-primary underline-offset-4 hover:underline"
						>
							Back to sign in
						</Link>
					</p>
				</article>
			}
		/>
	);
}
