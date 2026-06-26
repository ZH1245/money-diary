import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
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
import {
	useCreateGoalMutation,
	useDeleteGoalMutation,
	useGoalsQuery,
	useUpdateGoalMutation,
} from "#/features/goals/hooks/use-goals";
import type { GoalDto } from "#/features/goals/types/goal";
import {
	formatGoalDate,
	type GoalFormState,
	getDefaultGoalForm,
} from "#/features/goals/utils/goal-form";
import {
	buildGoalProgress,
	buildGoalsPageStats,
	buildLinkedSavingsByGoalId,
} from "#/features/goals/utils/goal-progress";
import { useSavingsQuery } from "#/features/savings/hooks/use-savings";
import { toInputDate } from "#/lib/date-input";
import {
	formatSensitiveCurrency,
	usePrivacyModeEnabled,
} from "#/lib/privacy/sensitive-format";
import { cn } from "#/lib/utils";

interface GoalsPageContentProps {
	userCurrency: string;
}

/** Picks a stable emoji for a goal based on its title. */
function goalEmoji(title: string): string {
	const text = title.toLowerCase();
	if (/hajj|umrah|makkah|mosque|pray/.test(text)) return "🕋";
	if (/house|home|flat|apartment|mortgage/.test(text)) return "🏠";
	if (/car|vehicle|bike/.test(text)) return "🚗";
	if (/emergency|safety|rainy/.test(text)) return "🛟";
	if (/travel|trip|holiday|vacation|flight/.test(text)) return "✈️";
	if (/wedding|marriage/.test(text)) return "💍";
	if (/edu|school|college|university|course|study/.test(text)) return "🎓";
	if (/gift|present/.test(text)) return "🎁";
	if (/retire|pension/.test(text)) return "🌅";
	return "🎯";
}

