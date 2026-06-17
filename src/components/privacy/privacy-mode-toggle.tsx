import { Button } from '#/components/ui/button'
import { togglePrivacyMode } from '#/features/privacy/store/privacy-mode-store'
import { usePrivacyModeEnabled } from '#/lib/privacy/sensitive-format'
import { Eye, EyeOff } from 'lucide-react'

interface PrivacyModeToggleProps {
  compact?: boolean
}

/**
 * Toggles global privacy mode for amounts and titles.
 */
export function PrivacyModeToggle({ compact = false }: PrivacyModeToggleProps) {
  const isPrivacyMode = usePrivacyModeEnabled()

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="gap-2"
      onClick={togglePrivacyMode}
      title={isPrivacyMode ? 'Show amounts and titles' : 'Hide amounts and titles'}
      aria-pressed={isPrivacyMode}
      aria-label={isPrivacyMode ? 'Disable privacy mode' : 'Enable privacy mode'}
    >
      {isPrivacyMode ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      {compact ? null : <span>Privacy mode</span>}
    </Button>
  )
}
