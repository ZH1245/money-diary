import { CalendarClock, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import {
	useConfirmDraftTransactionMutation,
	useDiscardDraftTransactionMutation,
	useDraftTransactionsQuery,
} from "#/features/transactions/hooks/use-transactions";
import type { TransactionDto } from "#/features/transactions/types/transaction";
import { formatSensitiveCurrency } from "#/lib/privacy/sensitive-format";

interface PendingTransactionsSectionProps {
	userCurrency: string;
}

export function PendingTransactionsSection({
	userCurrency,
}: PendingTransactionsSectionProps) {
	const { data: drafts = [], isPending } = useDraftTransactionsQuery();
	const confirmMutation = useConfirmDraftTransactionMutation();
	const discardMutation = useDiscardDraftTransactionMutation();

	if (isPending || drafts.length === 0) return null;

	const handleConfirm = (draft: TransactionDto) => {
		const promise = confirmMutation.mutateAsync(draft.id);
		toast.promise(promise, {
			loading: "Confirming…",
			success: `"${draft.title}" confirmed`,
			error: (err) =>
				err instanceof Error ? err.message : "Could not confirm transaction",
		});
	};

	const handleDiscard = (draft: TransactionDto) => {
		const promise = discardMutation.mutateAsync(draft.id);
		toast.promise(promise, {
			loading: "Discarding…",
			success: `"${draft.title}" discarded`,
			error: (err) =>
				err instanceof Error ? err.message : "Could not discard transaction",
		});
	};

	return (
		<div className="md-panel p-5 sm:p-6">
			<div className="mb-4 flex items-center gap-2">
				<CalendarClock className="size-4 text-muted-foreground" />
				<h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
					Scheduled / Pending
				</h2>
				<span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
					{drafts.length}
				</span>
			</div>

			<p className="mb-4 text-sm text-muted-foreground">
				Did these happen? Confirm to add them to your balance, or discard to
				remove them.
			</p>

			<ul className="space-y-3">
				{drafts.map((draft) => (
					<PendingTransactionRow
						key={draft.id}
						draft={draft}
						userCurrency={userCurrency}
						onConfirm={handleConfirm}
						onDiscard={handleDiscard}
						isConfirming={
							confirmMutation.isPending &&
							confirmMutation.variables === draft.id
						}
						isDiscarding={
							discardMutation.isPending &&
							discardMutation.variables === draft.id
						}
					/>
				))}
			</ul>
		</div>
	);
}

interface PendingTransactionRowProps {
	draft: TransactionDto;
	userCurrency: string;
	onConfirm: (draft: TransactionDto) => void;
	onDiscard: (draft: TransactionDto) => void;
	isConfirming: boolean;
	isDiscarding: boolean;
}

function PendingTransactionRow({
	draft,
	userCurrency,
	onConfirm,
	onDiscard,
	isConfirming,
	isDiscarding,
}: PendingTransactionRowProps) {
	const scheduledDate = new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(draft.happenedAt));

	const amountLabel = formatSensitiveCurrency(
		Number(draft.amount),
		userCurrency,
		false,
	);

	const isIncome = draft.type === "income";

	return (
		<li className="flex items-center gap-3 rounded-panel border border-border-faint bg-canvas px-4 py-3">
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium text-foreground">
					{draft.title}
				</p>
				<p className="mt-0.5 text-xs text-muted-foreground">{scheduledDate}</p>
			</div>

			<span
				className={`font-num text-sm font-semibold tabular-nums ${
					isIncome ? "text-income" : "text-expense"
				}`}
			>
				{isIncome ? "+" : "-"}
				{amountLabel}
			</span>

			<div className="flex shrink-0 items-center gap-1.5">
				<Button
					size="sm"
					variant="outline"
					className="h-8 gap-1.5 text-xs"
					disabled={isConfirming || isDiscarding}
					onClick={() => onConfirm(draft)}
				>
					<Check className="size-3.5" />
					Yes
				</Button>
				<Button
					size="sm"
					variant="ghost"
					className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
					disabled={isConfirming || isDiscarding}
					onClick={() => onDiscard(draft)}
				>
					<Trash2 className="size-3.5" />
					Discard
				</Button>
			</div>
		</li>
	);
}
