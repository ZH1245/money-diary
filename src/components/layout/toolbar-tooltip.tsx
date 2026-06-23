import { Tooltip, TooltipContent, TooltipTrigger } from '#/components/ui/tooltip'
import type { ReactNode } from 'react'

interface ToolbarTooltipProps {
  label: string
  children: ReactNode
}

/** Tooltip for compact workspace header controls. Requires a root-level `TooltipProvider`. */
export function ToolbarTooltip({ label, children }: ToolbarTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
