import { useStore } from "@tanstack/react-store";
import type { ColumnDef } from "@tanstack/react-table";
import {
	ArrowDownLeft,
	ArrowLeftRight,
	ArrowUpRight,
	Plus,
	Trash2,
	TrendingDown,
	TrendingUp,
	Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
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
import { Skeleton } from "#/components/ui/skeleton";
import { useCategoriesQuery } from "#/features/categories/hooks/use-categories";
import { dashboardDateRangeStore } from "#/features/dashboard/store/dashboard-date-range-store";
import { isDateInRange } from "#/features/dashboard/utils/dashboard-date-range";
import { usePaymentAccountsQuery } from "#/features/payment-accounts/hooks/use-payment-accounts";
import { TransactionFormSheet } from "#/features/transactions/components/transaction-form-sheet";
import { TransactionTableFilters } from "#/features/transactions/components/transaction-table-filters";
import {
	useDeleteTransactionMutation,
	useTransactionsQuery,
} from "#/features/transactions/hooks/use-transactions";
import { openQuickAddTransaction } from "#/features/transactions/store/quick-add-transaction-store";
import {
	setTransactionType,
	transactionFiltersStore,
} from "#/features/transactions/store/transaction-filters-store";
import type { TransactionTableRow } from "#/features/transactions/utils/transaction-display";
import {
	buildTransactionChartData,
	buildTransactionTableRows,
	buildTransactionTotals,
	filterTransactionTableRows,
} from "#/features/transactions/utils/transaction-display";
import {
	TRANSFER_SOURCE_IN,
	TRANSFER_SOURCE_OUT,
} from "#/features/transactions/utils/transfer-direction";
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

const TRANSACTION_TABLE_COLUMN = {
	transaction: {
		headerClassName: "min-w-[9.5rem] w-[38%] max-w-[14rem]",
		cellClassName: "min-w-[9.5rem] w-[38%] max-w-[14rem]",
	},
	category: {
		headerClassName: "hidden lg:table-cell w-[8.5rem] max-w-[8.5rem]",
		cellClassName: "hidden lg:table-cell w-[8.5rem] max-w-[8.5rem]",
	},
	date: {
		headerClassName: "hidden md:table-cell w-[7.25rem] max-w-[7.25rem]",
		cellClassName: "hidden md:table-cell w-[7.25rem] max-w-[7.25rem]",
	},
	account: {
		headerClassName: "hidden lg:table-cell w-[9rem] max-w-[9rem]",
		cellClassName: "hidden lg:table-cell w-[9rem] max-w-[9rem]",
	},
	amount: {
		headerClassName: "w-[6.5rem] max-w-[6.5rem] text-right sm:w-[7rem] sm:max-w-[7rem]",
		cellClassName: "w-[6.5rem] max-w-[6.5rem] text-right sm:w-[7rem] sm:max-w-[7rem]",
	},
	actions: {
		headerClassName: "w-[5.5rem] max-w-[5.5rem] text-right sm:w-[6.5rem] sm:max-w-[6.5rem]",
		cellClassName: "w-[5.5rem] max-w-[5.5rem] sm:w-[6.5rem] sm:max-w-[6.5rem]",
	},
} as const;

const TRANSACTION_TABLE_SECONDARY_TEXT =
	"text-sm text-foreground/78 dark:text-foreground/90";
const TRANSACTION_TABLE_NOTE_TEXT =
	"text-xs text-foreground/70 dark:text-foreground/85";

const TRANSACTION_TYPE_FILTERS: {
	value: "all" | TransactionFlowType;
	label: string;
}[] = [
	{ value: "all", label: "All" },
	{ value: "income", label: "Income" },
	{ value: "expense", label: "Spending" },
	{ value: "transfer", label: "Transfers" },
];

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
				<span
					className={cn(
						"block truncate md:hidden",
						TRANSACTION_TABLE_NOTE_TEXT,
					)}
				>
					{row.happenedAtLabel}
				</span>
				{row.note ? (
					<SensitiveText
						text={row.note}
						className={cn("block truncate", TRANSACTION_TABLE_NOTE_TEXT)}
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
	source,
}: {
	amount: string;
	currency: string;
	type: TransactionFlowType;
	source: string;
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

	const transferSign =
		source === TRANSFER_SOURCE_IN
			? "+"
			: source === TRANSFER_SOURCE_OUT
				? "−"
				: "";
	const sign =
		type === "income" ? "+" : type === "expense" ? "−" : transferSign;
	const isNegativeAmount =
		type === "expense" ||
		(type === "transfer" && source === TRANSFER_SOURCE_OUT);
	const tone = isNegativeAmount
		? "text-expense"
		: type === "income" ||
				(type === "transfer" && source === TRANSFER_SOURCE_IN)
			? "text-income"
			: "text-foreground/78 dark:text-foreground/90";

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
	const deleteTransactionMutation = useDeleteTransactionMutation();
	const filters = useStore(transactionFiltersStore, (state) => state);
	const dateRange = useStore(dashboardDateRangeStore, (state) => state);
	const [editingRow, setEditingRow] = useState<TransactionTableRow | null>(
		null,
	);

	const isPrivacyMode = usePrivacyModeEnabled();

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
	const filteredTableRows = useMemo(
		() =>
			filterTransactionTableRows(tableRows, {
				categoryId: filters.categoryId,
				accountId: filters.accountId,
				dateFrom: filters.dateFrom,
				dateTo: filters.dateTo,
			}),
		[
			tableRows,
			filters.categoryId,
			filters.accountId,
			filters.dateFrom,
			filters.dateTo,
		],
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

	const handleBulkDelete = useCallback(
		async (rows: TransactionTableRow[], clearSelection: () => void) => {
			if (!rows.length) {
				return;
			}

			if (
				!window.confirm(
					`Delete ${rows.length} transaction${rows.length === 1 ? "" : "s"}?`,
				)
			) {
				return;
			}

			await toast.promise(
				Promise.all(
					rows.map((row) => deleteTransactionMutation.mutateAsync(row.id)),
				),
				{
					loading: `Deleting ${rows.length} transaction${rows.length === 1 ? "" : "s"}...`,
					success: `Deleted ${rows.length} transaction${rows.length === 1 ? "" : "s"}`,
					error: (message) =>
						message instanceof Error
							? message.message
							: "Unable to delete transactions",
				},
			);
			clearSelection();
		},
		[deleteTransactionMutation],
	);

	const openEditSheet = useCallback((row: TransactionTableRow) => {
		setEditingRow(row);
	}, []);

	const transactionColumns = useMemo<ColumnDef<TransactionTableRow>[]>(
		() => [
			{
				accessorKey: "title",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Transaction" />
				),
				cell: ({ row }) => <TransactionNameCell row={row.original} />,
				meta: TRANSACTION_TABLE_COLUMN.transaction,
			},
			{
				id: "category",
				accessorFn: (row) => row.categoryLabel,
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title="Category"
						className="max-w-full justify-start"
					/>
				),
				cell: ({ row }) => {
					if (
						row.original.type === "income" ||
						row.original.categoryId == null
					) {
						return (
							<span className={TRANSACTION_TABLE_SECONDARY_TEXT}>—</span>
						);
					}
					return (
						<span className="inline-flex max-w-full truncate rounded-full border border-border/70 bg-soft-accent px-2.5 py-0.5 text-xs font-semibold text-foreground/85 dark:text-foreground/92">
							<SensitiveText
								text={row.original.categoryLabel}
								className="truncate"
							/>
						</span>
					);
				},
				meta: TRANSACTION_TABLE_COLUMN.category,
			},
			{
				accessorKey: "happenedAt",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Date" />
				),
				cell: ({ row }) => (
					<span className={TRANSACTION_TABLE_SECONDARY_TEXT}>
						{row.original.happenedAtLabel}
					</span>
				),
				sortingFn: (first, second) =>
					new Date(first.original.happenedAt).getTime() -
					new Date(second.original.happenedAt).getTime(),
				meta: TRANSACTION_TABLE_COLUMN.date,
			},
			{
				id: "account",
				accessorFn: (row) => row.accountLabel,
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Account" />
				),
				cell: ({ row }) => (
					<span
						className={cn(
							TRANSACTION_TABLE_SECONDARY_TEXT,
							"block truncate",
						)}
					>
						{row.original.transferRouteLabel ||
							row.original.accountLabel ||
							"—"}
					</span>
				),
				meta: TRANSACTION_TABLE_COLUMN.account,
			},
			{
				id: "amount",
				accessorFn: (row) => Number(row.amount),
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title="Amount"
						className="ml-auto justify-end"
					/>
				),
				cell: ({ row }) => (
					<TransactionAmountCell
						amount={row.original.amount}
						currency={userCurrency}
						type={row.original.type}
						source={row.original.source}
					/>
				),
				meta: TRANSACTION_TABLE_COLUMN.amount,
			},
			{
				id: "actions",
				enableSorting: false,
				enableGlobalFilter: false,
				header: () => <div className="text-right">Actions</div>,
				meta: TRANSACTION_TABLE_COLUMN.actions,
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
					<Button className="gap-2" onClick={() => openQuickAddTransaction()}>
						<Plus className="size-4" />
						Create transaction
					</Button>
				</div>

				<TransactionFormSheet
					key={editingRow?.id ?? "new"}
					open={editingRow !== null}
					onOpenChange={(open) => {
						if (!open) setEditingRow(null);
					}}
					editingRow={editingRow}
					userCurrency={userCurrency}
				/>

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
							<TransactionTableFilters
								categories={categories}
								paymentAccounts={paymentAccounts}
							>
								{({ toolbarStart, belowToolbar }) => (
									<DataTable
										columns={transactionColumns}
										data={filteredTableRows}
										filterPlaceholder="Search transactions..."
										emptyMessage="No transactions match this filter."
										showPrivacyToggle
										initialSorting={[{ id: "happenedAt", desc: true }]}
										toolbarStart={toolbarStart}
										belowToolbar={belowToolbar}
										enableRowSelection
										getRowId={(row) => String(row.id)}
										bulkActions={({ selectedRows, clearSelection }) =>
											selectedRows.length > 0 ? (
												<Button
													type="button"
													variant="destructive"
													size="sm"
													className="h-8 shrink-0 gap-1.5"
													disabled={deleteTransactionMutation.isPending}
													onClick={() =>
														void handleBulkDelete(selectedRows, clearSelection)
													}
												>
													<Trash2 className="size-3.5" aria-hidden="true" />
													<span className="hidden sm:inline">Delete</span>{' '}
													{selectedRows.length}
												</Button>
											) : null
										}
									/>
								)}
							</TransactionTableFilters>
						</div>
					</>
				) : null}
			</div>
		</main>
	);
}
