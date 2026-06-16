import { authClient } from '#/lib/auth-client'
import { InlineError } from '#/components/feedback/inline-error'
import { FormField } from '#/components/forms/form-field'
import { AuthenticatedAppShell } from '#/components/layout/authenticated-app-shell'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from '#/lib/currency'
import { Navigate, createFileRoute } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8, 'Current password must be at least 8 characters'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Confirm password must match the new password',
    path: ['confirmPassword'],
  })

const updateCurrencySchema = z.object({
  currency: z.string().trim().length(3, 'Select a valid currency'),
})

function SettingsPage() {
  const { data: session, isPending: isSessionPending, refetch: refetchSession } = authClient.useSession()
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY)
  const [isCurrencySubmitting, setIsCurrencySubmitting] = useState(false)
  const [currencyError, setCurrencyError] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const selectedCurrency = ((session?.user as { currency?: string } | undefined)?.currency ?? DEFAULT_CURRENCY).toUpperCase()

  useEffect(() => {
    if (!session?.user) return
    if (isCurrencySubmitting || currencyError) return

    setCurrency((previousCurrency) => {
      if (previousCurrency === selectedCurrency) return previousCurrency
      return selectedCurrency
    })
  }, [session?.user, selectedCurrency, isCurrencySubmitting, currencyError])

  if (isSessionPending) {
    return (
      <main className="p-8">
        <p>Loading session...</p>
      </main>
    )
  }

  if (!session?.user) {
    return <Navigate to="/sign-in" />
  }

  async function handleCurrencySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCurrencyError(null)

    const parsed = updateCurrencySchema.safeParse({ currency })
    if (!parsed.success) {
      setCurrencyError(parsed.error.issues[0]?.message ?? 'Invalid currency')
      return
    }

    setIsCurrencySubmitting(true)

    const requestPromise = fetch('/api/settings/currency', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        currency: parsed.data.currency.toUpperCase(),
      }),
    }).then(async (response) => {
      const payload = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Unable to update currency')
      }
      return payload
    })

    toast.promise(requestPromise, {
      loading: 'Updating currency...',
      success: 'Currency updated',
      error: 'Unable to update currency',
    })

    try {
      await requestPromise
      await refetchSession()
    } catch (error) {
      setCurrencyError(error instanceof Error ? error.message : 'Unable to update currency')
    } finally {
      setIsCurrencySubmitting(false)
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordError(null)

    const parsed = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    })

    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      setPasswordError(issue?.message ?? 'Invalid password input')
      return
    }

    setIsPasswordSubmitting(true)

    const requestPromise = fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      }),
    }).then(async (response) => {
      const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? 'Unable to update password')
      }
      return payload
    })

    toast.promise(requestPromise, {
      loading: 'Updating password...',
      success: 'Password updated',
      error: 'Unable to update password',
    })

    try {
      await requestPromise
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Unable to update password')
    } finally {
      setIsPasswordSubmitting(false)
    }
  }

  return (
    <AuthenticatedAppShell
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: (session.user as { role?: string }).role,
        currency: (session.user as { currency?: string }).currency,
      }}
    >
      <main className="p-6 md:p-8">
        <section className="space-y-6">
          <div className="island-shell rounded-2xl p-6">
            <h1 className="display-title text-3xl">Settings</h1>
            <p className="mt-2 text-sm opacity-80">Manage your account security and currency preferences.</p>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <article className="feature-card rounded-xl border border-border p-5">
              <h2 className="text-lg font-semibold">Preferred Currency</h2>
              <p className="mt-1 text-xs opacity-70">
                Transaction totals are calculated and shown in this currency.
              </p>

              <form className="mt-4 space-y-4" onSubmit={handleCurrencySubmit}>
                <div>
                  <label htmlFor="currency" className="mb-1 block text-sm font-medium">
                    Currency
                  </label>
                  <Select
                    value={currency}
                    onValueChange={setCurrency}
                    disabled={isCurrencySubmitting}
                  >
                    <SelectTrigger id="currency" className="h-10 w-full">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map((currencyOption) => (
                        <SelectItem key={currencyOption.code} value={currencyOption.code}>
                          {currencyOption.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {currencyError ? <InlineError message={currencyError} /> : null}

                <button
                  type="submit"
                  disabled={isCurrencySubmitting || currency === selectedCurrency}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
                >
                  {isCurrencySubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save currency'
                  )}
                </button>
              </form>
            </article>

            <article className="feature-card rounded-xl border border-border p-5">
              <h2 className="text-lg font-semibold">Change Password</h2>
              <p className="mt-1 text-xs opacity-70">Use your current password to set a new one.</p>

              <form className="mt-4 space-y-4" onSubmit={handlePasswordSubmit}>
                <FormField
                  id="current-password"
                  label="Current password"
                  type="password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  placeholder="Current password"
                  isDisabled={isPasswordSubmitting}
                />
                <FormField
                  id="new-password"
                  label="New password"
                  type="password"
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="At least 8 characters"
                  isDisabled={isPasswordSubmitting}
                />
                <FormField
                  id="confirm-password"
                  label="Confirm password"
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Repeat new password"
                  isDisabled={isPasswordSubmitting}
                />

                {passwordError ? <InlineError message={passwordError} /> : null}

                <button
                  type="submit"
                  disabled={isPasswordSubmitting}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
                >
                  {isPasswordSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update password'
                  )}
                </button>
              </form>
            </article>
          </div>
        </section>
      </main>
    </AuthenticatedAppShell>
  )
}
