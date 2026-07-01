import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SearchableSelect } from "#/components/forms/searchable-select";
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
import { useCategoriesQuery } from "#/features/categories/hooks/use-categories";
import { getExchangeRate } from "#/features/exchange-rates/api/exchange-rate-api";
import { usePaymentAccountsQuery } from "#/features/payment-accounts/hooks/use-payment-accounts";
import { formatPaymentAccountLabel } from "#/features/payment-accounts/utils/account-label";
import {
	useCreateRecurringMutation,
	useRecurringRulesQuery,
} from "#/features/recurring/hooks/use-recurring";
import {
	advanceRecurringDate,
	RECURRING_CADENCES,
	type RecurringCadence,
} from "#/features/recurring/utils/recurring-schedule";
import {
	useCreateTransactionMutation,
	useCreateScheduledTransactionMutation,
	useCreateTransferMutation,
	useDeleteTransactionMutation,
	useTransactionsQuery,
	useUpdateTransactionMutation,
	useUpdateTransferMutation,
} from "#/features/transactions/hooks/use-transactions";
import { resolveTransactionCategoryId } from "#/features/transactions/utils/transaction-category";
import type { TransactionDto } from "#/features/transactions/types/transaction";
import type {
	TransactionFormState,
	TransactionTableRow,
} from "#/features/transactions/utils/transaction-display";
import { TRANSFER_SOURCE_OUT } from "#/features/transactions/utils/transfer-direction";
import {
	formatTransactionCurrency,
	getDefaultTransactionForm,
	getTransactionPaymentAccountLabel,
	resolveTransactionSourceForSave,
} from "#/features/transactions/utils/transaction-display";
import { SUPPORTED_CURRENCIES } from "#/lib/currency";
import {
	toInputDate,
	toInputTime,
	toIsoFromDateAndTime,
	isFutureDateAndTime,
} from "#/lib/date-input";
import { cn } from "#/lib/utils";

/** Segmented tabs in the create/edit drawer; drive the createForm.type field. */
const TRANSACTION_TYPE_TABS: {
	value: TransactionFormState["type"];
	label: string;
}[] = [
	{ value: "expense", label: "Expense" },
	{ value: "income", label: "Income" },
	{ value: "transfer", label: "Transfer" },
];

/**
 * Best-effort currency symbol (e.g. "$") for the amount-input prefix.
 * Falls back to the currency code when no symbol is available.
 */
function getCurrencySymbol(currency: string): string {
	try {
		const parts = new Intl.NumberFormat(undefined, {
			style: "currency",
			currency,
			maximumFractionDigits: 0,
		}).formatToParts(0);
		return parts.find((part) => part.type === "currency")?.value ?? currency;
	} catch {
		return currency;
	}
}

/**
 * Resolves the from/to account ids for a transfer leg by pairing it with its
 * sibling leg (matched on transferGroupId). The OUT leg holds the from account,
 * the IN leg holds the to account.
 */
function resolveTransferAccounts(
	row: TransactionTableRow,
	sibling: TransactionDto | null,
): { fromPaymentAccountId: string; toPaymentAccountId: string } {
	const isOutLeg = row.source === TRANSFER_SOURCE_OUT;
	const fromAccountId = isOutLeg ? row.paymentAccountId : (sibling?.paymentAccountId ?? null);
	const toAccountId = isOutLeg ? (sibling?.paymentAccountId ?? null) : row.paymentAccountId;
	return {
		fromPaymentAccountId: fromAccountId ? String(fromAccountId) : "none",
		toPaymentAccountId: toAccountId ? String(toAccountId) : "none",
	};
}

/** Prefills the form state from an existing row when editing. */
function buildEditFormState(
	row: TransactionTableRow,
	userCurrency: string,
	sibling: TransactionDto | null,
): TransactionFormState {
	const isForeign = row.sourceCurrency.toUpperCase() !== userCurrency;
	const transferAccounts = resolveTransferAccounts(row, sibling);
	return {
		title: row.title,
		amount: isForeign && row.sourceAmount ? row.sourceAmount : row.amount,
		currency: row.sourceCurrency.toUpperCase(),
		exchangeRate: row.exchangeRate,
		type: row.type,
		categoryId: row.categoryId ? String(row.categoryId) : "",
		paymentAccountId: row.paymentAccountId
			? String(row.paymentAccountId)
			: "none",
		fromPaymentAccountId: transferAccounts.fromPaymentAccountId,
		toPaymentAccountId: transferAccounts.toPaymentAccountId,
		source: row.source,
		note: row.note,
		happenedAt: toInputDate(row.happenedAt),
		happenedAtTime: toInputTime(row.happenedAt),
	};
}

