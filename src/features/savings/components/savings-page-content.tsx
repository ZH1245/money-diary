import { useStore } from "@tanstack/react-store";
import { Pencil, Plus, Trash2, TrendingUp } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
	PageContentSkeleton,
	PageEmptyState,
	PageErrorState,
} from "#/components/feedback/page-state";
import { SensitiveAmount } from "#/components/privacy/sensitive-amount";
import { SensitiveText } from "#/components/privacy/sensitive-text";
import { Button } from "#/components/ui/button";
import { DatePickerField } from "#/components/ui/date-picker";
import { Input } from "#/components/ui/input";
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
import { dashboardDateRangeStore } from "#/features/dashboard/store/dashboard-date-range-store";
import { isDateInRange } from "#/features/dashboard/utils/dashboard-date-range";
import { useGoalsQuery } from "#/features/goals/hooks/use-goals";
import type { GoalDto } from "#/features/goals/types/goal";
import { parseLedgerAmount } from "#/features/goals/utils/goal-progress";
import { PaymentAccountSelect } from "#/features/payment-accounts/components/payment-account-select";
import { usePaymentAccountsQuery } from "#/features/payment-accounts/hooks/use-payment-accounts";
import { GoalSelect } from "#/features/savings/components/goal-select";
import {
	useCreateSavingMutation,
	useDeleteSavingMutation,
	useSavingsQuery,
	useUpdateSavingMutation,
} from "#/features/savings/hooks/use-savings";
import type { SavingDto } from "#/features/savings/types/saving";
import {
	getDefaultSavingForm,
	type SavingFormState,
} from "#/features/savings/utils/saving-form";
import { getSavingLedgerDelta } from "#/features/savings/utils/saving-ledger";
import { buildSavingsPageStats } from "#/features/savings/utils/savings-stats";
import { toInputDate, toIsoDateAtNoon } from "#/lib/date-input";
import {
	formatSensitiveCurrency,
	usePrivacyModeEnabled,
} from "#/lib/privacy/sensitive-format";
import { cn } from "#/lib/utils";

interface SavingsPageContentProps {
	userCurrency: string;
}

interface SavingsPot {
	key: string;
	goalId: number | null;
	name: string;
	emoji: string;
	saved: number;
	target: number;
	entryCount: number;
	/** Most recent linked entry, used to drive the edit flow. */
	latestEntry: SavingDto;
}

/** Picks a stable emoji for a savings pot. */
function potEmoji(goalId: number | null, name: string): string {
	if (goalId === null) return "💰";
	const text = name.toLowerCase();
	if (/hajj|umrah|makkah/.test(text)) return "🕋";
	if (/house|home|flat/.test(text)) return "🏠";
	if (/car|vehicle/.test(text)) return "🚗";
	if (/emergency|rainy/.test(text)) return "🛟";
	if (/travel|trip|holiday|vacation/.test(text)) return "✈️";
	if (/wedding/.test(text)) return "💍";
	if (/edu|school|college|study/.test(text)) return "🎓";
	return "🐷";
}

/** Groups savings ledger entries into per-goal pots (plus a general pot). */
function buildSavingsPots(
	savings: SavingDto[],
	goalsById: Record<number, GoalDto>,
): SavingsPot[] {
	const byKey = new Map<string, SavingsPot>();

	for (const saving of savings) {
		const goalId = saving.goalId;
		const key = goalId === null ? "general" : `goal-${goalId}`;
		const goal = goalId !== null ? goalsById[goalId] : undefined;
		const name =
			goalId === null ? "General savings" : (goal?.title ?? "Linked goal");
		const delta = getSavingLedgerDelta(
			saving.amount,
			saving.entryType ?? "deposit",
		);

		const existing = byKey.get(key);
		if (existing) {
			existing.saved += delta;
			existing.entryCount += 1;
			if (
				new Date(saving.savedAt).getTime() >
				new Date(existing.latestEntry.savedAt).getTime()
			) {
				existing.latestEntry = saving;
			}
		} else {
			byKey.set(key, {
				key,
				goalId,
				name,
				emoji: potEmoji(goalId, name),
				saved: delta,
				target: goal ? parseLedgerAmount(goal.targetAmount) : 0,
				entryCount: 1,
				latestEntry: saving,
			});
		}
	}

	return Array.from(byKey.values()).sort((a, b) => b.saved - a.saved);
}

