import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import type { ColumnDef } from "@tanstack/react-table";
import {
	ArrowDownLeft,
	ArrowLeftRight,
	ArrowUpRight,
	Loader2,
	Plus,
	TrendingDown,
	TrendingUp,
	Wallet,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { toast } from "sonner";
import {
	DataTable,
	DataTableColumnHeader,
} from "#/components/data-table/data-table";
import { PageContentSkeleton } from "#/components/feedback/page-state";
import { TableRowActions } from "#/components/feedback/table-row-actions";
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
import { Skeleton } from "#/components/ui/skeleton";
import { useCategoriesQuery } from "#/features/categories/hooks/use-categories";
import { dashboardDateRangeStore } from "#/features/dashboard/store/dashboard-date-range-store";
import { isDateInRange } from "#/features/dashboard/utils/dashboard-date-range";
import { getExchangeRate } from "#/features/exchange-rates/api/exchange-rate-api";
import { usePaymentAccountsQuery } from "#/features/payment-accounts/hooks/use-payment-accounts";
import { formatPaymentAccountLabel } from "#/features/payment-accounts/utils/account-label";
import {
	useCreateTransactionMutation,
	useDeleteTransactionMutation,
	useTransactionsQuery,
	useUpdateTransactionMutation,
} from "#/features/transactions/hooks/use-transactions";
import {
	setTransactionType,
	transactionFiltersStore,
} from "#/features/transactions/store/transaction-filters-store";
import {
	requiresTransactionCategory,
	resolveTransactionCategoryId,
} from "#/features/transactions/utils/transaction-category";
import type {
	TransactionFormState,
	TransactionTableRow,
} from "#/features/transactions/utils/transaction-display";
import {
	buildTransactionChartData,
	buildTransactionTableRows,
	buildTransactionTotals,
	formatTransactionCurrency,
	getDefaultTransactionForm,
	getTransactionPaymentAccountLabel,
	getTransferDirectionFromTransactionSource,
	resolveTransactionSourceForSave,
} from "#/features/transactions/utils/transaction-display";
import { SUPPORTED_CURRENCIES } from "#/lib/currency";
import { toInputDate, toIsoDateAtNoon } from "#/lib/date-input";
import {
	formatSensitiveCompactAmount,
	formatSensitiveCurrency,
	PRIVACY_MASK_CLASS,
	usePrivacyModeEnabled,
} from "#/lib/privacy/sensitive-format";
import { cn } from "#/lib/utils";

interface TransactionsPageContentProps {
	userCurrency: string;
}

type TransactionFlowType = TransactionTableRow["type"];

const TRANSACTION_TYPE_FILTERS: {
	value: "all" | TransactionFlowType;
	label: string;
}[] = [
	{ value: "all", label: "All" },
	{ value: "income", label: "Income" },
	{ value: "expense", label: "Spending" },
	{ value: "transfer", label: "Transfers" },
];

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
 * Summary tile (Total in / out / Net) for the transactions header.
 */
function SummaryTile({
	label,
	icon,
	amount,
	currency,
	isPrivacyMode,
	tone,
}: {
	label: string;
	icon: ReactNode;
	amount: number;
	currency: string;
	isPrivacyMode: boolean;
	tone: "income" | "expense";
}) {
	const formatted = formatSensitiveCurrency(amount, currency, isPrivacyMode);
	return (
		<div className="md-panel flex flex-col gap-3 p-5">
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium text-muted-foreground">
					{label}
				</span>
				<span
					className={cn(
						"flex size-8 items-center justify-center rounded-full",
						tone === "income"
							? "bg-soft-accent text-income"
							: "bg-track text-expense",
					)}
				>
					{icon}
				</span>
			</div>
			<span
				className={cn(
					"font-num text-2xl tabular-nums font-bold",
					isPrivacyMode
						? PRIVACY_MASK_CLASS
						: tone === "income"
							? "text-income"
							: "text-expense",
				)}
			>
				{formatted}
			</span>
		</div>
	);
}

/**
 * Leading icon for a transaction row, tinted by flow type.
 */
function TransactionTypeIcon({ type }: { type: TransactionFlowType }) {
	const Icon =
		type === "income"
			? ArrowDownLeft
			: type === "expense"
				? ArrowUpRight
				: ArrowLeftRight;
	const tone =
		type === "income"
			? "bg-soft-accent text-income"
			: type === "expense"
				? "bg-track text-expense"
				: "bg-track text-muted-foreground";
	return (
		<span
			className={cn(
				"flex size-9 shrink-0 items-center justify-center rounded-full",
				tone,
			)}
		>
			<Icon className="size-4" aria-hidden="true" />
		</span>
	);
}

/**
 * Icon + name (and optional note) cell for the transactions table.
 */
function TransactionNameCell({ row }: { row: TransactionTableRow }) {
	return (
		<div className="flex min-w-0 items-center gap-3">
			<TransactionTypeIcon type={row.type} />
			<div className="min-w-0">
				<SensitiveText
					text={row.title}
					className="block truncate font-medium text-foreground"
				/>
				{row.note ? (
					<SensitiveText
						text={row.note}
						className="block truncate text-xs text-muted-foreground"
					/>
				) : null}
			</div>
		</div>
	);
}

/**
 * Signed, token-colored amount cell.
 */
function TransactionAmountCell({
	amount,
	currency,
	type,
}: {
	amount: string;
	currency: string;
	type: TransactionFlowType;
}) {
	const isPrivacyMode = usePrivacyModeEnabled();
	const formatted = formatSensitiveCurrency(amount, currency, isPrivacyMode);

	if (isPrivacyMode) {
		return (
			<span
				className={cn(PRIVACY_MASK_CLASS, "font-num tabular-nums font-bold")}
			>
				{formatted}
			</span>
		);
	}

	const sign = type === "income" ? "+" : type === "expense" ? "−" : "";
	const tone =
		type === "income"
			? "text-income"
			: type === "expense"
				? "text-foreground"
				: "text-muted-foreground";

	return (
		<span className={cn("font-num tabular-nums font-bold", tone)}>
			{sign}
			{formatted}
		</span>
	);
}

/**
 * Transactions list, charts, filters, and create/edit sheet.
 */
export function TransactionsPageContent({
	userCurrency,
}: TransactionsPageContentProps) {
	const { data, isPending, isError, error } = useTransactionsQuery();
	const { data: categories = [] } = useCategoriesQuery();
	const { data: paymentAccounts = [] } = usePaymentAccountsQuery();
	const createTransactionMutation = useCreateTransactionMutation();
	const updateTransactionMutation = useUpdateTransactionMutation();
	const deleteTransactionMutation = useDeleteTransactionMutation();
	const filters = useStore(transactionFiltersStore, (state) => state);
	const dateRange = useStore(dashboardDateRangeStore, (state) => state);
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [editingTransactionId, setEditingTransactionId] = useState<
		number | null
	>(null);
	const [createForm, setCreateForm] = useState<TransactionFormState>(() =>
		getDefaultTransactionForm(userCurrency),
	);
	const [isFetchingRate, setIsFetchingRate] = useState(false);
	const [isCurrencyPickerOpen, setIsCurrencyPickerOpen] = useState(false);

	const isForeignCurrency = createForm.currency !== userCurrency;
	const isPrivacyMode = usePrivacyModeEnabled();
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

	const filteredTransactions = (data ?? []).filter((transaction) => {
		const typeMatches =
			filters.type === "all" || transaction.type === filters.type;
		const dateMatches = isDateInRange(
			transaction.happenedAt,
			dateRange.from,
			dateRange.to,
		);
		return typeMatches && dateMatches;
	});
	const transactionTotals = useMemo(
		() => buildTransactionTotals(filteredTransactions),
		[filteredTransactions],
	);
	const chartData = useMemo(
		() => buildTransactionChartData(transactionTotals),
		[transactionTotals],
	);
	const tableRows = useMemo(
		() =>
			buildTransactionTableRows(
				filteredTransactions,
				paymentAccounts,
				categories,
			),
		[filteredTransactions, paymentAccounts, categories],
	);
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

	const handleDeleteTransaction = useCallback(
		async (id: number, title: string) => {
			await toast.promise(deleteTransactionMutation.mutateAsync(id), {
				loading: "Deleting transaction...",
				success: `Deleted ${title}`,
				error: (message) =>
					message instanceof Error
						? message.message
						: "Unable to delete transaction",
			});
		},
		[deleteTransactionMutation],
	);

	const openEditSheet = useCallback(
		(row: TransactionTableRow) => {
			const isForeign = row.sourceCurrency.toUpperCase() !== userCurrency;
			setEditingTransactionId(row.id);
			setIsCurrencyPickerOpen(isForeign);
			setCreateForm({
				title: row.title,
				amount: isForeign && row.sourceAmount ? row.sourceAmount : row.amount,
				currency: row.sourceCurrency.toUpperCase(),
				exchangeRate: row.exchangeRate,
				type: row.type,
				categoryId: row.categoryId ? String(row.categoryId) : "",
				paymentAccountId: row.paymentAccountId
					? String(row.paymentAccountId)
					: "none",
				transferDirection: getTransferDirectionFromTransactionSource(
					row.source,
				),
				source: row.source,
				note: row.note,
				happenedAt: toInputDate(row.happenedAt),
			});
			setIsSheetOpen(true);
		},
		[userCurrency],
	);

	const transactionColumns = useMemo<ColumnDef<TransactionTableRow>[]>(
		() => [
			{
				accessorKey: "title",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Transaction" />
				),
				cell: ({ row }) => <TransactionNameCell row={row.original} />,
			},
			{
				id: "category",
				accessorFn: (row) => row.categoryLabel,
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Category" />
				),
				cell: ({ row }) => {
					if (row.original.type === "income") {
						return <span className="text-sm text-muted-foreground">—</span>;
					}
					return (
						<span className="md-chip inline-flex bg-soft-accent text-nav-active-fg border-transparent">
							<SensitiveText text={row.original.categoryLabel} />
						</span>
					);
				},
			},
			{
				accessorKey: "happenedAt",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Date" />
				),
				cell: ({ row }) => (
					<span className="text-sm text-muted-foreground">
						{row.original.happenedAtLabel}
					</span>
				),
				sortingFn: (first, second) =>
					new Date(first.original.happenedAt).getTime() -
					new Date(second.original.happenedAt).getTime(),
			},
			{
				id: "account",
				accessorFn: (row) => row.accountLabel,
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Account" />
				),
				cell: ({ row }) => (
					<span className="text-sm text-muted-foreground">
						{row.original.accountLabel || "—"}
					</span>
				),
			},
			{
				id: "amount",
				accessorFn: (row) => Number(row.amount),
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Amount" />
				),
				cell: ({ row }) => (
					<TransactionAmountCell
						amount={row.original.amount}
						currency={userCurrency}
						type={row.original.type}
					/>
				),
			},
			{
				id: "actions",
				enableSorting: false,
				enableGlobalFilter: false,
				header: () => <div className="text-right">Actions</div>,
				meta: { cellClassName: "w-[6.5rem]" },
				cell: ({ row }) => (
					<TableRowActions
						label={row.original.title}
						onEdit={() => openEditSheet(row.original)}
						onDelete={() =>
							void handleDeleteTransaction(row.original.id, row.original.title)
						}
						isDeletePending={deleteTransactionMutation.isPending}
					/>
				),
			},
		],
		[
			deleteTransactionMutation.isPending,
			handleDeleteTransaction,
			openEditSheet,
			userCurrency,
		],
	);

	const isEditing = editingTransactionId !== null;
	const isSaving =
		createTransactionMutation.isPending || updateTransactionMutation.isPending;
	const showCategoryField = requiresTransactionCategory(createForm.type);

	function openCreateSheet() {
		setEditingTransactionId(null);
		setIsCurrencyPickerOpen(false);
		setCreateForm(getDefaultTransactionForm(userCurrency));
		setIsSheetOpen(true);
	}

	function handleSheetOpenChange(open: boolean) {
		setIsSheetOpen(open);
		if (!open) {
			setEditingTransactionId(null);
			setIsCurrencyPickerOpen(false);
			setCreateForm(getDefaultTransactionForm(userCurrency));
		}
	}

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

		setCreateForm(getDefaultTransactionForm(userCurrency));
		setIsCurrencyPickerOpen(false);
		setEditingTransactionId(null);
		setIsSheetOpen(false);
	}

	const netTotal = transactionTotals.income - transactionTotals.expense;

	return (
		<main className="min-h-full bg-canvas p-4 md:p-8">
			<div className="mx-auto flex max-w-6xl flex-col gap-6">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h1 className="display-title text-2xl font-bold text-foreground md:text-3xl">
							Transactions
						</h1>
						<p className="text-sm text-muted-foreground">
							Every entry in your ledger, filtered to taste.
						</p>
					</div>
					<Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
						<Button className="gap-2" onClick={openCreateSheet}>
							<Plus className="size-4" />
							Create transaction
						</Button>
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
													isActive &&
														tab.value === "transfer" &&
														"text-foreground",
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
												onValueChange={(value) =>
													void handleCurrencyChange(value)
												}
											>
												<SelectTrigger className="w-[7.5rem] bg-input-bg">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{SUPPORTED_CURRENCIES.map((currency) => (
														<SelectItem
															key={currency.code}
															value={currency.code}
														>
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
										<label className="text-sm font-medium">
											Exchange rate (1 {createForm.currency} → {userCurrency})
										</label>
										<div className="relative">
											<Input
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
									<label className="text-sm font-medium">Description</label>
									<Input
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
											<label className="text-sm font-medium">Category</label>
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
														aria-pressed={
															createForm.categoryId === option.value
														}
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
												data-active={
													createForm.paymentAccountId === option.value
												}
												aria-pressed={
													createForm.paymentAccountId === option.value
												}
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
										<label className="text-sm font-medium">
											Transfer direction
										</label>
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
												<SelectItem value="in">
													Money into this account
												</SelectItem>
												<SelectItem value="out">
													Money out of this account
												</SelectItem>
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
									<label className="text-sm font-medium">Note (optional)</label>
									<textarea
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
												setIsSheetOpen(false);
												setEditingTransactionId(null);
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
										onClick={() => handleSheetOpenChange(false)}
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
				</div>

				<div className="grid gap-4 sm:grid-cols-3">
					<SummaryTile
						label="Total in"
						icon={<TrendingUp className="size-4" aria-hidden="true" />}
						amount={transactionTotals.income}
						currency={userCurrency}
						isPrivacyMode={isPrivacyMode}
						tone="income"
					/>
					<SummaryTile
						label="Total out"
						icon={<TrendingDown className="size-4" aria-hidden="true" />}
						amount={transactionTotals.expense}
						currency={userCurrency}
						isPrivacyMode={isPrivacyMode}
						tone="expense"
					/>
					<SummaryTile
						label="Net"
						icon={<Wallet className="size-4" aria-hidden="true" />}
						amount={netTotal}
						currency={userCurrency}
						isPrivacyMode={isPrivacyMode}
						tone={netTotal < 0 ? "expense" : "income"}
					/>
				</div>

				<div className="flex flex-wrap gap-2">
					{TRANSACTION_TYPE_FILTERS.map((option) => (
						<button
							key={option.value}
							type="button"
							className="md-chip"
							data-active={filters.type === option.value}
							aria-pressed={filters.type === option.value}
							onClick={() => setTransactionType(option.value)}
						>
							{option.label}
						</button>
					))}
				</div>

				{isPending ? (
					<div className="space-y-5">
						<div className="grid gap-4 md:grid-cols-2">
							<Skeleton className="h-64 rounded-panel" />
							<Skeleton className="h-64 rounded-panel" />
						</div>
						<PageContentSkeleton tableColumns={5} />
					</div>
				) : null}
				{isError ? (
					<div className="md-panel p-5">
						<p className="text-sm text-expense">{error.message}</p>
					</div>
				) : null}

				{!isPending && !isError ? (
					<>
						<div className="grid gap-4 xl:grid-cols-2">
							<div className="md-panel p-5">
								<p className="text-sm font-medium text-foreground">
									Flow by type
								</p>
								<div className="mt-3 h-64">
									<ResponsiveContainer width="100%" height="100%">
										<BarChart data={chartData}>
											<CartesianGrid
												strokeDasharray="3 3"
												vertical={false}
												stroke="var(--border)"
											/>
											<XAxis dataKey="name" tickLine={false} axisLine={false} />
											<YAxis
												tickLine={false}
												axisLine={false}
												tickFormatter={(value) =>
													formatSensitiveCompactAmount(
														value,
														userCurrency,
														isPrivacyMode,
													)
												}
											/>
											<Tooltip
												formatter={(value) =>
													formatSensitiveCurrency(
														String(value),
														userCurrency,
														isPrivacyMode,
													)
												}
											/>
											<Bar dataKey="amount" radius={[8, 8, 0, 0]}>
												{chartData.map((entry) => (
													<Cell key={entry.name} fill={entry.color} />
												))}
											</Bar>
										</BarChart>
									</ResponsiveContainer>
								</div>
							</div>
							<div className="md-panel p-5">
								<p className="text-sm font-medium text-foreground">
									Distribution
								</p>
								<div className="mt-3 h-64">
									<ResponsiveContainer width="100%" height="100%">
										<PieChart>
											<Pie
												data={chartData}
												dataKey="amount"
												nameKey="name"
												outerRadius={90}
												label={(entry) => entry.name}
											>
												{chartData.map((entry) => (
													<Cell key={entry.name} fill={entry.color} />
												))}
											</Pie>
											<Tooltip
												formatter={(value) =>
													formatSensitiveCurrency(
														String(value),
														userCurrency,
														isPrivacyMode,
													)
												}
											/>
										</PieChart>
									</ResponsiveContainer>
								</div>
							</div>
						</div>

						<div className="md-panel p-5">
							<DataTable
								columns={transactionColumns}
								data={tableRows}
								filterPlaceholder="Search by title, type, category, or date..."
								emptyMessage="No transactions match this filter."
								showPrivacyToggle
								initialSorting={[{ id: "happenedAt", desc: true }]}
							/>
						</div>
					</>
				) : null}
			</div>
		</main>
	);
}