interface TransactionFormSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	userCurrency: string;
	/** When provided, the sheet opens in edit mode prefilled with this row. */
	editingRow?: TransactionTableRow | null;
}

/**
 * Self-contained create/edit transaction sheet. Controlled via `open`, so it can
 * be mounted in the app shell (quick-add from the mobile FAB) or inline on the
 * transactions page (edit). Owns its own form state and create/update/delete
 * mutations.
 */
export function TransactionFormSheet({
	open,
	onOpenChange,
	userCurrency,
	editingRow = null,
}: TransactionFormSheetProps) {
	const { data: categories = [] } = useCategoriesQuery();
	const { data: paymentAccounts = [] } = usePaymentAccountsQuery();
	const { data: allTransactions = [] } = useTransactionsQuery();
	const createTransactionMutation = useCreateTransactionMutation();
	const createScheduledTransactionMutation =
		useCreateScheduledTransactionMutation();
	const updateTransactionMutation = useUpdateTransactionMutation();
	const createTransferMutation = useCreateTransferMutation();
	const updateTransferMutation = useUpdateTransferMutation();
	const deleteTransactionMutation = useDeleteTransactionMutation();
	const createRecurringMutation = useCreateRecurringMutation();
	const { data: recurringRules = [] } = useRecurringRulesQuery();

	const [createForm, setCreateForm] = useState<TransactionFormState>(() =>
		getDefaultTransactionForm(userCurrency),
	);
	const [isFetchingRate, setIsFetchingRate] = useState(false);
	const [isCurrencyPickerOpen, setIsCurrencyPickerOpen] = useState(false);
	const [isRecurring, setIsRecurring] = useState(false);
	const [cadence, setCadence] = useState<RecurringCadence>("monthly");
	const [saveAsPlanned, setSaveAsPlanned] = useState(false);

	const editingTransactionId = editingRow?.id ?? null;
	const isEditing = editingTransactionId !== null;

	const hasExistingRecurringRule = useMemo(
		() =>
			editingTransactionId != null &&
			recurringRules.some(
				(rule) => rule.sourceTransactionId === editingTransactionId,
			),
		[recurringRules, editingTransactionId],
	);

	const transferSibling = useMemo(() => {
		if (editingRow?.transferGroupId == null) return null;
		return (
			allTransactions.find(
				(transaction) =>
					transaction.transferGroupId === editingRow.transferGroupId &&
					transaction.id !== editingRow.id,
			) ?? null
		);
	}, [allTransactions, editingRow?.transferGroupId, editingRow?.id]);

	// (Re)initialize the form when the sheet opens or the edited row changes.
	// Deliberately keyed on the row identity (not the full editingRow object or
	// allTransactions), so background refetches don't clobber in-progress edits.
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset only on row identity / open, not on data churn
	useEffect(() => {
		if (!open) return;
		if (editingRow) {
			setCreateForm(buildEditFormState(editingRow, userCurrency, transferSibling));
			setIsCurrencyPickerOpen(
				editingRow.sourceCurrency.toUpperCase() !== userCurrency,
			);
		} else {
			setCreateForm(getDefaultTransactionForm(userCurrency));
			setIsCurrencyPickerOpen(false);
		}
		setIsRecurring(false);
		setCadence("monthly");
		setSaveAsPlanned(false);
	}, [open, editingTransactionId, userCurrency]);

	const isForeignCurrency = createForm.currency !== userCurrency;
	const convertedAmountPreview = useMemo(() => {
		if (!isForeignCurrency) return null;
		const amount = Number(createForm.amount);
		const rate = Number(createForm.exchangeRate);
		if (
			!Number.isFinite(amount) ||
			!Number.isFinite(rate) ||
			amount <= 0 ||
			rate <= 0
		)
			return null;
		return formatTransactionCurrency((amount * rate).toString(), userCurrency);
	}, [
		createForm.amount,
		createForm.exchangeRate,
		isForeignCurrency,
		userCurrency,
	]);

	const categoryOptions = useMemo(
		() =>
			categories.map((category) => ({
				value: String(category.id),
				label: category.name,
			})),
		[categories],
	);
	const accountChipOptions = useMemo(
		() => [
			{ value: "none", label: "Not specified" },
			...paymentAccounts
				.filter((account) => account.isActive)
				.map((account) => ({
					value: String(account.id),
					label: formatPaymentAccountLabel(account),
				})),
		],
		[paymentAccounts],
	);
	const transferAccountOptions = useMemo(
		() =>
			paymentAccounts
				.filter((account) => account.isActive)
				.map((account) => ({
					value: String(account.id),
					label: formatPaymentAccountLabel(account),
				})),
		[paymentAccounts],
	);

	const isSaving =
		createTransactionMutation.isPending ||
		createScheduledTransactionMutation.isPending ||
		updateTransactionMutation.isPending ||
		createTransferMutation.isPending ||
		updateTransferMutation.isPending;
	const showCategoryField =
		createForm.type === "expense" || createForm.type === "transfer";
	const canSaveAsPlanned =
		!isEditing && createForm.type !== "transfer" && !isRecurring;
	const isFutureEntry = useMemo(
		() =>
			isFutureDateAndTime(createForm.happenedAt, createForm.happenedAtTime),
		[createForm.happenedAt, createForm.happenedAtTime],
	);

	async function handleCurrencyChange(currency: string) {
		if (currency === userCurrency) {
			setCreateForm((state) => ({ ...state, currency, exchangeRate: "1" }));
			setIsCurrencyPickerOpen(false);
			return;
		}

		setIsCurrencyPickerOpen(true);
		setCreateForm((state) => ({ ...state, currency }));
		setIsFetchingRate(true);

		try {
			const rate = await getExchangeRate(currency, userCurrency);
			setCreateForm((state) => ({
				...state,
				currency,
				exchangeRate: rate.toFixed(6),
			}));
		} catch {
			toast.error("Could not fetch exchange rate. Enter it manually.");
		} finally {
			setIsFetchingRate(false);
		}
	}

	async function handleDeleteTransaction(id: number, title: string) {
		await toast.promise(deleteTransactionMutation.mutateAsync(id), {
			loading: "Deleting transaction...",
			success: `Deleted ${title}`,
			error: (message) =>
				message instanceof Error
					? message.message
					: "Unable to delete transaction",
		});
	}

	async function handleSaveTransfer() {
		if (
			createForm.fromPaymentAccountId === "none" ||
			createForm.toPaymentAccountId === "none"
		) {
			toast.error("Choose both a source and destination account");
			return;
		}

		if (createForm.fromPaymentAccountId === createForm.toPaymentAccountId) {
			toast.error("Transfer accounts must differ");
			return;
		}

		const transferInput = {
			title: createForm.title.trim(),
			amount: createForm.amount.trim(),
			currency: createForm.currency,
			exchangeRate: isForeignCurrency
				? createForm.exchangeRate.trim()
				: undefined,
			fromPaymentAccountId: Number(createForm.fromPaymentAccountId),
			toPaymentAccountId: Number(createForm.toPaymentAccountId),
			categoryId: createForm.categoryId
				? Number(createForm.categoryId)
				: null,
			note: createForm.note.trim() || undefined,
			happenedAt: toIsoFromDateAndTime(
				createForm.happenedAt,
				createForm.happenedAtTime,
			),
		};

		if (isEditing && editingTransactionId) {
			const updatePromise = updateTransferMutation.mutateAsync({
				id: editingTransactionId,
				input: transferInput,
			});

			await toast.promise(updatePromise, {
				loading: editingRow?.transferGroupId
					? "Updating transfer..."
					: "Converting to transfer...",
				success: editingRow?.transferGroupId
					? "Transfer updated"
					: "Converted to transfer",
				error: (message) =>
					message instanceof Error
						? message.message
						: "Unable to save transfer",
			});
		} else {
			const createPromise = createTransferMutation.mutateAsync(transferInput);

			await toast.promise(createPromise, {
				loading: "Creating transfer...",
				success: "Transfer created",
				error: (message) =>
					message instanceof Error
						? message.message
						: "Unable to create transfer",
			});
		}

		onOpenChange(false);
	}

	/**
	 * Creates a recurring rule for the given transaction. The transaction itself
	 * covers the current occurrence; the rule schedules the next one for the cron
	 * to materialize. Linking via sourceTransactionId lets the rule be purged when
	 * that txn is deleted.
	 */
	async function scheduleRecurringRule(
		sourceTransactionId: number,
		happenedAt: string,
	) {
		const nextRunAt = advanceRecurringDate(new Date(happenedAt), cadence);
		const recurringPromise = createRecurringMutation.mutateAsync({
			title: createForm.title.trim(),
			amount: createForm.amount.trim(),
			currency: createForm.currency,
			type: createForm.type,
			categoryId: createForm.categoryId ? Number(createForm.categoryId) : null,
			paymentAccountId:
				createForm.paymentAccountId === "none"
					? null
					: Number(createForm.paymentAccountId),
			note: createForm.note.trim() || null,
			sourceTransactionId,
			cadence,
			nextRunAt: nextRunAt.toISOString(),
		});

		await toast.promise(recurringPromise, {
			loading: "Scheduling repeat...",
			success: `Repeats ${cadence} — next on ${nextRunAt.toLocaleDateString()}`,
			error: (message) =>
				message instanceof Error
					? message.message
					: "Transaction saved, but the repeat schedule failed",
		});
	}

	async function handleSaveTransaction(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (createForm.type === "expense" && !createForm.categoryId) {
			toast.error("Choose a category for expense entries");
			return;
		}

		if (!createForm.title.trim() || !createForm.amount.trim()) {
			toast.error("Title and amount are required");
			return;
		}

		if (!createForm.happenedAt) {
			toast.error("Transaction date is required");
			return;
		}

		if (isForeignCurrency && !createForm.exchangeRate.trim()) {
			toast.error("Exchange rate is required for foreign currency entries");
			return;
		}

		if (createForm.type === "transfer") {
			await handleSaveTransfer();
			return;
		}

		const happenedAt = toIsoFromDateAndTime(
			createForm.happenedAt,
			createForm.happenedAtTime,
		);

		if (saveAsPlanned && !isEditing) {
			const scheduledPromise = createScheduledTransactionMutation.mutateAsync({
				title: createForm.title.trim(),
				amount: createForm.amount.trim(),
				currency: createForm.currency,
				exchangeRate: isForeignCurrency
					? createForm.exchangeRate.trim()
					: undefined,
				type: createForm.type,
				categoryId: resolveTransactionCategoryId(
					createForm.type,
					createForm.categoryId ? Number(createForm.categoryId) : null,
				),
				paymentAccountId:
					createForm.paymentAccountId === "none"
						? null
						: Number(createForm.paymentAccountId),
				note: createForm.note.trim() || undefined,
				happenedAt,
			});

			await toast.promise(scheduledPromise, {
				loading: "Saving planned transaction...",
				success: "Planned — confirm on the dashboard when it happens",
				error: (message) =>
					message instanceof Error
						? message.message
						: "Unable to save planned transaction",
			});

			onOpenChange(false);
			return;
		}

		const resolvedSource = resolveTransactionSourceForSave(createForm);
		const payload = {
			title: createForm.title.trim(),
			amount: createForm.amount.trim(),
			currency: createForm.currency,
			exchangeRate: isForeignCurrency
				? createForm.exchangeRate.trim()
				: undefined,
			type: createForm.type,
			categoryId: resolveTransactionCategoryId(
				createForm.type,
				createForm.categoryId ? Number(createForm.categoryId) : null,
			),
			paymentAccountId:
				createForm.paymentAccountId === "none"
					? null
					: Number(createForm.paymentAccountId),
			source: resolvedSource,
			note: createForm.note.trim() || undefined,
			happenedAt,
		};

		if (isEditing && editingTransactionId) {
			const updatePromise = updateTransactionMutation.mutateAsync({
				id: editingTransactionId,
				input: {
					...payload,
					source: resolvedSource ?? null,
					note: createForm.note.trim() || null,
				},
			});

			await toast.promise(updatePromise, {
				loading: "Updating transaction...",
				success: "Transaction updated",
				error: (message) =>
					message instanceof Error
						? message.message
						: "Unable to update transaction",
			});

			if (isRecurring && !hasExistingRecurringRule) {
				await scheduleRecurringRule(editingTransactionId, happenedAt);
			}
		} else {
			const createPromise = createTransactionMutation.mutateAsync(payload);

			const createdTransaction = await toast.promise(createPromise, {
				loading: "Creating transaction...",
				success: "Transaction created",
				error: (message) =>
					message instanceof Error
						? message.message
						: "Unable to create transaction",
			}).unwrap();

			if (isRecurring) {
				await scheduleRecurringRule(createdTransaction.id, happenedAt);
			}
		}

		onOpenChange(false);
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full bg-panel sm:max-w-md">
				<SheetHeader>
					<SheetTitle>
						{isEditing ? "Update transaction" : "Create transaction"}
					</SheetTitle>
					<SheetDescription>
						{isEditing
							? "Edit this ledger entry"
							: "Add a new entry to your ledger"}
					</SheetDescription>
				</SheetHeader>
				<form
					className="grid gap-5 overflow-y-auto px-4 pb-4"
					onSubmit={handleSaveTransaction}
				>
					{/* Expense / Income / Transfer segmented tabs (drive createForm.type) */}
					<div className="grid grid-cols-3 gap-1 rounded-panel bg-input-bg p-1">
						{TRANSACTION_TYPE_TABS.map((tab) => {
							const isActive = createForm.type === tab.value;
							return (
								<button
									key={tab.value}
									type="button"
									aria-pressed={isActive}
									onClick={() =>
										setCreateForm((state) => ({
											...state,
											type: tab.value,
											categoryId:
												tab.value === "income" ? "" : state.categoryId,
										}))
									}
									className={cn(
										"rounded-[calc(var(--radius-panel)-4px)] px-3 py-2 text-sm font-semibold transition-colors",
										isActive
											? "bg-panel shadow-sm"
											: "text-muted-foreground hover:text-foreground",
										isActive && tab.value === "expense" && "text-expense",
										isActive && tab.value === "income" && "text-income",
										isActive && tab.value === "transfer" && "text-foreground",
									)}
								>
									{tab.label}
								</button>
							);
						})}
					</div>

					{/* Large centered amount input */}
					<div className="grid gap-2">
						<div className="flex items-end justify-center gap-2">
							<span
								className="font-num pb-2 text-2xl font-semibold text-muted-foreground"
								aria-hidden="true"
							>
								{getCurrencySymbol(createForm.currency)}
							</span>
							<input
								type="number"
								inputMode="decimal"
								aria-label="Amount"
								value={createForm.amount}
								onChange={(event) =>
									setCreateForm((state) => ({
										...state,
										amount: event.target.value,
									}))
								}
								placeholder="0.00"
								className="font-num w-44 bg-transparent text-center text-3xl sm:text-5xl font-extrabold tracking-tight tabular-nums text-foreground outline-none placeholder:text-muted-foreground/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
							/>
						</div>
						{isCurrencyPickerOpen || isForeignCurrency ? (
							<div className="flex justify-center">
								<Select
									value={createForm.currency}
									onValueChange={(value) => void handleCurrencyChange(value)}
								>
									<SelectTrigger className="w-[7.5rem] bg-input-bg">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{SUPPORTED_CURRENCIES.map((currency) => (
											<SelectItem key={currency.code} value={currency.code}>
												{currency.code}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						) : (
							<div className="flex justify-center">
								<button
									type="button"
									className="text-xs text-primary underline-offset-4 hover:underline"
									onClick={() => setIsCurrencyPickerOpen(true)}
								>
									Paid in another currency?
								</button>
							</div>
						)}
						{isForeignCurrency && convertedAmountPreview ? (
							<p className="text-center text-xs text-muted-foreground">
								≈ {convertedAmountPreview} in {userCurrency}
							</p>
						) : null}
					</div>

					{isForeignCurrency ? (
						<div className="grid gap-2">
							<label
								htmlFor="transaction-exchange-rate"
								className="text-sm font-medium"
							>
								Exchange rate (1 {createForm.currency} → {userCurrency})
							</label>
							<div className="relative">
								<Input
									id="transaction-exchange-rate"
									type="number"
									value={createForm.exchangeRate}
									onChange={(event) =>
										setCreateForm((state) => ({
											...state,
											exchangeRate: event.target.value,
										}))
									}
									placeholder="0.00"
									disabled={isFetchingRate}
									className="bg-input-bg"
								/>
								{isFetchingRate ? (
									<Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
								) : null}
							</div>
						</div>
					) : null}

					<div className="grid gap-2">
						<label
							htmlFor="transaction-description"
							className="text-sm font-medium"
						>
							Description
						</label>
						<Input
							id="transaction-description"
							value={createForm.title}
							onChange={(event) =>
								setCreateForm((state) => ({
									...state,
									title: event.target.value,
								}))
							}
							placeholder="Salary, groceries, Netflix..."
							className="bg-input-bg"
						/>
					</div>

					{showCategoryField ? (
						<div className="grid gap-2">
							<div className="flex items-center justify-between gap-2">
								<span className="text-sm font-medium">
									{createForm.type === "transfer"
										? "Category (optional)"
										: "Category"}
								</span>
								<Link
									to="/categories"
									onClick={() => onOpenChange(false)}
									className="text-xs text-primary underline-offset-4 hover:underline"
								>
									Manage
								</Link>
							</div>
							{categoryOptions.length > 0 ? (
								<SearchableSelect
									value={createForm.categoryId}
									onValueChange={(value) =>
										setCreateForm((state) => ({ ...state, categoryId: value }))
									}
									options={categoryOptions}
									placeholder="Select category"
									searchPlaceholder="Search categories..."
									emptyMessage="No categories found."
								/>
							) : (
								<p className="text-xs text-muted-foreground">
									No categories yet.
								</p>
							)}
						</div>
					) : null}
					{createForm.type === "income" ? (
						<p className="text-xs text-muted-foreground">
							Income entries do not need a category.
						</p>
					) : null}

					{createForm.type === "transfer" ? (
						<div className="grid gap-4">
							<div className="grid gap-2">
								<span className="text-sm font-medium">From account</span>
								<Select
									value={createForm.fromPaymentAccountId}
									onValueChange={(value) =>
										setCreateForm((state) => ({
											...state,
											fromPaymentAccountId: value,
										}))
									}
								>
									<SelectTrigger className="w-full bg-input-bg">
										<SelectValue placeholder="Select source account" />
									</SelectTrigger>
									<SelectContent>
										{transferAccountOptions.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="grid gap-2">
								<span className="text-sm font-medium">To account</span>
								<Select
									value={createForm.toPaymentAccountId}
									onValueChange={(value) =>
										setCreateForm((state) => ({
											...state,
											toPaymentAccountId: value,
										}))
									}
								>
									<SelectTrigger className="w-full bg-input-bg">
										<SelectValue placeholder="Select destination account" />
									</SelectTrigger>
									<SelectContent>
										{transferAccountOptions.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<Link
								to="/accounts"
								onClick={() => onOpenChange(false)}
								className="text-xs text-primary underline-offset-4 hover:underline"
							>
								Manage accounts
							</Link>
						</div>
					) : (
						<div className="grid gap-2">
							<span className="text-sm font-medium">
								{getTransactionPaymentAccountLabel(createForm.type)}
							</span>
							<div className="flex flex-wrap gap-2">
								{accountChipOptions.map((option) => (
									<button
										key={option.value}
										type="button"
										className="md-chip"
										data-active={createForm.paymentAccountId === option.value}
										aria-pressed={createForm.paymentAccountId === option.value}
										onClick={() =>
											setCreateForm((state) => ({
												...state,
												paymentAccountId: option.value,
											}))
										}
									>
										{option.label}
									</button>
								))}
								<Link
									to="/accounts"
									onClick={() => onOpenChange(false)}
									className="md-chip border-dashed"
									data-active={false}
								>
									Manage
								</Link>
							</div>
						</div>
					)}

					<div className="grid grid-cols-2 gap-3">
						<DatePickerField
							id="transaction-date"
							label="Date"
							value={createForm.happenedAt}
							onChange={(happenedAt) =>
								setCreateForm((state) => ({ ...state, happenedAt }))
							}
						/>
						<div className="grid gap-2">
							<label
								htmlFor="transaction-time"
								className="text-sm font-medium"
							>
								Time
							</label>
							<Input
								id="transaction-time"
								type="time"
								value={createForm.happenedAtTime}
								onChange={(event) =>
									setCreateForm((state) => ({
										...state,
										happenedAtTime: event.target.value,
									}))
								}
								className="bg-input-bg"
							/>
						</div>
					</div>

					{canSaveAsPlanned ? (
						<div className="grid gap-2 rounded-panel border border-border bg-input-bg p-3">
							<label className="flex items-center justify-between gap-3">
								<span className="grid gap-0.5">
									<span className="text-sm font-medium">Save as planned</span>
									<span className="text-xs text-muted-foreground">
										Keep it off your balance until you confirm on the dashboard.
									</span>
								</span>
								<input
									type="checkbox"
									checked={saveAsPlanned}
									onChange={(event) => {
										const checked = event.target.checked;
										setSaveAsPlanned(checked);
										if (checked) {
											setIsRecurring(false);
										}
									}}
									className="size-4 shrink-0 accent-primary"
								/>
							</label>
							{isFutureEntry && !saveAsPlanned ? (
								<p className="text-xs text-muted-foreground">
									This date and time are in the future — planned is
									recommended so balances stay accurate.
								</p>
							) : null}
						</div>
					) : createForm.type === "transfer" && !isEditing ? (
						<p className="text-xs text-muted-foreground">
							Planned transfers are not supported yet — transfers save as
							confirmed.
						</p>
					) : null}

					{createForm.type !== "transfer" && hasExistingRecurringRule ? (
						<p className="rounded-panel border border-border bg-input-bg px-3 py-2 text-xs text-muted-foreground">
							This transaction already repeats on a schedule. Manage it from the
							recurring view.
						</p>
					) : createForm.type !== "transfer" && !saveAsPlanned ? (
						<div className="grid gap-3 rounded-panel border border-border bg-input-bg p-3">
							<label className="flex items-center justify-between gap-3">
								<span className="grid gap-0.5">
									<span className="text-sm font-medium">Repeat this</span>
									<span className="text-xs text-muted-foreground">
										Auto-add it on a schedule (e.g. subscriptions, rent).
									</span>
								</span>
								<input
									type="checkbox"
									checked={isRecurring}
									onChange={(event) => setIsRecurring(event.target.checked)}
									className="size-4 shrink-0 accent-primary"
								/>
							</label>
							{isRecurring ? (
								<div className="grid grid-cols-3 gap-1 rounded-panel bg-panel p-1">
									{RECURRING_CADENCES.map((option) => {
										const active = cadence === option.value;
										return (
											<button
												key={option.value}
												type="button"
												aria-pressed={active}
												onClick={() => setCadence(option.value)}
												className={cn(
													"rounded-[calc(var(--radius-panel)-4px)] px-3 py-1.5 text-xs font-semibold transition-colors",
													active
														? "bg-primary text-primary-foreground"
														: "text-muted-foreground hover:text-foreground",
												)}
											>
												{option.label}
											</button>
										);
									})}
								</div>
							) : null}
						</div>
					) : null}

					<div className="grid gap-2">
						<label htmlFor="transaction-note" className="text-sm font-medium">
							Note (optional)
						</label>
						<textarea
							id="transaction-note"
							value={createForm.note}
							onChange={(event) =>
								setCreateForm((state) => ({
									...state,
									note: event.target.value,
								}))
							}
							placeholder="Any details"
							rows={3}
							className="rounded-panel border border-border bg-input-bg px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
						/>
					</div>

					<SheetFooter className="flex-row gap-2 px-0">
						{isEditing && editingTransactionId ? (
							<Button
								type="button"
								variant="ghost"
								className="text-expense hover:text-expense"
								disabled={isSaving || deleteTransactionMutation.isPending}
								onClick={() => {
									const id = editingTransactionId;
									const title = createForm.title;
									onOpenChange(false);
									void handleDeleteTransaction(id, title);
								}}
							>
								Delete
							</Button>
						) : null}
						<Button
							type="button"
							variant="ghost"
							className="ml-auto"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={isSaving}
							className="bg-primary text-primary-foreground"
						>
							{isSaving
								? "Saving..."
								: isEditing
									? "Update transaction"
									: saveAsPlanned
										? "Save as planned"
										: "Save transaction"}
						</Button>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	);
}
