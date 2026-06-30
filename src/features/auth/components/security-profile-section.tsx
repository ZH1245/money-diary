import { FormField } from '#/components/forms/form-field'
import { InlineError } from '#/components/feedback/inline-error'
import {
	SecurityProfileFields,
	getDefaultSecurityProfileFormValues,
} from '#/features/auth/components/security-profile-fields'
import {
	createSecurityProfileRequest,
	fetchSecurityProfile,
	SecurityProfileRequestError,
	updateSecurityProfileRequest,
} from '#/features/auth/api/security-profile-api'
import type { SecurityProfileStatus } from '#/features/auth/api/security-profile-api'
import { createSecurityProfileSchema, updateSecurityProfileSchema } from '#/features/auth/schemas/security-profile'
import { queryKeys } from '#/features/query-keys'
import { useAuthSession } from '#/lib/use-auth-session'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

/** Settings card for viewing and updating account recovery details. */
export function SecurityProfileSection() {
	const queryClient = useQueryClient()
	const { data: session } = useAuthSession()
	const [profile, setProfile] = useState<SecurityProfileStatus | null>(null)
	const [hasProfile, setHasProfile] = useState(false)
	const [isLoading, setIsLoading] = useState(true)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
	const [currentPassword, setCurrentPassword] = useState('')
	const [form, setForm] = useState(getDefaultSecurityProfileFormValues())

	// Recovery email change sub-form state
	const [recoveryEmailValue, setRecoveryEmailValue] = useState('')
	const [recoveryEmailPassword, setRecoveryEmailPassword] = useState('')
	const [isRecoveryEmailSubmitting, setIsRecoveryEmailSubmitting] = useState(false)
	const [recoveryEmailError, setRecoveryEmailError] = useState<string | null>(null)
	const [recoveryEmailFieldError, setRecoveryEmailFieldError] = useState<string | null>(null)

	useEffect(() => {
		async function loadProfile() {
			setIsLoading(true)
			try {
				const loaded = await fetchSecurityProfile()
				if (loaded) {
					setProfile(loaded)
					setHasProfile(true)
					setForm((previous) => ({
						...previous,
						questionOneKey: 'childhood_nickname',
						answerOne: '',
					}))
				}
			} finally {
				setIsLoading(false)
			}
		}

		void loadProfile()
	}, [])

	useEffect(() => {
		const accountEmail = session?.user?.email
		if (!accountEmail || hasProfile) {
			return
		}

		setForm((previous) =>
			previous.recoveryEmail === accountEmail ? previous : { ...previous, recoveryEmail: accountEmail },
		)
	}, [hasProfile, session?.user?.email])

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setErrorMessage(null)
		setFieldErrors({})

		const schema = hasProfile ? updateSecurityProfileSchema : createSecurityProfileSchema
		const parsed = schema.safeParse(
			hasProfile
				? {
						currentPassword,
						questionOneKey: form.questionOneKey,
						answerOne: form.answerOne || undefined,
					}
				: {
						questionOneKey: form.questionOneKey,
						answerOne: form.answerOne,
					},
		)

		if (!parsed.success) {
			const nextErrors: Record<string, string> = {}
			for (const issue of parsed.error.issues) {
				const key = issue.path[0]
				if (typeof key === 'string' && !nextErrors[key]) {
					nextErrors[key] = issue.message
				}
			}
			setFieldErrors(nextErrors)
			return
		}

		setIsSubmitting(true)
		try {
			if (hasProfile) {
				const updated = await updateSecurityProfileRequest({
					currentPassword,
					questionOneKey: form.questionOneKey,
					answerOne: form.answerOne || undefined,
				})
				setProfile(updated)
			} else {
				const created = await createSecurityProfileRequest({
					questionOneKey: form.questionOneKey,
					answerOne: form.answerOne,
				})
				setProfile(created)
			}

			setHasProfile(true)
			setCurrentPassword('')
			setForm((previous) => ({ ...previous, answerOne: '' }))
			await queryClient.invalidateQueries({ queryKey: queryKeys.auth.securityProfile })
			toast.success('Recovery settings saved')
		} catch (error) {
			if (error instanceof SecurityProfileRequestError && error.fieldErrors) {
				setFieldErrors(error.fieldErrors)
			}
			setErrorMessage(error instanceof Error ? error.message : 'Unable to save recovery settings')
		} finally {
			setIsSubmitting(false)
		}
	}

	async function handleRecoveryEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setRecoveryEmailError(null)
		setRecoveryEmailFieldError(null)

		const emailTrimmed = recoveryEmailValue.trim()
		if (!emailTrimmed) {
			setRecoveryEmailFieldError('Enter a recovery email address')
			return
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
			setRecoveryEmailFieldError('Enter a valid email address')
			return
		}
		if (!recoveryEmailPassword) {
			setRecoveryEmailError('Current password is required')
			return
		}

		setIsRecoveryEmailSubmitting(true)
		const promise = updateSecurityProfileRequest({
			currentPassword: recoveryEmailPassword,
			recoveryEmail: emailTrimmed,
		})

		toast.promise(promise, {
			loading: 'Saving recovery email…',
			success: 'Recovery email updated. It is now unverified until verified.',
			error: (error: unknown) =>
				error instanceof Error ? error.message : 'Unable to update recovery email',
		})

		try {
			const updated = await promise
			setProfile(updated)
			setRecoveryEmailValue('')
			setRecoveryEmailPassword('')
			await queryClient.invalidateQueries({ queryKey: queryKeys.auth.securityProfile })
		} catch (error) {
			if (error instanceof SecurityProfileRequestError && error.fieldErrors?.recoveryEmail) {
				setRecoveryEmailFieldError(error.fieldErrors.recoveryEmail)
			} else {
				setRecoveryEmailError(error instanceof Error ? error.message : 'Unable to update recovery email')
			}
		} finally {
			setIsRecoveryEmailSubmitting(false)
		}
	}

	return (
		<article className="feature-card rounded-xl border border-border p-5 xl:col-span-2">
			<h2 className="text-lg font-semibold">Account recovery</h2>
			<p className="mt-1 text-xs opacity-70">
				Your sign-in email is used for password reset. Email OTP verification is planned later.
			</p>

			{isLoading ? (
				<p className="mt-4 flex items-center gap-2 text-sm opacity-70">
					<Loader2 className="size-4 animate-spin" />
					Loading recovery settings...
				</p>
			) : (
				<>
					<form className="mt-4 space-y-4" onSubmit={handleSubmit} autoComplete="off">
						{hasProfile ? (
							<FormField
								id="recovery-current-password"
								label="Current password"
								type="password"
								value={currentPassword}
								onChange={setCurrentPassword}
								placeholder="Required to update recovery settings"
								isDisabled={isSubmitting}
								autoComplete="current-password"
							/>
						) : null}

						<SecurityProfileFields
							values={form}
							fieldErrors={fieldErrors}
							isDisabled={isSubmitting}
							recoveryEmailReadOnly
							onRecoveryEmailChange={(value) => setForm((previous) => ({ ...previous, recoveryEmail: value }))}
							onQuestionOneKeyChange={(value) => setForm((previous) => ({ ...previous, questionOneKey: value }))}
							onAnswerOneChange={(value) => setForm((previous) => ({ ...previous, answerOne: value }))}
						/>

						{hasProfile ? (
							<p className="text-xs opacity-70">
								Leave the answer blank to keep your existing answer. Fill it in only when changing the question or answer.
							</p>
						) : null}

						{errorMessage ? <InlineError message={errorMessage} /> : null}

						<button
							type="submit"
							disabled={isSubmitting}
							className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
						>
							{isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
							{hasProfile ? 'Update recovery settings' : 'Save recovery settings'}
						</button>
					</form>

					{hasProfile ? (
						<div className="mt-6 border-t border-border pt-6">
							<h3 className="text-sm font-semibold">Recovery email</h3>
							<p className="mt-1 text-xs opacity-70">
								Used to verify your identity when resetting your password.
							</p>

							{profile ? (
								<div className="mt-2 flex items-center gap-2 text-sm">
									<span className="font-mono">{profile.recoveryEmail}</span>
									{profile.recoveryEmailVerified ? (
										<span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
											Verified
										</span>
									) : (
										<span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500">
											Unverified
										</span>
									)}
								</div>
							) : null}

							<form className="mt-3 space-y-3" onSubmit={handleRecoveryEmailSubmit} autoComplete="off">
								<FormField
									id="change-recovery-email"
									label="New recovery email"
									type="email"
									value={recoveryEmailValue}
									onChange={setRecoveryEmailValue}
									placeholder="backup@example.com"
									isDisabled={isRecoveryEmailSubmitting}
									isRequired={false}
									error={recoveryEmailFieldError ?? undefined}
									autoComplete="section-new-recovery email"
								/>

								<FormField
									id="change-recovery-email-password"
									label="Current password"
									type="password"
									value={recoveryEmailPassword}
									onChange={setRecoveryEmailPassword}
									placeholder="Required to change recovery email"
									isDisabled={isRecoveryEmailSubmitting}
									autoComplete="current-password"
								/>

								<p className="text-xs opacity-70">
									Changing your recovery email marks it as unverified. Verification will be available soon.
								</p>

								{recoveryEmailError ? <InlineError message={recoveryEmailError} /> : null}

								<button
									type="submit"
									disabled={isRecoveryEmailSubmitting}
									className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
								>
									{isRecoveryEmailSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
									Save recovery email
								</button>
							</form>
						</div>
					) : null}
				</>
			)}
		</article>
	)
}