/** Goals page: header stats, goal-card grid, and create/edit sheet. */
export function GoalsPageContent({ userCurrency }: GoalsPageContentProps) {
	const { data: goals = [], isPending, isError, error } = useGoalsQuery();
	const { data: savings = [] } = useSavingsQuery();
	const createGoalMutation = useCreateGoalMutation();
	const updateGoalMutation = useUpdateGoalMutation();
	const deleteGoalMutation = useDeleteGoalMutation();
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
	const [form, setForm] = useState<GoalFormState>(getDefaultGoalForm());

	const isEditing = editingGoalId !== null;
	const isSaving = createGoalMutation.isPending || updateGoalMutation.isPending;

	const linkedSavingsByGoalId = buildLinkedSavingsByGoalId(savings);
	const pageStats = buildGoalsPageStats(goals, linkedSavingsByGoalId);
	const isPrivacyMode = usePrivacyModeEnabled();

	const handleDeleteGoal = useCallback(
		async (id: number, goalTitle: string) => {
			await toast.promise(deleteGoalMutation.mutateAsync(id), {
				loading: "Deleting goal...",
				success: `Deleted ${goalTitle}`,
				error: (message) =>
					message instanceof Error ? message.message : "Unable to delete goal",
			});
		},
		[deleteGoalMutation],
	);

	const openCreateSheet = useCallback(() => {
		setEditingGoalId(null);
		setForm(getDefaultGoalForm());
		setIsSheetOpen(true);
	}, []);

	const openEditGoal = useCallback((goal: GoalDto) => {
		setEditingGoalId(goal.id);
		setForm({
			title: goal.title,
			targetAmount: goal.targetAmount,
			currentAmount: goal.currentAmount,
			savingsAmount: goal.savingsAmount,
			status: goal.status,
			targetDate: goal.targetDate ? toInputDate(goal.targetDate) : "",
			note: goal.note ?? "",
		});
		setIsSheetOpen(true);
	}, []);

	function handleSheetOpenChange(open: boolean) {
		setIsSheetOpen(open);
		if (!open) {
			setEditingGoalId(null);
			setForm(getDefaultGoalForm());
		}
	}

	async function handleSaveGoal(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!form.title.trim() || !form.targetAmount.trim()) {
			toast.error("Title and target amount are required");
			return;
		}

		if (isEditing && editingGoalId) {
			await toast.promise(
				updateGoalMutation.mutateAsync({
					id: editingGoalId,
					input: {
						title: form.title.trim(),
						targetAmount: form.targetAmount.trim(),
						currentAmount: form.currentAmount.trim() || "0",
						savingsAmount: form.savingsAmount.trim() || "0",
						status: form.status,
						targetDate: form.targetDate
							? new Date(form.targetDate).toISOString()
							: null,
						note: form.note.trim() || null,
					},
				}),
				{
					loading: "Updating goal...",
					success: "Goal updated",
					error: (message) =>
						message instanceof Error
							? message.message
							: "Unable to update goal",
				},
			);
		} else {
			await toast.promise(
				createGoalMutation.mutateAsync({
					title: form.title.trim(),
					targetAmount: form.targetAmount.trim(),
					status: form.status,
					targetDate: form.targetDate
						? new Date(form.targetDate).toISOString()
						: undefined,
				}),
				{
					loading: "Creating goal...",
					success: "Goal created",
					error: (message) =>
						message instanceof Error
							? message.message
							: "Unable to create goal",
				},
			);
		}

		setEditingGoalId(null);
		setForm(getDefaultGoalForm());
		setIsSheetOpen(false);
	}

	return (
		<main className="p-6 md:p-8">
			<div className="mx-auto max-w-5xl">
				<header className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<h1 className="text-2xl font-extrabold tracking-tight text-foreground">
							Goals
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							Track long-term targets. Progress combines logged amounts and
							savings linked on the Savings page.
						</p>
					</div>
					<Button className="shrink-0 gap-2" onClick={openCreateSheet}>
						<Plus className="size-4" />
						Add goal
					</Button>
				</header>

				{!isPending && !isError ? (
					<div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
						<SummaryStat
							label="Active goals"
							value={String(pageStats.activeCount)}
						/>
						<SummaryStat
							label="Combined saved"
							value={formatSensitiveCurrency(
								pageStats.totalAchieved,
								userCurrency,
								isPrivacyMode,
							)}
						/>
						<SummaryStat
							label="Still needed"
							value={formatSensitiveCurrency(
								pageStats.totalStillNeeded,
								userCurrency,
								isPrivacyMode,
							)}
						/>
						<SummaryStat
							label="Active target"
							value={formatSensitiveCurrency(
								pageStats.totalTarget,
								userCurrency,
								isPrivacyMode,
							)}
						/>
					</div>
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
					goals.length ? (
						<div className="mt-6 grid gap-4 sm:grid-cols-2">
							{goals.map((goal) => (
								<GoalCard
									key={goal.id}
									goal={goal}
									userCurrency={userCurrency}
									linkedSavings={linkedSavingsByGoalId[goal.id] ?? 0}
									onEdit={() => openEditGoal(goal)}
									onDelete={() => void handleDeleteGoal(goal.id, goal.title)}
									isDeletePending={deleteGoalMutation.isPending}
								/>
							))}
						</div>
					) : (
						<div className="mt-6">
							<PageEmptyState message="No goals added yet." />
						</div>
					)
				) : null}

				<Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
					<SheetContent className="w-full sm:max-w-md">
						<SheetHeader>
							<SheetTitle>{isEditing ? "Edit goal" : "Add goal"}</SheetTitle>
							<SheetDescription>
								{isEditing
									? 'Update goal details. Set "In savings" for money already saved outside the ledger.'
									: "Create a new financial goal with a target amount and optional deadline."}
							</SheetDescription>
						</SheetHeader>
						<form className="grid gap-4 px-4" onSubmit={handleSaveGoal}>
							<div className="grid gap-2">
								<label htmlFor="goal-title" className="text-sm font-medium">
									Title
								</label>
								<Input
									id="goal-title"
									value={form.title}
									onChange={(event) =>
										setForm((state) => ({
											...state,
											title: event.target.value,
										}))
									}
									placeholder="e.g. Emergency fund"
								/>
							</div>
							<div className="grid gap-2">
								<label
									htmlFor="goal-target-amount"
									className="text-sm font-medium"
								>
									Target amount
								</label>
								<Input
									id="goal-target-amount"
									type="number"
									value={form.targetAmount}
									onChange={(event) =>
										setForm((state) => ({
											...state,
											targetAmount: event.target.value,
										}))
									}
									placeholder="0.00"
								/>
							</div>
							{isEditing ? (
								<div className="grid grid-cols-2 gap-3">
									<div className="grid gap-2">
										<label
											htmlFor="goal-current-amount"
											className="text-sm font-medium"
										>
											Logged progress
										</label>
										<Input
											id="goal-current-amount"
											type="number"
											value={form.currentAmount}
											onChange={(event) =>
												setForm((state) => ({
													...state,
													currentAmount: event.target.value,
												}))
											}
										/>
									</div>
									<div className="grid gap-2">
										<label
											htmlFor="goal-savings-amount"
											className="text-sm font-medium"
										>
											In savings
										</label>
										<Input
											id="goal-savings-amount"
											type="number"
											value={form.savingsAmount}
											onChange={(event) =>
												setForm((state) => ({
													...state,
													savingsAmount: event.target.value,
												}))
											}
										/>
									</div>
								</div>
							) : null}
							<div className="grid grid-cols-2 gap-3">
								<DatePickerField
									id="goal-target-date"
									label="Target date"
									value={form.targetDate}
									onChange={(targetDate) =>
										setForm((state) => ({ ...state, targetDate }))
									}
									optional
								/>
								<div className="grid gap-2">
									<label htmlFor="goal-status" className="text-sm font-medium">
										Status
									</label>
									<Select
										value={form.status}
										onValueChange={(value) =>
											setForm((state) => ({
												...state,
												status: value as GoalFormState["status"],
											}))
										}
									>
										<SelectTrigger id="goal-status" className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="active">Active</SelectItem>
											<SelectItem value="paused">Paused</SelectItem>
											<SelectItem value="completed">Completed</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
							{isEditing ? (
								<div className="grid gap-2">
									<label htmlFor="goal-note" className="text-sm font-medium">
										Note (optional)
									</label>
									<Input
										id="goal-note"
										value={form.note}
										onChange={(event) =>
											setForm((state) => ({
												...state,
												note: event.target.value,
											}))
										}
										placeholder="Any details"
									/>
								</div>
							) : null}
							<SheetFooter className="px-0">
								<Button type="submit" disabled={isSaving} className="w-full">
									{isSaving
										? "Saving..."
										: isEditing
											? "Save changes"
											: "Add goal"}
								</Button>
							</SheetFooter>
						</form>
					</SheetContent>
				</Sheet>
			</div>
		</main>
	);
}

