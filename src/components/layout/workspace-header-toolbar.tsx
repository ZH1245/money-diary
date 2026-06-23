import { DashboardDateRangeFilter } from '#/components/layout/dashboard-date-range-filter'
import { QueryRefreshButton } from '#/components/feedback/query-refresh-button'
import { PrivacyModeToggle } from '#/components/privacy/privacy-mode-toggle'
import { ThemeToggle } from '#/components/layout/theme-toggle'
import { ToolbarTooltip } from '#/components/layout/toolbar-tooltip'
import { toolbarExpandableButtonClass } from '#/components/layout/toolbar-control-styles'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Link } from '@tanstack/react-router'
import { Goal, Plus, ReceiptText, Sparkles, Star, Tags, WalletCards } from 'lucide-react'

interface WorkspaceHeaderToolbarProps {
  onOpenAiPanel: () => void
}

/**
 * Responsive workspace header actions: compact icons on mobile/tablet, labels only on xl+.
 */
export function WorkspaceHeaderToolbar({ onOpenAiPanel }: WorkspaceHeaderToolbarProps) {
  return (
    <div className="flex max-w-full min-w-0 items-center justify-end gap-1 overflow-x-auto sm:gap-1.5">
        <DashboardDateRangeFilter />

        <div
          aria-hidden
          className="mx-0.5 hidden w-px shrink-0 self-stretch bg-border sm:block"
        />

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <ThemeToggle />
          <PrivacyModeToggle />
          <QueryRefreshButton />
        </div>

        <div
          aria-hidden
          className="mx-0.5 hidden w-px shrink-0 self-stretch bg-border sm:block"
        />

        <div className="flex shrink-0 items-center gap-1.5">
          <ToolbarTooltip label="AI assistant">
            <Button
              type="button"
              variant="outline"
              className={toolbarExpandableButtonClass}
              onClick={onOpenAiPanel}
              aria-label="Open AI assistant"
            >
              <Sparkles className="size-4 shrink-0 text-primary" />
              <span className="hidden xl:inline">AI</span>
            </Button>
          </ToolbarTooltip>
          <DropdownMenu>
            <ToolbarTooltip label="Create transaction, saving, wishlist, and more">
              <DropdownMenuTrigger asChild>
                <Button type="button" className={toolbarExpandableButtonClass} aria-label="Create">
                  <Plus className="size-4 shrink-0" />
                  <span className="hidden xl:inline">Create</span>
                </Button>
              </DropdownMenuTrigger>
            </ToolbarTooltip>
            <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Create</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/transactions" className="text-foreground no-underline hover:text-foreground">
                <ReceiptText />
                <span>Create transaction</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/savings" className="text-foreground no-underline hover:text-foreground">
                <WalletCards />
                <span>Add saving</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/wishlist" className="text-foreground no-underline hover:text-foreground">
                <Star />
                <span>Add wishlist item</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/categories" className="text-foreground no-underline hover:text-foreground">
                <Tags />
                <span>Add category</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/goals" className="text-foreground no-underline hover:text-foreground">
                <Goal />
                <span>Add goal</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
