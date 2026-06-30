import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Loader2, MessagesSquare } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	DataTable,
	DataTableColumnHeader,
} from "#/components/data-table/data-table";
import { InlineError } from "#/components/feedback/inline-error";
import { PageEmptyState } from "#/components/feedback/page-state";
import { Button } from "#/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { TicketDetailSheet } from "#/features/feedback/components/ticket-detail-sheet";
import {
	TICKET_TYPE_LABELS,
} from "#/features/feedback/components/ticket-thread";
import {
	useAdminTicketsQuery,
	useUpdateTicketStatusMutation,
} from "#/features/feedback/hooks/use-tickets";
import type {
	AdminTicketListItemDto,
	TicketStatus,
} from "#/features/feedback/types/ticket";

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
	{ value: "open", label: "Open" },
	{ value: "in_progress", label: "In progress" },
	{ value: "resolved", label: "Resolved" },
	{ value: "closed", label: "Closed" },
];

/** Admin panel section listing all tickets with detail view and replies. */
export function AdminTicketsSection() {
	const { data: tickets = [], isLoading, error } = useAdminTicketsQuery();
	const updateStatus = useUpdateTicketStatusMutation();
	const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
	const [sheetOpen, setSheetOpen] = useState(false);

	const handleOpenTicket = useCallback((ticketId: number) => {
		setSelectedTicketId(ticketId);
		setSheetOpen(true);
	}, []);

	const handleStatusChange = useCallback(
		async (ticket: AdminTicketListItemDto, status: TicketStatus) => {
			if (status === ticket.status) return;
			try {
				await updateStatus.mutateAsync({ id: ticket.id, input: { status } });
				toast.success("Ticket updated");
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : "Unable to update ticket",
				);
			}
		},
		[updateStatus],
	);

	const columns = useMemo<ColumnDef<AdminTicketListItemDto>[]>(
		() => [
			{
				accessorKey: "type",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Type" />
				),
				cell: ({ row }) => (
					<span className="text-xs font-medium text-foreground">
						{TICKET_TYPE_LABELS[row.original.type] ?? row.original.type}
					</span>
				),
			},
			{
				accessorKey: "subject",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Subject" />
				),
				cell: ({ row }) => (
					<div className="min-w-0">
						<span className="block truncate text-sm text-foreground">
							{row.original.subject}
						</span>
						<span className="line-clamp-1 text-xs text-muted-foreground">
							{row.original.body}
						</span>
					</div>
				),
			},
			{
				id: "submitter",
				header: "From",
				cell: ({ row }) => (
					<span className="block truncate text-xs font-medium text-foreground">
						{row.original.submitter.name}
					</span>
				),
			},
			{
				accessorKey: "updatedAt",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Updated" />
				),
				cell: ({ row }) => (
					<span className="text-xs text-muted-foreground">
						{new Date(row.original.updatedAt).toLocaleDateString()}
					</span>
				),
			},
			{
				id: "status",
				header: "Status",
				cell: ({ row }) => {
					const ticket = row.original;
					return (
						<Select
							value={ticket.status}
							onValueChange={(value) =>
								void handleStatusChange(ticket, value as TicketStatus)
							}
							disabled={updateStatus.isPending}
						>
							<SelectTrigger className="h-8 w-40">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{STATUS_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					);
				},
			},
			{
				id: "actions",
				header: "",
				cell: ({ row }) => (
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-8"
						onClick={() => handleOpenTicket(row.original.id)}
					>
						<Eye className="size-3.5" />
						View
						{row.original.replyCount > 0 ? (
							<span className="ml-1 rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">
								{row.original.replyCount}
							</span>
						) : null}
					</Button>
				),
			},
		],
		[handleOpenTicket, handleStatusChange, updateStatus.isPending],
	);

	const errorMessage = error instanceof Error ? error.message : null;

	return (
		<>
			<article className="md-panel p-5 md:p-6">
				<h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
					<MessagesSquare className="size-4 text-primary" />
					Tickets
				</h2>
				<p className="mt-1 text-xs text-muted-foreground">
					Bug reports, feature requests, and support messages. Open a ticket to
					read the full thread and reply.
				</p>

				<div className="mt-6">
					{isLoading ? (
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Loader2 className="size-4 animate-spin" />
							Loading tickets...
						</div>
					) : tickets.length === 0 ? (
						<PageEmptyState message="No tickets yet." />
					) : (
						<DataTable
							columns={columns}
							data={tickets}
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

			<TicketDetailSheet
				mode="admin"
				ticketId={selectedTicketId}
				open={sheetOpen}
				onOpenChange={setSheetOpen}
			/>
		</>
	);
}
