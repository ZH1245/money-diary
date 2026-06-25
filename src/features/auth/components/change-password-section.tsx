import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { InlineError } from "#/components/feedback/inline-error";
import { FormField } from "#/components/forms/form-field";
import { SecurityAnswerField } from "#/components/forms/security-answer-field";
import { useSecurityProfile } from "#/features/auth/hooks/use-security-profile";
import { changePasswordFormSchema } from "#/features/auth/schemas/security-profile";
import { authClient } from "#/lib/auth-client";

/** Settings card for changing password with private recovery verification. */
export function ChangePasswordSection() {
	const navigate = useNavigate();
	const { data: profileStatus, isLoading: isProfileLoading } =
		useSecurityProfile();
	const hasRecoveryProfile = Boolean(profileStatus?.hasProfile);
	const [recoveryEmail, setRecoveryEmail] = useState("");
	const [answerOne, setAnswerOne] = useState("");
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setErrorMessage(null);
		setFieldErrors({});

		const parsed = changePasswordFormSchema.safeParse({
			currentPassword,
			newPassword,
			confirmPassword,
			recoveryEmail: hasRecoveryProfile ? recoveryEmail : undefined,
			answerOne: hasRecoveryProfile ? answerOne : undefined,
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
			const response = await fetch("/api/auth/change-password", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					currentPassword: parsed.data.currentPassword,
					newPassword: parsed.data.newPassword,
					recoveryEmail: parsed.data.recoveryEmail,
					answerOne: parsed.data.answerOne,
				}),
			});

			const payload = (await response.json().catch(() => null)) as {
				success?: boolean;
				error?: string;
			} | null;

			if (!response.ok || !payload?.success) {
				throw new Error(payload?.error ?? "Unable to update password");
			}

			toast.success("Password updated. Sign in again on all devices.");
			await authClient.signOut();
			await navigate({ to: "/sign-in" });
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Unable to update password",
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<article className="md-panel p-5 md:p-6">
			<h2 className="text-lg font-semibold text-foreground">Change Password</h2>
			<p className="mt-1 text-xs text-muted-foreground">
				{hasRecoveryProfile
					? "Enter your recovery details and current password. All active sessions will be signed out."
					: "Use your current password to set a new one."}
			</p>

			{isProfileLoading ? (
				<p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
					<Loader2 className="size-4 animate-spin" />
					Loading...
				</p>
			) : (
				<form
					className="mt-4 space-y-4"
					onSubmit={handleSubmit}
					autoComplete="off"
				>
					{hasRecoveryProfile ? (
						<>
							<FormField
								id="change-password-recovery-email"
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
								id="change-password-answer-one"
								label="Security answer"
								value={answerOne}
								onChange={setAnswerOne}
								error={fieldErrors.answerOne}
								isDisabled={isSubmitting}
							/>
						</>
					) : null}

					<FormField
						id="current-password"
						label="Current password"
						type="password"
						value={currentPassword}
						onChange={setCurrentPassword}
						placeholder="Current password"
						error={fieldErrors.currentPassword}
						isDisabled={isSubmitting}
						autoComplete="current-password"
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
						className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
					>
						{isSubmitting ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" />
								Updating...
							</>
						) : (
							"Update password"
						)}
					</button>
				</form>
			)}
		</article>
	);
}
