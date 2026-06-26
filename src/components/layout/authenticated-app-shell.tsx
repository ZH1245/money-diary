import { Link, Navigate, useRouterState } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
	BarChart3,
	ChevronUp,
	CircleDollarSign,
	Goal,
	LayoutDashboard,
	LogOut,
	Menu,
	PanelLeftClose,
	PanelLeftOpen,
	Plus,
	ReceiptText,
	Settings,
	Shield,
	Sparkles,
	Star,
	Tags,
	WalletCards,
	X,
} from "lucide-react";
import { type ComponentType, type ReactNode, useState } from "react";
import { AiTransactionPanel } from "#/components/ai/ai-transaction-panel";
import { SessionLoadingSkeleton } from "#/components/feedback/page-state";
import { QueryRefreshButton } from "#/components/feedback/query-refresh-button";
import { DashboardDateRangeFilter } from "#/components/layout/dashboard-date-range-filter";
import { SiteFooter } from "#/components/layout/site-footer";
import { ThemeControls } from "#/components/layout/theme-toggle";
import { WorkspaceHeaderToolbar } from "#/components/layout/workspace-header-toolbar";
import { PrivacyModeToggle } from "#/components/privacy/privacy-mode-toggle";
import type { AppShellUser } from "#/components/types/app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { useAccountModerationGuard } from "#/features/auth/hooks/use-account-moderation-guard";
import { useSecurityProfile } from "#/features/auth/hooks/use-security-profile";
import { TransactionFormSheet } from "#/features/transactions/components/transaction-form-sheet";
import {
	openQuickAddTransaction,
	quickAddTransactionStore,
	setQuickAddTransactionOpen,
} from "#/features/transactions/store/quick-add-transaction-store";
import { useIsMobile } from "#/hooks/use-is-mobile";
import { authClient } from "#/lib/auth-client";
import { AUTH_ROLES } from "#/lib/auth-roles";
import { cn } from "#/lib/utils";

interface AuthenticatedAppShellProps {
	children: ReactNode;
	user: AppShellUser;
}

type NavTo =
	| "/"
	| "/transactions"
	| "/accounts"
	| "/savings"
	| "/wishlist"
	| "/goals"
	| "/analytics"
	| "/categories"
	| "/settings"
	| "/admin"
	| "/swagger";

interface NavItem {
	title: string;
	to: NavTo;
	icon: ComponentType<{ className?: string }>;
	show?: boolean;
}

interface NavSection {
	label: string;
	items: NavItem[];
}

