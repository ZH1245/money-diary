import { Button } from '#/components/ui/button'
import { toolbarExpandableButtonClass } from '#/components/layout/toolbar-control-styles'
import { ToolbarTooltip } from '#/components/layout/toolbar-tooltip'
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
  const tooltipLabel = isPrivacyMode ? 'Show amounts and titles' : 'Hide amounts and titles'

  return (
    <ToolbarTooltip label={tooltipLabel}>
      <Button
        type="button"
        variant="ghost"
        className={toolbarExpandableButtonClass}
        onClick={togglePrivacyMode}
        aria-pressed={isPrivacyMode}
        aria-label={tooltipLabel}
      >
        {isPrivacyMode ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        {compact ? null : <span className="hidden xl:inline">Privacy</span>}
      </Button>
    </ToolbarTooltip>
  )
}