/** Net savings (deposits minus withdrawals) within the current calendar month. */
function buildThisMonthDelta(savings: SavingDto[]): number {
	const now = new Date();
	const month = now.getMonth();
	const year = now.getFullYear();
	return savings.reduce((total, saving) => {
		const date = new Date(saving.savedAt);
		if (date.getMonth() !== month || date.getFullYear() !== year) return total;
		return (
			total + getSavingLedgerDelta(saving.amount, saving.entryType ?? "deposit")
		);
	}, 0);
}

/** Savings page: gradient hero, pot-card grid, and create/edit sheet. */
export function SavingsPageContent({ userCurrency }: SavingsPageContentProps) {
	const { data: savings = [], isPending, isError, error } = useSavingsQuery();
	const { data: goals = [] } = useGoalsQuery();
	const { data: paymentAccounts = [] } = usePaymentAccountsQuery();
	const createSavingMutation = useCreateSavingMutation();
	const updateSavingMutation = useUpdateSavingMutation();
	const deleteSavingMutation = useDeleteSavingMutation();
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [editingSavingId, setEditingSavingId] = useState<number | null>(null);
	const [form, setForm] = useState<SavingFormState>(getDefaultSavingForm);
	const dateRange = useStore(dashboardDateRangeStore, (state) => state);

	const isEditing = editingSavingId !== null;
	const isSaving =
		createSavingMutation.isPending || updateSavingMutation.isPending;
	const filteredSavings = savings.filter((saving) =>
		isDateInRange(saving.savedAt, dateRange.from, dateRange.to),
	);
	const pageStats = buildSavingsPageStats(filteredSavings);
	const isPrivacyMode = usePrivacyModeEnabled();

	const goalsById = goals.reduce<Record<number, GoalDto>>(
		(accumulator, goal) => {
			accumulator[goal.id] = goal;
			return accumulator;
		},
		{},
	);

	const pots = buildSavingsPots(filteredSavings, goalsById);
	const thisMonthDelta = buildThisMonthDelta(filteredSavings);

	const handleDeleteSaving = useCallback(
		async (id: number, savingTitle: string) => {
			await toast.promise(deleteSavingMutation.mutateAsync(id), {
				loading: "Deleting saving...",
				success: `Deleted ${savingTitle}`,
				error: (message) =>
					message instanceof Error
						? message.message
						: "Unable to delete saving",
			});
		},
		[deleteSavingMutation],
	);

	const openCreateSheet = useCallback(() => {
		setEditingSavingId(null);
		setForm(getDefaultSavingForm());
		setIsSheetOpen(true);
	}, []);

	const openEditSaving = useCallback((saving: SavingDto) => {
		setEditingSavingId(saving.id);
		setForm({
			amount: saving.amount,
			entryType: saving.entryType ?? "deposit",
			note: saving.note ?? "",
			savedAt: toInputDate(saving.savedAt),
			goalId: saving.goalId ? String(saving.goalId) : "none",
			paymentAccountId: saving.paymentAccountId
				? String(saving.paymentAccountId)
				: "none",
		});
		setIsSheetOpen(true);
	}, []);

	function handleSheetOpenChange(open: boolean) {
		setIsSheetOpen(open);
		if (!open) {
			setEditingSavingId(null);
			setForm(getDefaultSavingForm());
		}
	}

	async function handleSaveSaving(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!form.amount.trim()) {
			toast.error("Amount is required");
			return;
		}

		if (!form.savedAt) {
			toast.error("Date is required");
			return;
		}

		const payload = {
			amount: form.amount.trim(),
			entryType: form.entryType,
			note: form.note.trim() || null,
			savedAt: toIsoDateAtNoon(form.savedAt),
			goalId: form.goalId === "none" ? null : Number(form.goalId),
			paymentAccountId:
				form.paymentAccountId === "none" ? null : Number(form.paymentAccountId),
		};

		if (isEditing && editingSavingId) {
			await toast.promise(
				updateSavingMutation.mutateAsync({
					id: editingSavingId,
					input: payload,
				}),
				{
					loading: "Updating saving...",
					success: "Saving updated",
					error: (message) =>
						message instanceof Error
							? message.message
							: "Unable to update saving",
				},
			);
		} else {
			await toast.promise(
				createSavingMutation.mutateAsync({
					amount: payload.amount,
					entryType: payload.entryType,
					note: payload.note ?? undefined,
					savedAt: payload.savedAt,
					goalId: payload.goalId,
					paymentAccountId: payload.paymentAccountId,
				}),
				{
					loading:
						form.entryType === "withdrawal"
							? "Recording withdrawal..."
							: "Adding to savings...",
					success:
						form.entryType === "withdrawal"
							? "Withdrawal recorded"
							: "Added to savings",
					error: (message) =>
						message instanceof Error ? message.message : "Unable to add saving",
				},
			);
		}

		setEditingSavingId(null);
		setForm(getDefaultSavingForm());
		setIsSheetOpen(false);
	}

	return (
		<main className="p-6 md:p-8">
			<div className="mx-auto max-w-5xl">
				<header className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<h1 className="text-2xl font-extrabold tracking-tight text-foreground">
							Savings
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							Track deposits into savings and withdrawals when you spend from
							savings.
						</p>
					</div>
					<Button className="shrink-0 gap-2" onClick={openCreateSheet}>
						<Plus className="size-4" />
						Add saving
					</Button>
				</header>

				{!isPending && !isError ? (
					<section
						className="mt-6 overflow-hidden rounded-panel border border-border p-[26px] text-primary-foreground"
						style={{
							background:
								"linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent) 62%, #000))",
						}}
					>
						<p className="text-sm font-medium opacity-90">Total saved</p>
						<p className="mt-1 font-num text-4xl font-extrabold tracking-tight tabular-nums">
							{formatSensitiveCurrency(
								pageStats.totalSaved,
								userCurrency,
								isPrivacyMode,
							)}
						</p>
						<div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
							<span className="inline-flex items-center gap-1.5 opacity-90">
								<TrendingUp className="size-4" />
								{thisMonthDelta >= 0 ? "+" : "−"}
								{formatSensitiveCurrency(
									Math.abs(thisMonthDelta),
									userCurrency,
									isPrivacyMode,
								)}{" "}
								this month
							</span>
							<span className="opacity-90">
								{formatSensitiveCurrency(
									pageStats.linkedToGoals,
									userCurrency,
									isPrivacyMode,
								)}{" "}
								linked to goals
							</span>
							<span className="opacity-75">{pageStats.entryCount} entries</span>
						</div>
					</section>
				) : null}

				{isPending ? (
					<div className="mt-6">
						<PageContentSkeleton showStats statCount={4} tableColumns={4} />
					</div>
				) : null}
				{isError ? (
					<div className="mt-6">
						<PageErrorState message={error.message} />
					</div>
				) : null}

				{!isPending && !isError ? (
					pots.length ? (
						<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{pots.map((pot) => (
								<PotCard
									key={pot.key}
									pot={pot}
									userCurrency={userCurrency}
									onEdit={() => openEditSaving(pot.latestEntry)}
									onDelete={() =>
										void handleDeleteSaving(pot.latestEntry.id, pot.name)
									}
									isDeletePending={deleteSavingMutation.isPending}
								/>
							))}
						</div>
					) : (
						<div className="mt-6">
							<PageEmptyState
								message={
									savings.length
										? "No savings in the selected date range."
										: "No savings yet. Add your first entry."
								}
							/>
						</div>
					)
				) : null}

				<Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
					<SheetContent className="w-full sm:max-w-md">
						<SheetHeader>
							<SheetTitle>
								{isEditing ? "Edit saving" : "Add saving"}
							</SheetTitle>
							<SheetDescription>
								{isEditing
									? "Update this savings ledger entry."
									: form.entryType === "withdrawal"
										? "Record money taken out of savings."
										: "Log money moved into savings."}
							</SheetDescription>
						</SheetHeader>
						<form className="grid gap-4 px-4" onSubmit={handleSaveSaving}>
							<div className="grid gap-2">
								<label htmlFor="saving-type" className="text-sm font-medium">
									Type
								</label>
								<Select
									value={form.entryType}
									onValueChange={(value: "deposit" | "withdrawal") =>
										setForm((state) => ({ ...state, entryType: value }))
									}
								>
									<SelectTrigger id="saving-type">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="deposit">
											Deposit (into savings)
										</SelectItem>
										<SelectItem value="withdrawal">
											Withdrawal (from savings)
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="grid gap-2">
								<label htmlFor="saving-amount" className="text-sm font-medium">
									Amount ({userCurrency})
								</label>
								<Input
									id="saving-amount"
									type="number"
									value={form.amount}
									onChange={(event) =>
										setForm((state) => ({
											...state,
											amount: event.target.value,
										}))
									}
									placeholder="0.00"
								/>
							</div>
							<DatePickerField
								id="saving-date"
								label="Date"
								value={form.savedAt}
								onChange={(savedAt) =>
									setForm((state) => ({ ...state, savedAt }))
								}
							/>
							<div className="grid gap-2">
								<label htmlFor="saving-goal" className="text-sm font-medium">
									Goal (optional)
								</label>
								<GoalSelect
									id="saving-goal"
									value={form.goalId}
									onValueChange={(value) =>
										setForm((state) => ({ ...state, goalId: value }))
									}
									goals={goals}
								/>
							</div>
							<PaymentAccountSelect
								value={form.paymentAccountId}
								onValueChange={(value) =>
									setForm((state) => ({ ...state, paymentAccountId: value }))
								}
								accounts={paymentAccounts}
								label={
									form.entryType === "withdrawal"
										? "Withdrawn to (optional)"
										: "Saved from (optional)"
								}
							/>
							<div className="grid gap-2">
								<label htmlFor="saving-note" className="text-sm font-medium">
									Note (optional)
								</label>
								<Input
									id="saving-note"
									value={form.note}
									onChange={(event) =>
										setForm((state) => ({ ...state, note: event.target.value }))
									}
									placeholder="e.g. salary, gift"
								/>
							</div>
							<SheetFooter className="px-0">
								<Button type="submit" disabled={isSaving} className="w-full">
									{isSaving
										? "Saving..."
										: isEditing
											? "Save changes"
											: "Add saving"}
								</Button>
							</SheetFooter>
						</form>
					</SheetContent>
				</Sheet>
			</div>
		</main>
	);
}

