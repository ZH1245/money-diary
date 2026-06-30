import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, Loader2, MessageSquare, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { InlineError } from "#/components/feedback/inline-error";
import { FormField } from "#/components/forms/form-field";
import { AuthFeaturePanel } from "#/components/layout/auth-feature-panel";
import { AuthSplitLayout } from "#/components/layout/auth-split-layout";
import { ThemeToggle } from "#/components/layout/theme-toggle";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from "#/components/ui/input-otp";
import { AuthenticatedEntryRedirect } from "#/features/auth/components/authenticated-entry-redirect";
import { authClient } from "#/lib/auth-client";
import {
	buildPublicPageHead,
	SIGN_IN_SEO,
} from "#/lib/seo/public-seo";

export const Route = createFileRoute("/sign-in")({
	component: SignInPage,
	head: () =>
		buildPublicPageHead({
			...SIGN_IN_SEO,
			path: "/sign-in",
		}),
});

const signInSchema = z.object({
	email: z.string().email("Enter a valid email address"),
	password: z.string().min(8, "Password must be at least 8 characters"),
});

const otpEmailSchema = z.string().email("Enter a valid email address");
const otpCodeSchema = z.string().regex(/^\d{6}$/, "Enter the 6-digit code");

function SignInPage() {
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [mode, setMode] = useState<"password" | "otp">("password");
	const [otpCode, setOtpCode] = useState("");
	const [otpSent, setOtpSent] = useState(false);
	const [isSendingOtp, setIsSendingOtp] = useState(false);

	if (session?.user) {
		return <AuthenticatedEntryRedirect />;
	}

	async function handleSendOtp() {
		setErrorMessage(null);
		const parsedEmail = otpEmailSchema.safeParse(email);
		if (!parsedEmail.success) {
			setFieldErrors((previous) => ({
				...previous,
				email: parsedEmail.error.issues[0]?.message ?? "Invalid email",
			}));
			return;
		}

		setIsSendingOtp(true);
		const requestPromise = authClient.emailOtp.sendVerificationOtp({
			email,
			type: "sign-in",
		});
		const sendPromise = requestPromise.then((result) => {
			if (result.error)
				throw new Error(result.error.message ?? "Unable to send code");
			return result;
		});

		toast.promise(sendPromise, {
			loading: "Sending code...",
			success: "Code sent — check your email",
			error: "Unable to send code",
		});

		const result = await requestPromise;

		setIsSendingOtp(false);

		if (result.error) {
			setErrorMessage(result.error.message ?? "Unable to send code");
			return;
		}

		setOtpSent(true);
	}

	async function handleVerifyOtp(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setErrorMessage(null);

		const parsedCode = otpCodeSchema.safeParse(otpCode);
		if (!parsedCode.success) {
			setFieldErrors((previous) => ({
				...previous,
				otp: parsedCode.error.issues[0]?.message ?? "Invalid code",
			}));
			return;
		}

		setIsSubmitting(true);
		const requestPromise = authClient.signIn.emailOtp({
			email,
			otp: otpCode,
		});
		const verifyPromise = requestPromise.then((result) => {
			if (result.error)
				throw new Error(result.error.message ?? "Unable to sign in");
			return result;
		});

		toast.promise(verifyPromise, {
			loading: "Signing in...",
			success: "Signed in successfully",
			error: "Unable to sign in",
		});

		const result = await requestPromise;

		setIsSubmitting(false);

		if (result.error) {
			setErrorMessage(result.error.message ?? "Unable to sign in");
			return;
		}

		await navigate({ to: "/dashboard" });
	}

	function getFieldError(field: "email" | "password", value: string): string {
		const schema = signInSchema.shape[field];
		const parsed = schema.safeParse(value);
		if (parsed.success) return "";
		return parsed.error.issues[0]?.message ?? "Invalid value";
	}

	function handleEmailChange(nextValue: string) {
		setEmail(nextValue);
		setErrorMessage(null);
		setFieldErrors((previous) => ({
			...previous,
			email: getFieldError("email", nextValue),
		}));
	}

	function handlePasswordChange(nextValue: string) {
		setPassword(nextValue);
		setErrorMessage(null);
		setFieldErrors((previous) => ({
			...previous,
			password: getFieldError("password", nextValue),
		}));
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setErrorMessage(null);
		setFieldErrors({});

		const parsed = signInSchema.safeParse({ email, password });

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

		const moderationResponse = await fetch("/api/auth/sign-in-moderation", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email }),
		});
		const moderationPayload = (await moderationResponse
			.json()
			.catch(() => null)) as {
			success?: boolean;
			error?: string;
			data?: {
				allowed?: boolean;
				accountStatus?: string;
				moderationReason?: string;
			};
		} | null;

		if (moderationPayload?.data?.allowed === false) {
			setIsSubmitting(false);
			setErrorMessage(
				moderationPayload.data.moderationReason?.trim() ||
					"Access to this account is not available.",
			);
			return;
		}

		if (!moderationResponse.ok) {
			setIsSubmitting(false);
			const serverError =
				moderationPayload &&
				"error" in moderationPayload &&
				typeof moderationPayload.error === "string"
					? moderationPayload.error
					: null;
			setErrorMessage(
				serverError ??
					"Unable to verify account status. Try again in a moment.",
			);
			return;
		}

		const requestPromise = authClient.signIn.email({
			email,
			password,
		});
		const submitPromise = requestPromise.then((result) => {
			if (result.error)
				throw new Error(result.error.message ?? "Unable to sign in");
			return result;
		});

		toast.promise(submitPromise, {
			loading: "Signing in...",
			success: "Signed in successfully",
			error: "Unable to sign in",
		});

		const result = await requestPromise;

		setIsSubmitting(false);

		if (result.error) {
			setErrorMessage(result.error.message ?? "Unable to sign in");
			return;
		}

		await navigate({ to: "/dashboard" });
	}

	return (
		<AuthSplitLayout
			featurePanel={
				<AuthFeaturePanel
					kicker="Money Diary AI"
					title="Your AI finance copilot awaits."
					description="Sign in to chat with your diary — log entries, review spending, and manage goals without the busywork."
					tags={["Natural language", "Smart summaries", "Secure workspace"]}
					features={[
						{
							icon: MessageSquare,
							title: "Chat to log money in or out",
							description:
								"Tell AI what happened; it picks the account, category, and amount for you.",
						},
						{
							icon: BarChart3,
							title: "Instant answers from your ledger",
							description:
								"Ask for monthly totals, category breakdowns, or date-wise spending — no spreadsheet required.",
						},
						{
							icon: Sparkles,
							title: "Update goals and wishlist by voice of text",
							description:
								"Adjust targets, add wishlist items, or record savings through conversation.",
						},
					]}
				/>
			}
			formPanel={
				<article className="rise-in w-full max-w-[340px] rounded-panel border border-border bg-panel p-6 shadow-sm sm:p-7">
					<div className="flex items-start justify-between gap-3">
						<h2 className="display-title text-2xl font-bold text-foreground">
							Sign in
						</h2>
						<ThemeToggle />
					</div>
					<p className="mt-2 text-sm text-muted-foreground">
						Access your account to continue.
					</p>

					<div className="mt-5 grid grid-cols-2 gap-1 rounded-md border border-border bg-muted/40 p-1">
						<button
							type="button"
							onClick={() => {
								setMode("password");
								setErrorMessage(null);
							}}
							className={`h-8 rounded text-xs font-medium transition-colors ${
								mode === "password"
									? "bg-panel text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							Password
						</button>
						<button
							type="button"
							onClick={() => {
								setMode("otp");
								setErrorMessage(null);
							}}
							className={`h-8 rounded text-xs font-medium transition-colors ${
								mode === "otp"
									? "bg-panel text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							Email code
						</button>
					</div>

					{mode === "password" ? (
						<form
							className="mt-4 space-y-4"
							onSubmit={handleSubmit}
							noValidate
						>
							<FormField
								id="email"
								label="Email"
								type="email"
								value={email}
								onChange={handleEmailChange}
								placeholder="you@example.com"
								error={fieldErrors.email}
								isDisabled={isSubmitting}
							/>
							<FormField
								id="password"
								label="Password"
								type="password"
								value={password}
								onChange={handlePasswordChange}
								placeholder="At least 8 characters"
								error={fieldErrors.password}
								isDisabled={isSubmitting}
								autoComplete="current-password"
							/>

							<p className="text-right text-sm">
								<Link
									to="/forgot-password"
									className="font-medium text-primary underline-offset-4 hover:underline"
								>
									Forgot password?
								</Link>
							</p>

							{errorMessage ? <InlineError message={errorMessage} /> : null}

							<button
								type="submit"
								disabled={isSubmitting}
								className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
							>
								{isSubmitting ? (
									<>
										<Loader2 className="h-4 w-4 animate-spin" />
										Signing in...
									</>
								) : (
									"Sign in"
								)}
							</button>
						</form>
					) : (
						<form
							className="mt-4 space-y-4"
							onSubmit={handleVerifyOtp}
							noValidate
						>
							<FormField
								id="email"
								label="Email"
								type="email"
								value={email}
								onChange={(nextValue) => {
									handleEmailChange(nextValue);
									setOtpSent(false);
								}}
								placeholder="you@example.com"
								error={fieldErrors.email}
								isDisabled={isSubmitting || isSendingOtp}
							/>

							{otpSent ? (
								<div className="space-y-2">
									<label
										htmlFor="otp"
										className="text-sm font-medium text-foreground"
									>
										6-digit code
									</label>
									<InputOTP
										id="otp"
										maxLength={6}
										value={otpCode}
										onChange={(nextValue) => {
											setOtpCode(nextValue);
											setErrorMessage(null);
											setFieldErrors((previous) => ({ ...previous, otp: "" }));
										}}
										disabled={isSubmitting}
										autoComplete="one-time-code"
										containerClassName="justify-center"
									>
										<InputOTPGroup>
											<InputOTPSlot index={0} />
											<InputOTPSlot index={1} />
											<InputOTPSlot index={2} />
											<InputOTPSlot index={3} />
											<InputOTPSlot index={4} />
											<InputOTPSlot index={5} />
										</InputOTPGroup>
									</InputOTP>
									{fieldErrors.otp ? (
										<InlineError message={fieldErrors.otp} />
									) : null}
								</div>
							) : null}

							{errorMessage ? <InlineError message={errorMessage} /> : null}

							{otpSent ? (
								<>
									<button
										type="submit"
										disabled={isSubmitting}
										className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
									>
										{isSubmitting ? (
											<>
												<Loader2 className="h-4 w-4 animate-spin" />
												Signing in...
											</>
										) : (
											"Verify and sign in"
										)}
									</button>
									<button
										type="button"
										onClick={handleSendOtp}
										disabled={isSendingOtp}
										className="w-full text-center text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-60"
									>
										{isSendingOtp ? "Sending..." : "Resend code"}
									</button>
								</>
							) : (
								<button
									type="button"
									onClick={handleSendOtp}
									disabled={isSendingOtp}
									className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
								>
									{isSendingOtp ? (
										<>
											<Loader2 className="h-4 w-4 animate-spin" />
											Sending...
										</>
									) : (
										"Send code"
									)}
								</button>
							)}
						</form>
					)}

					<p className="mt-6 text-center text-sm text-muted-foreground">
						New here?{" "}
						<Link
							to="/sign-up"
							className="font-medium text-primary underline-offset-4 hover:underline"
						>
							Create an account
						</Link>
					</p>

					<p className="mt-4 text-center text-xs text-muted-foreground">
						<Link to="/terms" className="underline-offset-4 hover:underline">
							Terms of Service
						</Link>
						{" · "}
						<Link to="/privacy" className="underline-offset-4 hover:underline">
							Privacy Policy
						</Link>
					</p>
				</article>
			}
		/>
	);
}
