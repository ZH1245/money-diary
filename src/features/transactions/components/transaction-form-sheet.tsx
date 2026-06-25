import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
	useCreateTransactionMutation,
	useDeleteTransactionMutation,
	useUpdateTransactionMutation,
} from "#/features/transactions/hooks/use-transactions";
import {
	requiresTransactionCategory,
	resolveTransactionCategoryId,
} from "#/features/transactions/utils/transaction-category";
import type {
	TransactionFormState,
	TransactionTableRow,
} from "#/features/transactions/utils/transaction-display";
import {
	formatTransactionCurrency,
	getDefaultTransactionForm,
	getTransactionPaymentAccountLabel,
	getTransferDirectionFromTransactionSource,
	resolveTransactionSourceForSave,
} from "#/features/transactions/utils/transaction-display";
import { SUPPORTED_CURRENCIES } from "#/lib/currency";
import { toInputDate, toIsoDateAtNoon } from "#/lib/date-input";
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

/** Prefills the form state from an existing row when editing. */
function buildEditFormState(
	row: TransactionTableRow,
	userCurrency: string,
): TransactionFormState {
	const isForeign = row.sourceCurrency.toUpperCase() !== userCurrency;
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
		transferDirection: getTransferDirectionFromTransactionSource(row.source),
		source: row.source,
		note: row.note,
		happenedAt: toInputDate(row.happenedAt),
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
	const createTransactionMutation = useCreateTransactionMutation();
	const updateTransactionMutation = useUpdateTransactionMutation();
	const deleteTransactionMutation = useDeleteTransactionMutation();

	const [createForm, setCreateForm] = useState<TransactionFormState>(() =>
		getDefaultTransactionForm(userCurrency),
	);
	const [isFetchingRate, setIsFetchingRate] = useState(false);
	const [isCurrencyPickerOpen, setIsCurrencyPickerOpen] = useState(false);

	const editingTransactionId = editingRow?.id ?? null;
	const isEditing = editingTransactionId !== null;

	// (Re)initialize the form each time the sheet opens, based on edit/create mode.
	useEffect(() => {
		if (!open) return;
		if (editingRow) {
			setCreateForm(buildEditFormState(editingRow, userCurrency));
			setIsCurrencyPickerOpen(
				editingRow.sourceCurrency.toUpperCase() !== userCurrency,
			);
		} else {
			setCreateForm(getDefaultTransactionForm(userCurrency));
			setIsCurrencyPickerOpen(false);
		}
	}, [open, editingRow, userCurrency]);

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

	const isSaving =
		createTransactionMutation.isPending || updateTransactionMutation.isPending;
	const showCategoryField = requiresTransactionCategory(createForm.type);

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

	async function handleSaveTransaction(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (
			requiresTransactionCategory(createForm.type) &&
			!createForm.categoryId
		) {
			toast.error("Choose a category for expense and transfer entries");
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

		const happenedAt = toIsoDateAtNoon(createForm.happenedAt);
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
		} else {
			const createPromise = createTransactionMutation.mutateAsync(payload);

			await toast.promise(createPromise, {
				loading: "Creating transaction...",
				success: "Transaction created",
				error: (message) =>
					message instanceof Error
						? message.message
						: "Unable to create transaction",
			});
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
								className="font-num w-44 bg-transparent text-center text-5xl font-extrabold tracking-tight tabular-nums text-foreground outline-none placeholder:text-muted-foreground/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
								<span className="text-sm font-medium">Category</span>
								<Link
									to="/categories"
									className="text-xs text-primary underline-offset-4 hover:underline"
								>
									Manage
								</Link>
							</div>
							{categoryOptions.length > 0 ? (
								<div className="flex flex-wrap gap-2">
									{categoryOptions.map((option) => (
										<button
											key={option.value}
											type="button"
											className="md-chip"
											data-active={createForm.categoryId === option.value}
											aria-pressed={createForm.categoryId === option.value}
											onClick={() =>
												setCreateForm((state) => ({
													...state,
													categoryId: option.value,
												}))
											}
										>
											{option.label}
										</button>
									))}
								</div>
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
								className="md-chip border-dashed"
								data-active={false}
							>
								Manage
							</Link>
						</div>
					</div>

					{createForm.type === "transfer" ? (
						<div className="grid gap-2">
							<span className="text-sm font-medium">Transfer direction</span>
							<Select
								value={createForm.transferDirection}
								onValueChange={(value) =>
									setCreateForm((state) => ({
										...state,
										transferDirection: value as "in" | "out",
									}))
								}
							>
								<SelectTrigger className="w-full bg-input-bg">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="in">Money into this account</SelectItem>
									<SelectItem value="out">Money out of this account</SelectItem>
								</SelectContent>
							</Select>
							<p className="text-xs text-muted-foreground">
								Example: bank to Cash on hand → choose Cash on hand and
								&quot;Money into this account&quot;.
							</p>
						</div>
					) : null}

					<DatePickerField
						id="transaction-date"
						label="Date"
						value={createForm.happenedAt}
						onChange={(happenedAt) =>
							setCreateForm((state) => ({ ...state, happenedAt }))
						}
					/>

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
									: "Save transaction"}
						</Button>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	);
}
