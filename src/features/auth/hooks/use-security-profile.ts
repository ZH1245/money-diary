import { useQuery } from '@tanstack/react-query'
import { fetchSecurityProfile } from '#/features/auth/api/security-profile-api'
import { queryKeys } from '#/features/query-keys'

/** Reads whether the signed-in user has configured account recovery. */
export function useSecurityProfile(enabled = true) {
  return useQuery({
    queryKey: queryKeys.auth.securityProfile,
    queryFn: fetchSecurityProfile,
    enabled,
    staleTime: 30_000,
  })
}