export function AuthenticatedAppShell({
	children,
	user,
}: AuthenticatedAppShellProps) {
	const { data: profile, isLoading: isProfileLoading } = useSecurityProfile();
	useAccountModerationGuard(user.role);
	const isMobile = useIsMobile();
	const quickAddOpen = useStore(
		quickAddTransactionStore,
		(state) => state.isOpen,
	);
	const [aiPanelOpen, setAiPanelOpen] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [mobileNavOpen, setMobileNavOpen] = useState(false);
	const isAdmin = user.role === AUTH_ROLES.admin;
	const fallbackText =
		user.name?.charAt(0).toUpperCase() ||
		user.email?.charAt(0).toUpperCase() ||
		"U";

	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const pageTitle = getWorkspacePageTitle(pathname);
	const pageSubtitle = getWorkspacePageSubtitle(pathname);

	const sections: NavSection[] = [
		{
			label: "Overview",
			items: [
				{ title: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
				{ title: "Analytics", to: "/analytics", icon: BarChart3 },
			],
		},
		{
			label: "Finance",
			items: [
				{ title: "Transactions", to: "/transactions", icon: ReceiptText },
				{ title: "Categories", to: "/categories", icon: Tags },
				{ title: "Cards & accounts", to: "/accounts", icon: WalletCards },
				{ title: "Savings", to: "/savings", icon: CircleDollarSign },
				{ title: "Goals", to: "/goals", icon: Goal },
				{ title: "Wishlist", to: "/wishlist", icon: Star },
			],
		},
		{
			label: "Preferences",
			items: [{ title: "Settings", to: "/settings", icon: Settings }],
		},
		{
			label: "Admin",
			items: [
				{ title: "Global settings", to: "/admin", icon: Shield, show: isAdmin },
				{ title: "API Docs", to: "/swagger", icon: Shield, show: isAdmin },
			],
		},
	];

	if (isProfileLoading) {
		return <SessionLoadingSkeleton />;
	}

	if (!profile) {
		return <Navigate to="/setup-security" />;
	}

	const userBlock = (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className={cn(
						"flex w-full items-center gap-3 rounded-xl border border-transparent p-2 text-left transition-colors hover:bg-nav-hover",
						collapsed && "justify-center",
					)}
				>
					<Avatar className="size-8 shrink-0">
						<AvatarImage
							src={user.image ?? undefined}
							alt={user.name ?? "User"}
						/>
						<AvatarFallback className="bg-avatar text-avatar-fg text-xs font-bold">
							{fallbackText}
						</AvatarFallback>
					</Avatar>
					{!collapsed && (
						<>
							<span className="grid min-w-0 flex-1 leading-tight">
								<span className="truncate text-xs font-semibold">
									{user.name || "User"}
								</span>
								<span className="truncate text-[11px] text-muted-foreground">
									{user.email || "No email"}
								</span>
							</span>
							<ChevronUp className="size-4 shrink-0 text-muted-foreground" />
						</>
					)}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				side="top"
				align="end"
				className="w-72 rounded-2xl p-2"
			>
				<DropdownMenuLabel className="p-0">
					<div className="flex items-center gap-3 rounded-xl p-3">
						<Avatar className="size-10">
							<AvatarImage
								src={user.image ?? undefined}
								alt={user.name ?? "User"}
							/>
							<AvatarFallback className="bg-avatar text-avatar-fg font-bold">
								{fallbackText}
							</AvatarFallback>
						</Avatar>
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-semibold">
								{user.name || "User"}
							</p>
							<p className="truncate text-xs font-normal text-muted-foreground">
								{user.email || "No email"}
							</p>
						</div>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link
						to="/settings"
						className="text-foreground no-underline hover:text-foreground"
					>
						<Settings />
						<span>Settings</span>
						<span className="ml-auto rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
							{user.currency ?? "USD"}
						</span>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={() => void authClient.signOut()}
					className="cursor-pointer text-foreground"
				>
					<LogOut />
					<span>Sign out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);

	const quickAddSheet = (
		<TransactionFormSheet
			open={quickAddOpen}
			onOpenChange={setQuickAddTransactionOpen}
			userCurrency={user.currency ?? "USD"}
		/>
	);

	// ---------- Mobile shell ----------
	if (isMobile) {
		return (
			<div className="flex h-svh flex-col overflow-hidden bg-canvas text-foreground">
				<header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
					<Link
						to="/dashboard"
						aria-label="Dashboard"
						className="flex items-center no-underline"
					>
						<span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
							<CircleDollarSign className="size-4" />
						</span>
					</Link>
					<span className="truncate text-[15px] font-extrabold tracking-tight">
						{pageTitle}
					</span>
					<div className="flex items-center gap-1.5">
						<PrivacyModeToggle compact />
						<button
							type="button"
							onClick={() => setAiPanelOpen(true)}
							aria-label="Open AI assistant"
							className="flex size-9 items-center justify-center rounded-lg bg-soft-accent text-primary"
						>
							<Sparkles className="size-[18px]" />
						</button>
						<Link to="/settings" aria-label="Settings" className="no-underline">
							<Avatar className="size-8">
								<AvatarImage
									src={user.image ?? undefined}
									alt={user.name ?? "User"}
								/>
								<AvatarFallback className="bg-avatar text-avatar-fg text-xs font-bold">
									{fallbackText}
								</AvatarFallback>
							</Avatar>
						</Link>
					</div>
				</header>

				<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
					<div className="min-w-0 flex-1">{children}</div>
					<SiteFooter showAuthLinks={false} />
				</div>

				<MobileBottomNav
					pathname={pathname}
					onMore={() => setMobileNavOpen(true)}
					onAdd={() => openQuickAddTransaction()}
				/>

				{mobileNavOpen && (
					<MobileNavSheet
						sections={sections}
						pathname={pathname}
						onClose={() => setMobileNavOpen(false)}
						onSignOut={() => void authClient.signOut()}
					/>
				)}

				<AiTransactionPanel open={aiPanelOpen} onOpenChange={setAiPanelOpen} />
				{quickAddSheet}
			</div>
		);
	}

	// ---------- Desktop shell ----------
	return (
		<div className="flex h-svh overflow-hidden bg-canvas text-foreground">
			<aside
				className={cn(
					"flex shrink-0 flex-col border-r border-border bg-sidebar transition-all duration-300 ease-in-out",
					collapsed ? "w-[72px] px-2 py-4" : "w-[232px] px-3 py-4",
				)}
			>
				<div
					className={cn(
						"mb-6 flex items-center gap-2.5 px-1",
						collapsed ? "justify-center" : "justify-between",
					)}
				>
					<Link
						to="/"
						className="flex min-w-0 items-center gap-2.5 no-underline"
					>
						<span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
							<CircleDollarSign className="size-4" />
						</span>
						{!collapsed && (
							<span className="truncate text-[15px] font-bold tracking-tight text-foreground">
								Money Diary
							</span>
						)}
					</Link>
					{!collapsed && (
						<button
							type="button"
							onClick={() => setCollapsed(true)}
							aria-label="Collapse sidebar"
							className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-nav-hover"
						>
							<PanelLeftClose className="size-4" />
						</button>
					)}
				</div>

				<nav className="flex flex-1 flex-col gap-4 overflow-y-auto">
					{sections.map((section) => {
						const visible = section.items.filter((item) => item.show ?? true);
						if (!visible.length) return null;
						return (
							<div key={section.label} className="flex flex-col gap-0.5">
								{!collapsed && (
									<span className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
										{section.label}
									</span>
								)}
								{visible.map((item) => (
									<NavLinkItem
										key={item.to}
										item={item}
										active={isActivePath(pathname, item.to)}
										collapsed={collapsed}
									/>
								))}
							</div>
						);
					})}
				</nav>

				<div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
					{collapsed ? (
						<button
							type="button"
							onClick={() => setCollapsed(false)}
							aria-label="Expand sidebar"
							className="flex h-8 items-center justify-center rounded-md text-muted-foreground hover:bg-nav-hover"
						>
							<PanelLeftOpen className="size-4" />
						</button>
					) : (
						<ThemeControls className="px-1" />
					)}
					{userBlock}
				</div>
			</aside>

			<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
				<header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-3">
					<div className="min-w-0">
						<p className="truncate text-lg font-extrabold leading-tight tracking-tight">
							{pageTitle}
						</p>
						<p className="truncate text-xs text-muted-foreground">
							{pageSubtitle}
						</p>
					</div>
					<WorkspaceHeaderToolbar onOpenAiPanel={() => setAiPanelOpen(true)} />
				</header>
				<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
					<div className="min-w-0 flex-1">{children}</div>
					<SiteFooter showAuthLinks={false} />
				</div>
			</div>

			<AiTransactionPanel open={aiPanelOpen} onOpenChange={setAiPanelOpen} />
			{quickAddSheet}
		</div>
	);
}

function NavLinkItem({
	item,
	active,
	collapsed,
}: {
	item: NavItem;
	active: boolean;
	collapsed: boolean;
}) {
	const Icon = item.icon;
	return (
		<Link
			to={item.to}
			title={item.title}
			className={cn(
				"flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-semibold no-underline transition-colors",
				collapsed && "justify-center px-0",
				active
					? "bg-soft-accent text-nav-active-fg"
					: "text-muted-foreground hover:bg-nav-hover hover:text-foreground",
			)}
		>
			<Icon className="size-[18px] shrink-0" />
			{!collapsed && <span className="truncate">{item.title}</span>}
		</Link>
	);
}

interface BottomTab {
	title: string;
	to: NavTo;
	icon: ComponentType<{ className?: string }>;
}

function MobileBottomNav({
	pathname,
	onMore,
	onAdd,
}: {
	pathname: string;
	onMore: () => void;
	onAdd: () => void;
}) {
	const left: BottomTab[] = [
		{ title: "Home", to: "/dashboard", icon: LayoutDashboard },
		{ title: "Txns", to: "/transactions", icon: ReceiptText },
	];
	const right: BottomTab[] = [{ title: "Goals", to: "/goals", icon: Goal }];

	return (
		<nav className="flex shrink-0 items-center gap-1 border-t border-border bg-sidebar px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5">
			{left.map((tab) => (
				<BottomTabLink
					key={tab.to}
					tab={tab}
					active={isActivePath(pathname, tab.to)}
				/>
			))}
			<button
				type="button"
				onClick={onAdd}
				aria-label="Add transaction"
				className="-translate-y-3.5 flex shrink-0 items-center justify-center rounded-[17px] bg-primary text-primary-foreground shadow-lg shadow-primary/30"
				style={{ width: 52, height: 52 }}
			>
				<Plus className="size-6" strokeWidth={2.6} />
			</button>
			{right.map((tab) => (
				<BottomTabLink
					key={tab.to}
					tab={tab}
					active={isActivePath(pathname, tab.to)}
				/>
			))}
			<button
				type="button"
				onClick={onMore}
				className="flex flex-1 flex-col items-center gap-0.5 text-muted-foreground"
			>
				<Menu className="size-[21px]" />
				<span className="text-[9px] font-semibold">More</span>
			</button>
		</nav>
	);
}

function BottomTabLink({ tab, active }: { tab: BottomTab; active: boolean }) {
	const Icon = tab.icon;
	return (
		<Link
			to={tab.to}
			className={cn(
				"flex flex-1 flex-col items-center gap-0.5 no-underline",
				active ? "text-primary" : "text-muted-foreground",
			)}
		>
			<Icon className="size-[21px]" />
			<span className="text-[9px] font-semibold">{tab.title}</span>
		</Link>
	);
}

function MobileNavSheet({
	sections,
	pathname,
	onClose,
	onSignOut,
}: {
	sections: NavSection[];
	pathname: string;
	onClose: () => void;
	onSignOut: () => void;
}) {
	return (
		<>
			<button
				type="button"
				aria-label="Close menu"
				className="fixed inset-0 z-[60] animate-in fade-in bg-black/45"
				onClick={onClose}
			/>
			<div className="fixed inset-y-0 left-0 z-[70] flex w-[82%] max-w-[300px] animate-in flex-col bg-sidebar p-4 shadow-xl duration-200 slide-in-from-left">
				<div className="mb-5 flex items-center justify-between">
					<span className="flex items-center gap-2.5">
						<span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
							<CircleDollarSign className="size-4" />
						</span>
						<span className="text-[15px] font-bold tracking-tight">
							Money Diary
						</span>
					</span>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close menu"
						className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-nav-hover"
					>
						<X className="size-5" />
					</button>
				</div>
				<nav className="flex flex-1 flex-col gap-4 overflow-y-auto">
					{sections.map((section) => {
						const visible = section.items.filter((item) => item.show ?? true);
						if (!visible.length) return null;
						return (
							<div key={section.label} className="flex flex-col gap-0.5">
								<span className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
									{section.label}
								</span>
								{visible.map((item) => {
									const Icon = item.icon;
									const active = isActivePath(pathname, item.to);
									return (
										<Link
											key={item.to}
											to={item.to}
											onClick={onClose}
											className={cn(
												"flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-[13px] font-semibold no-underline",
												active
													? "bg-soft-accent text-nav-active-fg"
													: "text-muted-foreground hover:bg-nav-hover",
											)}
										>
											<Icon className="size-[18px]" />
											<span>{item.title}</span>
										</Link>
									);
								})}
							</div>
						);
					})}
				</nav>
				<div className="mt-3 flex items-center gap-2 border-t border-border pt-4">
					<DashboardDateRangeFilter />
					<QueryRefreshButton />
				</div>
				<div className="mt-3 flex items-center justify-between pt-1">
					<ThemeControls />
					<button
						type="button"
						onClick={onSignOut}
						aria-label="Sign out"
						className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-nav-hover"
					>
						<LogOut className="size-[18px]" />
					</button>
				</div>
			</div>
		</>
	);
}

function isActivePath(pathname: string, to: NavTo): boolean {
	if (to === "/") return pathname === "/";
	return pathname.startsWith(to);
}

function getWorkspacePageTitle(pathname: string): string {
	if (pathname === "/") return "Dashboard";
	if (pathname.startsWith("/analytics")) return "Analytics";
	if (pathname.startsWith("/transactions")) return "Transactions";
	if (pathname.startsWith("/categories")) return "Categories";
	if (pathname.startsWith("/accounts")) return "Cards & accounts";
	if (pathname.startsWith("/savings")) return "Savings";
	if (pathname.startsWith("/wishlist")) return "Wishlist";
	if (pathname.startsWith("/goals")) return "Goals";
	if (pathname.startsWith("/settings")) return "Settings";
	if (pathname.startsWith("/admin")) return "Global settings";
	if (pathname.startsWith("/swagger")) return "API Docs";
	return "Workspace";
}

function getWorkspacePageSubtitle(pathname: string): string {
	if (pathname === "/") return "Your money at a glance";
	if (pathname.startsWith("/analytics")) return "Trends and insights";
	if (pathname.startsWith("/transactions")) return "Every entry in your diary";
	if (pathname.startsWith("/categories")) return "Organize your spending";
	if (pathname.startsWith("/accounts")) return "Cards, accounts and cash";
	if (pathname.startsWith("/savings")) return "Your pots and balances";
	if (pathname.startsWith("/wishlist")) return "Things you're saving up for";
	if (pathname.startsWith("/goals")) return "What you're working toward";
	if (pathname.startsWith("/settings")) return "Manage your account";
	if (pathname.startsWith("/admin")) return "Workspace administration";
	if (pathname.startsWith("/swagger")) return "API reference";
	return "";
}
