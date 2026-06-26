import type { ColumnDef } from "@tanstack/react-table";
import {
	Ban,
	Check,
	Copy,
	KeyRound,
	Loader2,
	MoreHorizontal,
	ShieldAlert,
	ShieldCheck,
	Trash2,
	Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	DataTable,
	DataTableColumnHeader,
} from "#/components/data-table/data-table";
import { InlineError } from "#/components/feedback/inline-error";
import { PageEmptyState } from "#/components/feedback/page-state";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet";
import { Textarea } from "#/components/ui/textarea";
import { useGenerateResetLinkMutation } from "#/features/admin/api/admin-reset-link-api";
import type { AdminUserRecord } from "#/features/admin/types/admin-user";
import { AUTH_ROLES } from "#/lib/auth-roles";

type ModerationAction = "restrict" | "ban";

/** Offset options for moderation expiry. "" means permanent. */
type ExpiryOffset = "" | "1d" | "7d" | "30d";

interface ModerationSheetState {
	user: AdminUserRecord;
	action: ModerationAction;
}

interface ResetLinkDialogState {
	user: AdminUserRecord;
	token: string;
	expiresAt: string;
}

function statusBadgeClass(status: AdminUserRecord["accountStatus"]) {
	if (status === "banned")
		return "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100";
	if (status === "restricted")
		return "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100";
	return "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100";
}

/** Converts an expiry offset string to a future ISO date string, or null for permanent. */
function offsetToExpiresAt(offset: ExpiryOffset): string | null {
	if (!offset) return null;
	const ms = { "1d": 86_400_000, "7d": 7 * 86_400_000, "30d": 30 * 86_400_000 }[
		offset
	];
	return new Date(Date.now() + ms).toISOString();
}

