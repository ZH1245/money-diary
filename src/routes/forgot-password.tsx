import {
	createFileRoute,
	Link,
	Navigate,
	useNavigate,
} from "@tanstack/react-router";
import { CheckCircle2, Clock3, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { InlineError } from "#/components/feedback/inline-error";
import { FormField } from "#/components/forms/form-field";
import { SecurityAnswerField } from "#/components/forms/security-answer-field";
import { AuthFeaturePanel } from "#/components/layout/auth-feature-panel";
import { AuthSplitLayout } from "#/components/layout/auth-split-layout";
import { ThemeToggle } from "#/components/layout/theme-toggle";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/forgot-password")({
	component: ForgotPasswordPage,
});

const resetSchema = z
	.object({
		email: z.string().trim().email("Enter a valid account email"),
		recoveryEmail: z.string().trim().email("Enter a valid recovery email"),
		answerOne: z.string().trim().min(2, "Security answer is required"),
		newPassword: z.string().min(8, "Password must be at least 8 characters"),
		confirmPassword: z.string().min(8, "Confirm your password"),
	})
	.refine((values) => values.newPassword === values.confirmPassword, {
		message: "Passwords must match",
		path: ["confirmPassword"],
	});

function ForgotPasswordPage() {
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();
	const [email, setEmail] = useState("");
	const [recoveryEmail, setRecoveryEmail] = useState("");
	const [answerOne, setAnswerOne] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	if (session?.user) {
		return <Navigate to="/" />;
	}

	async function handleResetSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setErrorMessage(null);
		setFieldErrors({});

		const parsed = resetSchema.safeParse({
			email,
			recoveryEmail,
			answerOne,
			newPassword,
			confirmPassword,
		});

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
			const response = await fetch("/api/auth/recovery/reset", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					email: parsed.data.email,
					recoveryEmail: parsed.data.recoveryEmail,
					answerOne: parsed.data.answerOne,
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

			toast.success("Password updated");
			await navigate({ to: "/sign-in" });
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
			featurePanel={
				<AuthFeaturePanel
					kicker="Money Diary"
					title="Recover your account."
					description="Enter the recovery details you chose during setup. Nothing is emailed — we only verify what you type."
					tags={["Private recovery", "Security answer", "No email codes"]}
					features={[
						{
							icon: CheckCircle2,
							title: "Private verification",
							description:
								"Your recovery email and answer are checked silently on the server.",
						},
						{
							icon: Clock3,
							title: "Rate limited",
							description:
								"Recovery attempts are limited to reduce guessing attacks.",
						},
						{
							icon: FileText,
							title: "Same recovery setup",
							description:
								"Use the recovery email and answer from your account setup.",
						},
					]}
				/>
			}
			formPanel={
				<article className="rise-in w-full max-w-[340px] rounded-panel border border-border bg-panel p-6 shadow-sm sm:p-7">
					<div className="flex items-start justify-between gap-3">
						<h2 className="display-title text-2xl font-bold text-foreground">
							Reset password
						</h2>
						<ThemeToggle />
					</div>
					<p className="mt-2 text-sm text-muted-foreground">
						Enter your account email, recovery email, security answer, and a new
						password.
					</p>

					<form
						className="mt-6 space-y-4"
						onSubmit={handleResetSubmit}
						noValidate
						autoComplete="off"
					>
						<FormField
							id="account-email"
							label="Account email"
							type="email"
							value={email}
							onChange={setEmail}
							placeholder="you@example.com"
							error={fieldErrors.email}
							isDisabled={isSubmitting}
						/>
						<FormField
							id="recovery-email"
							label="Recovery email"
							type="email"
							value={recoveryEmail}
							onChange={setRecoveryEmail}
							placeholder="Recovery email you set up"
							error={fieldErrors.recoveryEmail}
							isDisabled={isSubmitting}
							autoComplete="off"
						/>
						<SecurityAnswerField
							id="answer-one"
							label="Security answer"
							value={answerOne}
							onChange={setAnswerOne}
							error={fieldErrors.answerOne}
							isDisabled={isSubmitting}
						/>
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
