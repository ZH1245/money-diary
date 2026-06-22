import { SessionLoadingSkeleton } from '#/components/feedback/page-state'
import { useSecurityProfile } from '#/features/auth/hooks/use-security-profile'
import { Navigate } from '@tanstack/react-router'

/** Sends signed-in users to the dashboard or security setup, depending on profile state. */
export function AuthenticatedEntryRedirect() {
  const { data: profile, isLoading, isError } = useSecurityProfile()

  if (isLoading) {
    return <SessionLoadingSkeleton />
  }

  if (isError || !profile) {
    return <Navigate to="/setup-security" />
  }

  return <Navigate to="/" />
}