/** Admin table for viewing and moderating application users. */
export function AdminUsersSection() {
	const [users, setUsers] = useState<AdminUserRecord[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isActionPending, setIsActionPending] = useState(false);

	// Moderation sheet state
	const [moderationSheet, setModerationSheet] =
		useState<ModerationSheetState | null>(null);
	const [moderationReason, setModerationReason] = useState("");
	const [expiryOffset, setExpiryOffset] = useState<ExpiryOffset>("");

	// Reset link dialog state
	const [resetLinkDialog, setResetLinkDialog] =
		useState<ResetLinkDialogState | null>(null);
	const [isCopied, setIsCopied] = useState(false);

	const { mutate: generateResetLink, isPending: isResetLinkPending } =
		useGenerateResetLinkMutation();

	const loadUsers = useCallback(async () => {
		setIsLoading(true);
		setErrorMessage(null);
		try {
			const response = await fetch("/api/admin/users", { method: "GET" });
			const payload = (await response.json().catch(() => null)) as {
				success?: boolean;
				error?: string;
				data?: AdminUserRecord[];
			} | null;

			if (!response.ok || !payload?.success) {
				throw new Error(payload?.error ?? "Unable to load users");
			}

			setUsers(payload.data ?? []);
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Unable to load users",
			);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadUsers();
	}, [loadUsers]);

	const handleModerationSubmit = useCallback(async () => {
		if (!moderationSheet) return;

		setIsActionPending(true);
		setErrorMessage(null);
		try {
			const expiresAt = offsetToExpiresAt(expiryOffset);
			const response = await fetch(
				`/api/admin/users/${moderationSheet.user.id}`,
				{
					method: "PATCH",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						action: moderationSheet.action,
						reason: moderationReason.trim(),
						expiresAt,
					}),
				},
			);

			const payload = (await response.json().catch(() => null)) as {
				success?: boolean;
				error?: string;
				data?: AdminUserRecord;
			} | null;

			if (!response.ok || !payload?.success || !payload.data) {
				throw new Error(payload?.error ?? "Unable to update user");
			}

			const updatedUser = payload.data;
			setUsers((previous) =>
				previous.map((row) => (row.id === updatedUser.id ? updatedUser : row)),
			);
			setModerationSheet(null);
			setModerationReason("");
			setExpiryOffset("");
			toast.success(
				moderationSheet.action === "ban" ? "User banned" : "User restricted",
			);
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Unable to update user",
			);
		} finally {
			setIsActionPending(false);
		}
	}, [expiryOffset, moderationReason, moderationSheet]);

	const handleRestore = useCallback(async (target: AdminUserRecord) => {
		setIsActionPending(true);
		setErrorMessage(null);
		try {
			const response = await fetch(`/api/admin/users/${target.id}`, {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ action: "restore" }),
			});

			const payload = (await response.json().catch(() => null)) as {
				success?: boolean;
				error?: string;
				data?: AdminUserRecord;
			} | null;

			if (!response.ok || !payload?.success || !payload.data) {
				throw new Error(payload?.error ?? "Unable to restore user");
			}

			const restoredUser = payload.data;
			setUsers((previous) =>
				previous.map((row) =>
					row.id === restoredUser.id ? restoredUser : row,
				),
			);
			toast.success("User restored");
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Unable to restore user",
			);
		} finally {
			setIsActionPending(false);
		}
	}, []);

	const handleDelete = useCallback(async (target: AdminUserRecord) => {
		setIsActionPending(true);
		setErrorMessage(null);
		try {
			const response = await fetch(`/api/admin/users/${target.id}`, {
				method: "DELETE",
			});
			const payload = (await response.json().catch(() => null)) as {
				success?: boolean;
				error?: string;
			} | null;

			if (!response.ok || !payload?.success) {
				throw new Error(payload?.error ?? "Unable to delete user");
			}

			setUsers((previous) => previous.filter((row) => row.id !== target.id));
			toast.success("User deleted");
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Unable to delete user",
			);
		} finally {
			setIsActionPending(false);
		}
	}, []);

	const handleGenerateResetLink = useCallback(
		async (target: AdminUserRecord) => {
			const data = await generateResetLink(target.id);
			if (data) {
				setResetLinkDialog({
					user: target,
					token: data.token,
					expiresAt: data.expiresAt,
				});
				setIsCopied(false);
			} else {
				toast.error("Unable to generate reset link");
			}
		},
		[generateResetLink],
	);

	const resetLinkUrl = resetLinkDialog
		? `${window.location.origin}/reset-password?token=${resetLinkDialog.token}`
		: "";

	const handleCopyLink = useCallback(async () => {
		if (!resetLinkUrl) return;
		try {
			await navigator.clipboard.writeText(resetLinkUrl);
			setIsCopied(true);
			setTimeout(() => setIsCopied(false), 2000);
		} catch {
			toast.error("Unable to copy to clipboard");
		}
	}, [resetLinkUrl]);

	const columns = useMemo<ColumnDef<AdminUserRecord>[]>(
		() => [
			{
				accessorKey: "name",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Name" />
				),
				cell: ({ row }) => (
					<div>
						<p className="font-medium text-foreground">{row.original.name}</p>
						<p className="text-xs text-muted-foreground">
							{row.original.email}
						</p>
					</div>
				),
			},
			{
				accessorKey: "role",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Role" />
				),
				cell: ({ row }) => (
					<span className="capitalize">{row.original.role}</span>
				),
			},
			{
				accessorKey: "accountStatus",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Status" />
				),
				cell: ({ row }) => {
					const { accountStatus, moderationExpiresAt } = row.original;
					return (
						<div className="flex flex-col gap-0.5">
							<span
								className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusBadgeClass(accountStatus)}`}
							>
								{accountStatus}
							</span>
							{moderationExpiresAt ? (
								<span className="text-[10px] text-muted-foreground">
									Until{" "}
									{new Date(moderationExpiresAt).toLocaleDateString(undefined, {
										month: "short",
										day: "numeric",
										year: "numeric",
									})}
								</span>
							) : null}
						</div>
					);
				},
			},
			{
				accessorKey: "moderationReason",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Reason" />
				),
				cell: ({ row }) => (
					<span className="line-clamp-2 text-xs text-muted-foreground">
						{row.original.moderationReason ?? "—"}
					</span>
				),
			},
			{
				accessorKey: "createdAt",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Joined" />
				),
				cell: ({ row }) => (
					<span className="text-xs text-muted-foreground">
						{new Date(row.original.createdAt).toLocaleDateString()}
					</span>
				),
			},
			{
				id: "actions",
				header: "Actions",
				cell: ({ row }) => {
					const target = row.original;
					const isAdminUser = target.role === AUTH_ROLES.admin;

					if (isAdminUser) {
						return (
							<div className="text-right">
								<span className="text-xs text-muted-foreground">Protected</span>
							</div>
						);
					}

					const isRestricted = target.accountStatus === "restricted";
					const isBanned = target.accountStatus === "banned";
					const isActive = target.accountStatus === "active";

					return (
						<div className="flex justify-end">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="size-8"
										disabled={isActionPending || isResetLinkPending}
										aria-label={`Actions for ${target.email}`}
									>
										<MoreHorizontal className="size-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-48">
									{isActive ? (
										<>
											<DropdownMenuItem
												onSelect={() => {
													setModerationReason("");
													setExpiryOffset("");
													setModerationSheet({
														user: target,
														action: "restrict",
													});
												}}
											>
												<ShieldAlert className="size-4" />
												Restrict
											</DropdownMenuItem>
											<DropdownMenuItem
												className="text-destructive focus:text-destructive"
												onSelect={() => {
													setModerationReason("");
													setExpiryOffset("");
													setModerationSheet({ user: target, action: "ban" });
												}}
											>
												<Ban className="size-4" />
												Ban
											</DropdownMenuItem>
										</>
									) : null}
									{isRestricted ? (
										<>
											<DropdownMenuItem
												className="text-destructive focus:text-destructive"
												onSelect={() => {
													setModerationReason("");
													setExpiryOffset("");
													setModerationSheet({ user: target, action: "ban" });
												}}
											>
												<Ban className="size-4" />
												Escalate to ban
											</DropdownMenuItem>
											<DropdownMenuItem
												onSelect={() => void handleRestore(target)}
											>
												<ShieldCheck className="size-4" />
												Restore
											</DropdownMenuItem>
										</>
									) : null}
									{isBanned ? (
										<DropdownMenuItem
											onSelect={() => void handleRestore(target)}
										>
											<ShieldCheck className="size-4" />
											Restore
										</DropdownMenuItem>
									) : null}
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onSelect={() => void handleGenerateResetLink(target)}
										disabled={isResetLinkPending}
									>
										<KeyRound className="size-4" />
										Generate reset link
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										className="text-destructive focus:text-destructive"
										onSelect={() => {
											if (window.confirm(`Delete ${target.email}?`)) {
												void handleDelete(target);
											}
										}}
									>
										<Trash2 className="size-4" />
										Delete
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					);
				},
			},
		],
		[
			handleDelete,
			handleGenerateResetLink,
			handleRestore,
			isActionPending,
			isResetLinkPending,
		],
	);

	return (
		<article className="md-panel p-5 md:p-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
						<Users className="size-4 text-primary" />
						Users
					</h2>
					<p className="mt-1 text-xs text-muted-foreground">
						Review accounts, restrict access with a reason, ban sign-in, or
						permanently delete users.
					</p>
				</div>
			</div>

			<div className="mt-4">
				{isLoading ? (
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="size-4 animate-spin" />
						Loading users...
					</div>
				) : users.length === 0 ? (
					<PageEmptyState message="No registered users yet." />
				) : (
					<DataTable columns={columns} data={users} maxBodyHeight={undefined} />
				)}
			</div>

			{errorMessage ? (
				<div className="mt-4">
					<InlineError message={errorMessage} />
				</div>
			) : null}

			{/* Moderation sheet (restrict / ban) */}
			<Sheet
				open={moderationSheet != null}
				onOpenChange={(open) => {
					if (!open) {
						setModerationSheet(null);
						setModerationReason("");
						setExpiryOffset("");
					}
				}}
			>
				<SheetContent className="sm:max-w-md">
					<SheetHeader>
						<SheetTitle>
							{moderationSheet?.action === "ban"
								? moderationSheet.user.accountStatus === "restricted"
									? "Escalate to ban"
									: "Ban user"
								: "Restrict user"}
						</SheetTitle>
						<SheetDescription>
							{moderationSheet?.user.email}. This revokes active sessions
							immediately.
						</SheetDescription>
					</SheetHeader>

					<div className="space-y-4 px-4 pb-2">
						<div>
							<label
								htmlFor="moderation-reason"
								className="mb-1 block text-sm font-medium"
							>
								Reason
							</label>
							<Textarea
								id="moderation-reason"
								value={moderationReason}
								onChange={(event) => setModerationReason(event.target.value)}
								placeholder="Explain why this account is being moderated"
								rows={4}
								disabled={isActionPending}
							/>
						</div>

						<div>
							<label
								htmlFor="moderation-expiry"
								className="mb-1 block text-sm font-medium"
							>
								Duration
							</label>
							<Select
								value={expiryOffset}
								onValueChange={(value) =>
									setExpiryOffset(value as ExpiryOffset)
								}
								disabled={isActionPending}
							>
								<SelectTrigger id="moderation-expiry" className="w-full">
									<SelectValue placeholder="Permanent" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="">Permanent</SelectItem>
									<SelectItem value="1d">1 day</SelectItem>
									<SelectItem value="7d">7 days</SelectItem>
									<SelectItem value="30d">30 days</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<SheetFooter>
						<Button
							type="button"
							variant={
								moderationSheet?.action === "ban" ? "destructive" : "default"
							}
							disabled={isActionPending || moderationReason.trim().length < 3}
							onClick={() => void handleModerationSubmit()}
						>
							{isActionPending ? (
								<Loader2 className="size-4 animate-spin" />
							) : null}
							{moderationSheet?.action === "ban"
								? moderationSheet.user.accountStatus === "restricted"
									? "Confirm escalation"
									: "Confirm ban"
								: "Confirm restriction"}
						</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>

			{/* Reset link dialog */}
			<Dialog
				open={resetLinkDialog != null}
				onOpenChange={(open) => {
					if (!open) setResetLinkDialog(null);
				}}
			>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Password reset link</DialogTitle>
						<DialogDescription>
							Share this link with{" "}
							<span className="font-medium text-foreground">
								{resetLinkDialog?.user.email}
							</span>
							. It expires{" "}
							{resetLinkDialog
								? new Date(resetLinkDialog.expiresAt).toLocaleString()
								: ""}
							.
						</DialogDescription>
					</DialogHeader>

					<div className="rounded-md border border-border bg-muted/40 p-3">
						<p className="break-all font-mono text-xs text-foreground">
							{resetLinkUrl}
						</p>
					</div>

					<DialogFooter showCloseButton>
						<Button
							type="button"
							variant="outline"
							onClick={() => void handleCopyLink()}
							className="gap-2"
						>
							{isCopied ? (
								<Check className="size-4 text-emerald-500" />
							) : (
								<Copy className="size-4" />
							)}
							{isCopied ? "Copied!" : "Copy link"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</article>
	);
}
