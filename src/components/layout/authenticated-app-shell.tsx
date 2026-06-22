import type { AppShellUser } from '#/components/types/app-shell'
import { authClient } from '#/lib/auth-client'
import { AUTH_ROLES } from '#/lib/auth-roles'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  BarChart3,
  ChevronUp,
  CircleDollarSign,
  Goal,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Settings,
  Shield,
  Star,
  Tags,
  WalletCards,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from '#/components/ui/sidebar'
import { WorkspaceHeaderToolbar } from '#/components/layout/workspace-header-toolbar'
import { SiteFooter } from '#/components/layout/site-footer'
import { AiTransactionPanel } from '#/components/ai/ai-transaction-panel'
import { useState } from 'react'

interface AuthenticatedAppShellProps {
  children: ReactNode
  user: AppShellUser
}

interface SidebarItem {
  title: string
  to?: '/' | '/transactions' | '/accounts' | '/savings' | '/wishlist' | '/goals' | '/analytics' | '/categories' | '/settings' | '/admin' | '/swagger'
  icon: ReactNode
  show?: boolean
  isSoon?: boolean
}

interface SidebarSection {
  label: string
  items: SidebarItem[]
}

export function AuthenticatedAppShell({ children, user }: AuthenticatedAppShellProps) {
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const fallbackText = user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const pageTitle = getWorkspacePageTitle(pathname)
  const sidebarSections: SidebarSection[] = [
    {
      label: 'Overview',
      items: [
        {
          title: 'Dashboard',
          to: '/',
          icon: <LayoutDashboard />,
        },
        {
          title: 'Analytics',
          to: '/analytics',
          icon: <BarChart3 />,
        },
      ],
    },
    {
      label: 'Finance',
      items: [
        {
          title: 'Transactions',
          to: '/transactions',
          icon: <ReceiptText />,
        },
        {
          title: 'Categories',
          to: '/categories',
          icon: <Tags />,
        },
        {
          title: 'Cards & accounts',
          to: '/accounts',
          icon: <WalletCards />,
        },
        {
          title: 'Savings',
          to: '/savings',
          icon: <CircleDollarSign />,
        },
        {
          title: 'Goals',
          to: '/goals',
          icon: <Goal />,
        },
        {
          title: 'Wishlist',
          to: '/wishlist',
          icon: <Star />,
        },
      ],
    },
    {
      label: 'Preferences',
      items: [
        {
          title: 'Settings',
          to: '/settings',
          icon: <Settings />,
        },
      ],
    },
    {
      label: 'Admin',
      items: [
        {
          title: 'Global settings',
          to: '/admin',
          icon: <Shield />,
          show: user.role === AUTH_ROLES.admin,
        },
        {
          title: 'API Docs',
          to: '/swagger',
          icon: <Shield />,
          show: user.role === AUTH_ROLES.admin,
        },
      ],
    },
  ]

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                size="lg"
                className="group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
              >
                <Link to="/" className="group-data-[collapsible=icon]:justify-center">
                  <div className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
                    <CircleDollarSign className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold">Money Diary</span>
                    <span className="truncate text-xs opacity-70">Personal finance</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {sidebarSections.map((section, index) => {
            const visibleItems = section.items.filter((item) => item.show ?? true)
            if (!visibleItems.length) return null

            return (
              <div key={section.label}>
                <SidebarGroup>
                  <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {visibleItems.map((item) => {
                        if (item.isSoon || !item.to) {
                          return (
                            <SidebarMenuItem key={item.title}>
                              <SidebarMenuButton disabled tooltip={item.title}>
                                {item.icon}
                                <span>{item.title}</span>
                                <span className="ml-auto text-[10px] uppercase tracking-wide opacity-60">
                                  Soon
                                </span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          )
                        }

                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild isActive={pathname === item.to} tooltip={item.title}>
                              <Link to={item.to}>
                                {item.icon}
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
                {index < sidebarSections.length - 1 ? <SidebarSeparator /> : null}
              </div>
            )
          })}
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
                  >
                    <Avatar className="group-data-[collapsible=icon]:size-8">
                      <AvatarImage src={user.image ?? undefined} alt={user.name ?? 'User'} />
                      <AvatarFallback className="bg-primary/15 text-foreground">{fallbackText}</AvatarFallback>
                    </Avatar>
                    <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                      <span className="truncate font-medium">{user.name || 'User'}</span>
                      <span className="truncate text-xs opacity-70">{user.email || 'No email'}</span>
                    </div>
                    <ChevronUp className="ml-auto group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="end" className="w-80 rounded-2xl border bg-popover p-2 shadow-xl">
                  <DropdownMenuLabel className="p-0">
                    <div className="flex items-center gap-3 rounded-xl p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{user.name || 'User'}</p>
                        <p className="truncate text-xs font-normal opacity-70">{user.email || 'No email'}</p>
                      </div>
                      <Avatar className="size-10">
                        <AvatarImage src={user.image ?? undefined} alt={user.name ?? 'User'} />
                        <AvatarFallback className="bg-primary/15 text-foreground">{fallbackText}</AvatarFallback>
                      </Avatar>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="text-foreground no-underline hover:text-foreground">
                      <Settings />
                      <span>Settings</span>
                      <span className="ml-auto rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide opacity-70">
                        {user.currency ?? 'USD'}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      void authClient.signOut()
                    }}
                    className="cursor-pointer text-foreground"
                  >
                    <LogOut />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 shrink-0 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/85">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-2 px-3 py-2 sm:px-4 xl:grid-cols-[auto_minmax(0,1fr)_auto]">
            <SidebarTrigger className="relative z-10 shrink-0" />
            <div className="hidden min-w-0 overflow-hidden sm:block xl:col-start-2">
              <p className="truncate text-xs font-semibold uppercase tracking-wide sm:text-sm">{pageTitle}</p>
              <p className="mt-0.5 truncate text-sm font-medium opacity-85 max-xl:hidden">
                Welcome{user.name ? `, ${user.name}` : ''}!
              </p>
            </div>
            <div className="col-span-2 flex min-w-0 justify-end xl:col-span-1 xl:col-start-3">
              <WorkspaceHeaderToolbar onOpenAiPanel={() => setAiPanelOpen(true)} />
            </div>
          </div>
          <div className="border-t px-3 py-2 sm:hidden sm:px-4">
            <p className="truncate text-xs font-semibold uppercase tracking-wide">{pageTitle}</p>
            <p className="mt-0.5 truncate text-sm font-medium opacity-85">
              Welcome{user.name ? `, ${user.name}` : ''}!
            </p>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
          <div className="flex-1">{children}</div>
          <SiteFooter showAuthLinks={false} />
        </div>
      </SidebarInset>

      <AiTransactionPanel open={aiPanelOpen} onOpenChange={setAiPanelOpen} />
    </SidebarProvider>
  )
}

function getWorkspacePageTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard'
  if (pathname.startsWith('/analytics')) return 'Analytics'
  if (pathname.startsWith('/transactions')) return 'Transactions'
  if (pathname.startsWith('/categories')) return 'Categories'
  if (pathname.startsWith('/accounts')) return 'Cards & accounts'
  if (pathname.startsWith('/savings')) return 'Savings'
  if (pathname.startsWith('/wishlist')) return 'Wishlist'
  if (pathname.startsWith('/goals')) return 'Goals'
  if (pathname.startsWith('/settings')) return 'Settings'
  if (pathname.startsWith('/admin')) return 'Global settings'
  if (pathname.startsWith('/swagger')) return 'API Docs'
  return 'Workspace'
}