/** Compact labelled stat used in the page header row. */
function SummaryStat({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-panel border border-border bg-panel p-4">
			<p className="text-xs font-medium text-muted-foreground">{label}</p>
			<p className="mt-1 font-num text-lg font-extrabold tracking-tight tabular-nums text-foreground">
				{value}
			</p>
		</div>
	);
}

interface GoalCardProps {
	goal: GoalDto;
	userCurrency: string;
	linkedSavings: number;
	onEdit: () => void;
	onDelete: () => void;
	isDeletePending: boolean;
}

/** A single goal as a panel card with progress. */
function GoalCard({
	goal,
	userCurrency,
	linkedSavings,
	onEdit,
	onDelete,
	isDeletePending,
}: GoalCardProps) {
	const breakdown = buildGoalProgress(goal, linkedSavings);
	const percent =
		breakdown.targetAmount > 0
			? Math.min(
					100,
					Math.round((breakdown.totalAchieved / breakdown.targetAmount) * 100),
				)
			: 0;
	const isComplete = breakdown.stillNeeded <= 0 && breakdown.targetAmount > 0;

	return (
		<article className="flex flex-col rounded-panel border border-border bg-panel p-[22px] shadow-sm">
			<div className="flex items-start justify-between gap-3">
				<div className="flex min-w-0 items-center gap-3">
					<span
						className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-soft-accent text-xl"
						aria-hidden="true"
					>
						{goalEmoji(goal.title)}
					</span>
					<div className="min-w-0">
						<h2 className="truncate font-semibold text-foreground">
							<SensitiveText text={goal.title} />
						</h2>
						<p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
							{goal.targetDate ? (
								<>
									<CalendarDays className="size-3.5" />
									{formatGoalDate(goal.targetDate)}
								</>
							) : (
								<span className="capitalize">{goal.status}</span>
							)}
						</p>
					</div>
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<button
						type="button"
						onClick={onEdit}
						aria-label={`Edit ${goal.title}`}
						className="rounded-md p-1.5 text-muted-foreground hover:bg-soft-accent hover:text-foreground"
					>
						<Pencil className="size-4" />
					</button>
					<button
						type="button"
						onClick={onDelete}
						disabled={isDeletePending}
						aria-label={`Delete ${goal.title}`}
						className="rounded-md p-1.5 text-muted-foreground hover:bg-soft-accent hover:text-expense disabled:opacity-50"
					>
						<Trash2 className="size-4" />
					</button>
				</div>
			</div>

			<div className="mt-5 flex items-end justify-between gap-2">
				<p className="min-w-0 truncate font-num text-xl font-extrabold tracking-tight tabular-nums text-foreground">
					<SensitiveAmount
						amount={breakdown.totalAchieved}
						currency={userCurrency}
					/>
				</p>
				<p className="font-num text-sm tabular-nums text-muted-foreground">
					/{" "}
					<SensitiveAmount
						amount={breakdown.targetAmount}
						currency={userCurrency}
					/>
				</p>
			</div>

			<div className="mt-2 h-2 overflow-hidden rounded-full bg-track">
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
				<span className="min-w-0 truncate text-muted-foreground">
					{isComplete ? (
						"Reached"
					) : (
						<>
							<SensitiveAmount
								amount={breakdown.stillNeeded}
								currency={userCurrency}
							/>{" "}
							to go
						</>
					)}
				</span>
			</div>
		</article>
	);
}
