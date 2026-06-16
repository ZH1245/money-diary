import type { AppShellUser } from '#/components/types/app-shell'
import { authClient } from '#/lib/auth-client'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  ChevronUp,
  CircleDollarSign,
  Goal,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Settings,
  Shield,
  UserRound,
  WalletCards,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
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
import { Separator } from '#/components/ui/separator'

interface AuthenticatedAppShellProps {
  children: ReactNode
  user: AppShellUser
}

interface SidebarItem {
  title: string
  to?: '/' | '/transactions' | '/settings' | '/swagger'
  icon: ReactNode
  show?: boolean
  isSoon?: boolean
}

interface SidebarSection {
  label: string
  items: SidebarItem[]
}

export function AuthenticatedAppShell({ children, user }: AuthenticatedAppShellProps) {
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
          title: 'Savings',
          icon: <WalletCards />,
          isSoon: true,
        },
        {
          title: 'Goals',
          icon: <Goal />,
          isSoon: true,
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
          title: 'API Docs',
          to: '/swagger',
          icon: <Shield />,
          show: user.role === 'admin',
        },
      ],
    },
  ]

  return (
    <SidebarProvider>
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

      <SidebarInset className="min-w-0 overflow-x-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <p className="text-sm font-semibold uppercase tracking-wide">{pageTitle}</p>
          <Separator orientation="vertical" className="mx-1 h-4" />
          <p className="text-sm font-medium">Welcome{user.name ? `, ${user.name}` : ''}!</p>
        </header>
        <div className="min-w-0 flex-1 overflow-x-hidden">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function getWorkspacePageTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard'
  if (pathname.startsWith('/transactions')) return 'Transactions'
  if (pathname.startsWith('/settings')) return 'Settings'
  if (pathname.startsWith('/swagger')) return 'API Docs'
  return 'Workspace'
}