interface PotCardProps {
	pot: SavingsPot;
	userCurrency: string;
	onEdit: () => void;
	onDelete: () => void;
	isDeletePending: boolean;
}

/** A savings pot (goal-linked or general) rendered as a panel card. */
function PotCard({
	pot,
	userCurrency,
	onEdit,
	onDelete,
	isDeletePending,
}: PotCardProps) {
	const percent =
		pot.target > 0
			? Math.min(100, Math.round((pot.saved / pot.target) * 100))
			: 0;
	const isComplete = pot.target > 0 && pot.saved >= pot.target;

	return (
		<article className="flex flex-col rounded-panel border border-border bg-panel p-[22px] shadow-sm">
			<div className="flex items-start justify-between gap-3">
				<div className="flex min-w-0 items-center gap-3">
					<span
						className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-soft-accent text-xl"
						aria-hidden="true"
					>
						{pot.emoji}
					</span>
					<div className="min-w-0">
						<h2 className="truncate font-semibold text-foreground">
							{pot.goalId === null ? (
								pot.name
							) : (
								<SensitiveText text={pot.name} />
							)}
						</h2>
						<p className="mt-0.5 text-xs text-muted-foreground">
							{pot.entryCount} {pot.entryCount === 1 ? "entry" : "entries"}
						</p>
					</div>
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<button
						type="button"
						onClick={onEdit}
						aria-label={`Edit latest entry in ${pot.name}`}
						className="rounded-md p-1.5 text-muted-foreground hover:bg-soft-accent hover:text-foreground"
					>
						<Pencil className="size-4" />
					</button>
					<button
						type="button"
						onClick={onDelete}
						disabled={isDeletePending}
						aria-label={`Delete latest entry in ${pot.name}`}
						className="rounded-md p-1.5 text-muted-foreground hover:bg-soft-accent hover:text-expense disabled:opacity-50"
					>
						<Trash2 className="size-4" />
					</button>
				</div>
			</div>

			<p className="mt-5 font-num text-2xl font-extrabold tracking-tight tabular-nums text-foreground">
				<SensitiveAmount amount={pot.saved} currency={userCurrency} />
			</p>

			{pot.target > 0 ? (
				<>
					<div className="mt-3 h-2 overflow-hidden rounded-full bg-track">
						<div
							className={cn(
								"h-full rounded-full transition-all",
								isComplete ? "bg-income" : "bg-primary",
							)}
							style={{ width: `${percent}%` }}
						/>
					</div>
					<div className="mt-2 flex items-center justify-between text-xs">
						<span
							className={cn(
								"font-num font-semibold tabular-nums",
								isComplete ? "text-income" : "text-primary",
							)}
						>
							{percent}%
						</span>
						<span className="font-num tabular-nums text-muted-foreground">
							of <SensitiveAmount amount={pot.target} currency={userCurrency} />
						</span>
					</div>
				</>
			) : (
				<p className="mt-3 text-xs text-muted-foreground">Not tied to a goal</p>
			)}
		</article>
	);
}
