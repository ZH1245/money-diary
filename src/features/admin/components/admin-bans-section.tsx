import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, ShieldBan, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	DataTable,
	DataTableColumnHeader,
} from "#/components/data-table/data-table";
import { InlineError } from "#/components/feedback/inline-error";
import { PageEmptyState } from "#/components/feedback/page-state";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import {
	useBansQuery,
	useCreateBanMutation,
	useDeleteBanMutation,
} from "#/features/admin/hooks/use-admin-bans";
import type { AdminBanRecord } from "#/features/admin/types/admin-ban";

const EXPIRY_OPTIONS = [
	{ value: "permanent", label: "Permanent" },
	{ value: "1", label: "1 day" },
	{ value: "7", label: "7 days" },
	{ value: "30", label: "30 days" },
] as const;

function expiresAtFromExpiry(expiry: string): string | null {
	if (expiry === "permanent") return null;
	const days = Number.parseInt(expiry, 10);
	const date = new Date();
	date.setDate(date.getDate() + days);
	return date.toISOString();
}

/** Admin panel section for email and IP banning. */
export function AdminBansSection() {
	const [email, setEmail] = useState("");
	const [banEmail, setBanEmail] = useState(false);
	const [ip, setIp] = useState("");
	const [banIp, setBanIp] = useState(false);
	const [reason, setReason] = useState("");
	const [expiry, setExpiry] = useState("permanent");
	const [formError, setFormError] = useState<string | null>(null);

	const { data: bans = [], isLoading, error } = useBansQuery();
	const createBanMutation = useCreateBanMutation();
	const deleteBanMutation = useDeleteBanMutation();

	const isActionPending =
		createBanMutation.isPending || deleteBanMutation.isPending;

	const canSubmit =
		(banEmail && email.trim().length > 0) || (banIp && ip.trim().length > 0);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setFormError(null);

		if (!canSubmit) return;

		if (reason.trim().length < 3) {
			setFormError("Reason must be at least 3 characters.");
			return;
		}

		try {
			await createBanMutation.mutateAsync({
				email: banEmail && email.trim() ? email.trim() : undefined,
				ip: banIp && ip.trim() ? ip.trim() : undefined,
				reason: reason.trim(),
				expiresAt: expiresAtFromExpiry(expiry),
			});
			setEmail("");
			setBanEmail(false);
			setIp("");
			setBanIp(false);
			setReason("");
			setExpiry("permanent");
			toast.success("Ban created");
		} catch (err) {
			setFormError(err instanceof Error ? err.message : "Unable to create ban");
		}
	};

	const handleDelete = useCallback(
		async (target: AdminBanRecord) => {
			if (!window.confirm("Remove this ban?")) return;
			try {
				await deleteBanMutation.mutateAsync(target.id);
				toast.success("Ban removed");
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Unable to remove ban",
				);
			}
		},
		[deleteBanMutation],
	);

	const columns = useMemo<ColumnDef<AdminBanRecord>[]>(
		() => [
			{
				accessorKey: "targetType",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Type" />
				),
				cell: ({ row }) => (
					<span className="capitalize">{row.original.targetType}</span>
				),
			},
			{
				id: "value",
				header: "Value",
				cell: ({ row }) => (
					<span className="truncate font-mono text-xs">
						{row.original.targetType === "email"
							? (row.original.email ?? "—")
							: (row.original.ipAddress ?? "—")}
					</span>
				),
			},
			{
				accessorKey: "reason",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Reason" />
				),
				cell: ({ row }) => (
					<span className="line-clamp-2 text-xs text-muted-foreground">
						{row.original.reason}
					</span>
				),
			},
			{
				accessorKey: "expiresAt",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Expiry" />
				),
				cell: ({ row }) =>
					row.original.expiresAt ? (
						<span className="text-xs text-muted-foreground">
							{new Date(row.original.expiresAt).toLocaleDateString()}
						</span>
					) : (
						<span className="text-xs font-medium text-foreground">
							Permanent
						</span>
					),
			},
			{
				accessorKey: "createdAt",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Created" />
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
					return (
						<div className="flex justify-end">
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="size-8 text-destructive hover:text-destructive"
								disabled={isActionPending}
								aria-label={`Remove ban for ${target.email ?? target.ipAddress}`}
								onClick={() => void handleDelete(target)}
							>
								<Trash2 className="size-4" />
							</Button>
						</div>
					);
				},
			},
		],
		[handleDelete, isActionPending],
	);

	const errorMessage = error instanceof Error ? error.message : null;

	return (
		<article className="md-panel p-5 md:p-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
						<ShieldBan className="size-4 text-primary" />
						Bans
					</h2>
					<p className="mt-1 text-xs text-muted-foreground">
						Block sign-in by email or IP address with an optional expiry.
					</p>
				</div>
			</div>

			{/* Create ban form */}
			<form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
				{/* Email row */}
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<input
							id="ban-email-checkbox"
							type="checkbox"
							checked={banEmail}
							onChange={(e) => setBanEmail(e.target.checked)}
							disabled={isActionPending}
							className="size-4 rounded border-border accent-primary"
						/>
						<label htmlFor="ban-email-checkbox" className="text-sm font-medium">
							Ban email
						</label>
					</div>
					<Input
						id="ban-email-input"
						type="email"
						placeholder="user@example.com"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						disabled={!banEmail || isActionPending}
						aria-label="Email address to ban"
					/>
				</div>

				{/* IP row */}
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<input
							id="ban-ip-checkbox"
							type="checkbox"
							checked={banIp}
							onChange={(e) => setBanIp(e.target.checked)}
							disabled={isActionPending}
							className="size-4 rounded border-border accent-primary"
						/>
						<label htmlFor="ban-ip-checkbox" className="text-sm font-medium">
							Ban IP
						</label>
					</div>
					<Input
						id="ban-ip-input"
						type="text"
						placeholder="192.168.1.1"
						value={ip}
						onChange={(e) => setIp(e.target.value)}
						disabled={!banIp || isActionPending}
						aria-label="IP address to ban"
					/>
				</div>

				{/* Reason */}
				<div className="space-y-1">
					<label htmlFor="ban-reason" className="block text-sm font-medium">
						Reason <span className="text-destructive">*</span>
					</label>
					<Textarea
						id="ban-reason"
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						placeholder="Explain why this address is being banned"
						rows={3}
						disabled={isActionPending}
					/>
				</div>

				{/* Expiry */}
				<div className="space-y-1">
					<label htmlFor="ban-expiry" className="block text-sm font-medium">
						Duration
					</label>
					<Select
						value={expiry}
						onValueChange={setExpiry}
						disabled={isActionPending}
					>
						<SelectTrigger id="ban-expiry" className="w-48">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{EXPIRY_OPTIONS.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{formError ? <InlineError message={formError} /> : null}

				<Button
					type="submit"
					variant="destructive"
					disabled={!canSubmit || reason.trim().length < 3 || isActionPending}
				>
					{createBanMutation.isPending ? (
						<Loader2 className="size-4 animate-spin" />
					) : null}
					Create ban
				</Button>
			</form>

			{/* Existing bans table */}
			<div className="mt-6">
				{isLoading ? (
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="size-4 animate-spin" />
						Loading bans...
					</div>
				) : bans.length === 0 ? (
					<PageEmptyState message="No active bans." />
				) : (
					<DataTable
						columns={columns}
						data={bans}
						fillWidth
						maxBodyHeight={undefined}
						showToolbar={false}
					/>
				)}
			</div>

			{errorMessage ? (
				<div className="mt-4">
					<InlineError message={errorMessage} />
				</div>
			) : null}
		</article>
	);
}
