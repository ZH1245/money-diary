import { useAuthSession } from '#/lib/use-auth-session'
import { InlineError } from '#/components/feedback/inline-error'
import { SessionLoadingSkeleton } from '#/components/feedback/page-state'
import { AuthenticatedAppShell } from '#/components/layout/authenticated-app-shell'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from '#/lib/currency'
import { AiSettingsSection } from '#/features/settings/components/ai-settings-section'
import { ChangePasswordSection } from '#/features/auth/components/change-password-section'
import { SecurityProfileSection } from '#/features/auth/components/security-profile-section'
import { Link, Navigate, createFileRoute } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

const updateCurrencySchema = z.object({
  currency: z.string().trim().length(3, 'Select a valid currency'),
})

function SettingsPage() {
  const { data: session, isInitialPending: isSessionPending, refetch: refetchSession } = useAuthSession()
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY)
  const [isCurrencySubmitting, setIsCurrencySubmitting] = useState(false)
  const [currencyError, setCurrencyError] = useState<string | null>(null)
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
    return <SessionLoadingSkeleton />
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
            <p className="mt-2 text-sm opacity-80">
              Manage your account security, currency preferences, and AI provider settings.
            </p>
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

            <ChangePasswordSection />
          </div>

          <article className="feature-card rounded-2xl border border-border/70 p-6">
            <h2 className="text-lg font-semibold">Legal</h2>
            <p className="mt-1 text-sm opacity-80">Review how Money Diary handles your data and usage rules.</p>
            <div className="mt-4 flex flex-col gap-2 text-sm font-medium">
              <Link to="/privacy" className="underline underline-offset-4">
                Privacy Policy
              </Link>
              <Link to="/terms" className="underline underline-offset-4">
                Terms of Service
              </Link>
            </div>
          </article>

          <SecurityProfileSection />

          <AiSettingsSection />
        </section>
      </main>
    </AuthenticatedAppShell>
  )
}
