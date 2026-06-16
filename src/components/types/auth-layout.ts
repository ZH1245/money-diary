import type { ReactNode } from 'react'

/**
 * Props for the auth split-screen layout used by sign-in/sign-up routes.
 */
export interface AuthSplitLayoutProps {
  featurePanel: ReactNode
  formPanel: ReactNode
  reverseOnDesktop?: boolean
}
