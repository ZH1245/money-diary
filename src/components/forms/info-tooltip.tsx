import { Button } from '#/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '#/components/ui/tooltip'
import { Info } from 'lucide-react'

interface InfoTooltipProps {
  content: string
  label?: string
}

/** Small info icon that reveals helper text on hover or focus. */
export function InfoTooltip({ content, label = 'More information' }: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-6 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
            aria-label={label}
          >
            <Info className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6} className="max-w-xs text-left leading-relaxed">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
