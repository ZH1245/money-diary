import { Ban, CalendarClock, Check, RotateCcw, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { SensitiveText } from "#/components/privacy/sensitive-text";
import { Button } from "#/components/ui/button";
import { buildUpcomingItems, type UpcomingItem } from "#/features/dashboard/utils/upcoming-items";
import {
	useUpdateRecurringMutation,
	useRecurringRulesQuery,
} from "#/features/recurring/hooks/use-recurring";
import {
	useConfirmDraftTransactionMutation,
	useDiscardDraftTransactionMutation,
	useDraftTransactionsQuery,
} from "#/features/transactions/hooks/use-transactions";
import {
	formatSensitiveCurrency,
	usePrivacyModeEnabled,
} from "#/lib/privacy/sensitive-format";
import { cn } from "#/lib/utils";

interface UpcomingSectionProps {
	userCurrency: string;
}

/**
 * Unified upcoming list: planned drafts (one-off) and active recurring bills.
 */
export function UpcomingSection({ userCurrency }: UpcomingSectionProps) {
	const { data: drafts = [], isPending: isDraftsPending } =
		useDraftTransactionsQuery();
	const { data: recurringRules = [], isPending: isRecurringPending } =
		useRecurringRulesQuery();
	const confirmMutation = useConfirmDraftTransactionMutation();
	const discardMutation = useDiscardDraftTransactionMutation();
	const updateRecurringMutation = useUpdateRecurringMutation();
	const isPrivacyMode = usePrivacyModeEnabled();

	const { upcoming, canceled } = useMemo(
		() => buildUpcomingItems(drafts, recurringRules),
		[drafts, recurringRules],
	);

	if (isDraftsPending || isRecurringPending) {
		return null;
	}

	if (upcoming.length === 0 && canceled.length === 0) {
		return (
			<div className="md-panel p-5 sm:p-6">
				<div className="mb-2 flex items-center gap-2">
					<CalendarClock className="size-4 text-muted-foreground" />
					<p className="text-base font-bold text-foreground">Upcoming</p>
				</div>
				<p className="mt-4 px-2 py-6 text-center text-sm text-muted-foreground">
					Nothing scheduled yet. Save a transaction as{" "}
					<span className="font-medium text-foreground">Planned</span> for a
					future date, or turn on{" "}
					<span className="font-medium text-foreground">Repeat this</span> for
					bills and subscriptions.
				</p>
			</div>
		);
	}

	return (
		<div className="md-panel p-5 sm:p-6">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<CalendarClock className="size-4 text-muted-foreground" />
					<p className="text-base font-bold text-foreground">Upcoming</p>
				</div>
				<span className="shrink-0 text-xs text-muted-foreground">
					{upcoming.length
						? `${upcoming.length} item${upcoming.length === 1 ? "" : "s"}`
						: "None active"}
				</span>
			</div>

			{upcoming.length === 0 ? (
				<p className="mt-4 px-2 py-4 text-center text-sm text-muted-foreground">
					No active upcoming items.
				</p>
			) : (
				<ul className="mt-4 space-y-1">
					{upcoming.map((item) => (
						<UpcomingRow
							key={item.key}
							item={item}
							userCurrency={userCurrency}
							isPrivacyMode={isPrivacyMode}
							onConfirm={(draftId) => {
								const promise = confirmMutation.mutateAsync(draftId);
								toast.promise(promise, {
									loading: "Confirming…",
									success: "Transaction confirmed",
									error: (err) =>
										err instanceof Error
											? err.message
											: "Could not confirm transaction",
								});
							}}
							onDiscard={(draftId) => {
								const promise = discardMutation.mutateAsync(draftId);
								toast.promise(promise, {
									loading: "Discarding…",
									success: "Planned transaction removed",
									error: (err) =>
										err instanceof Error
											? err.message
											: "Could not discard transaction",
								});
							}}
							onCancelRecurring={(ruleId, title) => {
								const promise = updateRecurringMutation.mutateAsync({
									id: ruleId,
									input: { isActive: false },
								});
								toast.promise(promise, {
									loading: `Canceling ${title}…`,
									success: `${title} canceled`,
									error: (err) =>
										err instanceof Error
											? err.message
											: "Could not update bill",
								});
							}}
							isConfirming={confirmMutation.isPending}
							isDiscarding={discardMutation.isPending}
							isUpdatingRecurring={updateRecurringMutation.isPending}
						/>
					))}
				</ul>
			)}

			{canceled.length > 0 ? (
				<div className="mt-4 border-t border-border-faint pt-3">
					<p className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Canceled
					</p>
					<ul className="mt-1 space-y-1">
						{canceled.map((item) => (
							<li
								key={item.key}
								className="md-row flex flex-col gap-2.5 px-2 py-3 opacity-70 sm:flex-row sm:items-center sm:gap-3 sm:py-2.5"
							>
								<div className="flex min-w-0 items-start gap-3 sm:flex-1 sm:items-center">
									<span className="grid size-9 shrink-0 place-items-center rounded-lg bg-track text-xs font-bold text-muted-foreground">
										{item.badge}
									</span>
									<div className="min-w-0 flex-1">
										<p className="text-sm font-medium break-words text-foreground line-through sm:truncate">
											<SensitiveText text={item.title} />
										</p>
										<p className="text-xs break-words text-muted-foreground sm:truncate">
											{item.dueLabel}
										</p>
									</div>
								</div>
								<div className="flex items-center justify-between gap-2 pl-12 sm:shrink-0 sm:justify-end sm:pl-0">
									<span className="font-num text-base font-extrabold tabular-nums text-muted-foreground sm:text-sm">
										<SensitiveText
											text={formatSensitiveCurrency(
												item.amount,
												userCurrency,
												isPrivacyMode,
											)}
										/>
									</span>
									{item.recurringRuleId ? (
										<Button
											variant="ghost"
											size="sm"
											className="shrink-0 text-muted-foreground hover:text-income"
											disabled={updateRecurringMutation.isPending}
											onClick={() => {
												const promise = updateRecurringMutation.mutateAsync({
													id: item.recurringRuleId!,
													input: { isActive: true },
												});
												toast.promise(promise, {
													loading: `Resuming ${item.title}…`,
													success: `${item.title} resumed`,
													error: (err) =>
														err instanceof Error
															? err.message
															: "Could not update bill",
												});
											}}
										>
											<RotateCcw className="size-4" />
											Resume
										</Button>
									) : null}
								</div>
							</li>
						))}
					</ul>
				</div>
			) : null}
		</div>
	);
}

interface UpcomingRowProps {
	item: UpcomingItem;
	userCurrency: string;
	isPrivacyMode: boolean;
	onConfirm: (draftId: number) => void;
	onDiscard: (draftId: number) => void;
	onCancelRecurring: (ruleId: number, title: string) => void;
	isConfirming: boolean;
	isDiscarding: boolean;
	isUpdatingRecurring: boolean;
}

function UpcomingRow({
	item,
	userCurrency,
	isPrivacyMode,
	onConfirm,
	onDiscard,
	onCancelRecurring,
	isConfirming,
	isDiscarding,
	isUpdatingRecurring,
}: UpcomingRowProps) {
	const kindLabel = item.kind === "planned" ? "Planned" : "Repeats";
	const subtitle =
		item.kind === "planned"
			? `Planned · ${item.dueLabel}`
			: `${item.cadence} · next ${item.dueLabel}`;

	return (
		<li className="md-row flex flex-col gap-2.5 px-2 py-3 sm:flex-row sm:items-center sm:gap-3 sm:py-2.5">
			<div className="flex min-w-0 items-start gap-3 sm:flex-1 sm:items-center">
				<span
					className={cn(
						"grid size-9 shrink-0 place-items-center rounded-lg text-xs font-bold",
						item.kind === "planned"
							? "bg-track text-muted-foreground"
							: "bg-soft-accent text-primary",
					)}
				>
					{item.badge}
				</span>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<p className="text-sm font-medium break-words text-foreground sm:truncate">
							<SensitiveText text={item.title} />
						</p>
						<span className="rounded-full border border-border/70 bg-input-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
							{kindLabel}
						</span>
					</div>
					<p className="text-xs capitalize break-words text-muted-foreground sm:truncate">
						{subtitle}
					</p>
				</div>
			</div>
			<div className="flex items-center justify-between gap-2 pl-12 sm:shrink-0 sm:justify-end sm:pl-0">
				<span className="font-num text-base font-extrabold tabular-nums text-foreground sm:text-sm">
					<SensitiveText
						text={formatSensitiveCurrency(
							item.amount,
							userCurrency,
							isPrivacyMode,
						)}
					/>
				</span>
				{item.kind === "planned" && item.draftId ? (
					<div className="flex shrink-0 items-center gap-1.5">
						<Button
							size="sm"
							variant="outline"
							className="h-8 gap-1.5 text-xs"
							disabled={isConfirming || isDiscarding}
							onClick={() => onConfirm(item.draftId!)}
						>
							<Check className="size-3.5" />
							Confirm
						</Button>
						<Button
							size="sm"
							variant="ghost"
							className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
							disabled={isConfirming || isDiscarding}
							onClick={() => onDiscard(item.draftId!)}
						>
							<Trash2 className="size-3.5" />
							Discard
						</Button>
					</div>
				) : item.recurringRuleId ? (
					<Button
						variant="ghost"
						size="sm"
						className="shrink-0 text-muted-foreground hover:text-expense"
						disabled={isUpdatingRecurring}
						onClick={() => onCancelRecurring(item.recurringRuleId!, item.title)}
					>
						<Ban className="size-4" />
						Cancel
					</Button>
				) : null}
			</div>
		</li>
	);
}
