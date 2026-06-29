import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	DataTable,
	DataTableColumnHeader,
} from "#/components/data-table/data-table";
import {
	PageContentSkeleton,
	PageEmptyState,
	PageErrorState,
} from "#/components/feedback/page-state";
import { TableRowActions } from "#/components/feedback/table-row-actions";
import { SearchableSelect } from "#/components/forms/searchable-select";
import { SensitiveAmount } from "#/components/privacy/sensitive-amount";
import { Button } from "#/components/ui/button";
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
	getInstitutionName,
	PAYMENT_INSTITUTIONS,
} from "#/features/payment-accounts/constants/institutions";
import {
	useCreatePaymentAccountMutation,
	useDeletePaymentAccountMutation,
	usePaymentAccountsQuery,
	useUpdatePaymentAccountMutation,
} from "#/features/payment-accounts/hooks/use-payment-accounts";
import type {
	PaymentAccountDto,
	PaymentAccountType,
} from "#/features/payment-accounts/types/payment-account";
import {
	ACCOUNT_TYPE_OPTIONS,
	type AccountFormState,
	getDefaultAccountForm,
} from "#/features/payment-accounts/utils/account-form";
import {
	formatPaymentAccountLabel,
	formatPaymentAccountType,
} from "#/features/payment-accounts/utils/account-label";
import { getInstitutionGradient } from "#/features/payment-accounts/constants/institution-theme";
import { buildPaymentAccountBalances } from "#/features/payment-accounts/utils/payment-account-balance";
import { canDeletePaymentAccount } from "#/features/payment-accounts/utils/protected-account";
import { useSavingsQuery } from "#/features/savings/hooks/use-savings";
import { useTransactionsQuery } from "#/features/transactions/hooks/use-transactions";
import { cn } from "#/lib/utils";

/** Cards & accounts page: table and create/edit sheet. */
export function PaymentAccountsPageContent({
	userCurrency,
}: {
	userCurrency: string;
}) {
	const {
		data: accounts = [],
		isPending,
		isError,
		error,
	} = usePaymentAccountsQuery();
	const { data: transactions = [] } = useTransactionsQuery();
	const { data: savings = [] } = useSavingsQuery();
	const createAccountMutation = useCreatePaymentAccountMutation();
	const updateAccountMutation = useUpdatePaymentAccountMutation();
	const deleteAccountMutation = useDeletePaymentAccountMutation();
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [editingAccountId, setEditingAccountId] = useState<number | null>(null);
	const [form, setForm] = useState<AccountFormState>(getDefaultAccountForm());

	const isEditing = editingAccountId !== null;
	const isSaving =
		createAccountMutation.isPending || updateAccountMutation.isPending;

	const accountBalances = useMemo(
		() =>
			buildPaymentAccountBalances({
				accountIds: accounts.map((account) => account.id),
				transactions: transactions.map((transaction) => ({
					amount: transaction.amount,
					type: transaction.type,
					paymentAccountId: transaction.paymentAccountId,
					source: transaction.source,
				})),
				savings: savings.map((saving) => ({
					amount: saving.amount,
					paymentAccountId: saving.paymentAccountId,
				})),
			}),
		[accounts, transactions, savings],
	);

	const institutionOptions = useMemo(
		() => [
			{ value: "custom", label: "Custom name" },
			...PAYMENT_INSTITUTIONS.map((institution) => ({
				value: institution.slug,
				label: institution.name,
			})),
		],
		[],
	);

	const accountTypeOptions = useMemo(
		() =>
			ACCOUNT_TYPE_OPTIONS.map((option) => ({
				value: option.value,
				label: option.label,
			})),
		[],
	);

	const handleDeleteAccount = useCallback(
		async (id: number, accountName: string) => {
			await toast.promise(deleteAccountMutation.mutateAsync(id), {
				loading: "Deleting account...",
				success: `Deleted ${accountName}`,
				error: (message) =>
					message instanceof Error
						? message.message
						: "Unable to delete account",
			});
		},
		[deleteAccountMutation],
	);

	const openCreateSheet = useCallback(() => {
		setEditingAccountId(null);
		setForm(getDefaultAccountForm());
		setIsSheetOpen(true);
	}, []);

	const openEditAccount = useCallback((account: PaymentAccountDto) => {
		setEditingAccountId(account.id);
		setForm({
			institutionChoice: account.institutionSlug ?? "custom",
			name: account.name,
			accountType: account.accountType,
			note: account.note ?? "",
			isActive: account.isActive,
		});
		setIsSheetOpen(true);
	}, []);

	function handleSheetOpenChange(open: boolean) {
		setIsSheetOpen(open);
		if (!open) {
			setEditingAccountId(null);
			setForm(getDefaultAccountForm());
		}
	}

	function handleInstitutionChange(value: string) {
		const institution = PAYMENT_INSTITUTIONS.find(
			(entry) => entry.slug === value,
		);
		setForm((state) => {
			const next: AccountFormState = {
				...state,
				institutionChoice: value,
				name:
					value === "custom" ? state.name : (institution?.name ?? state.name),
			};

			if (
				value === "jazzcash" ||
				value === "easypaisa" ||
				value === "sadapay" ||
				value === "nayapay"
			) {
				next.accountType = "wallet";
			} else if (value === "cash") {
				next.accountType = "cash";
			}

			return next;
		});
	}

	async function handleSaveAccount(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!form.name.trim()) {
			toast.error("Account name is required");
			return;
		}

		const payload = {
			name: form.name.trim(),
			institutionSlug:
				form.institutionChoice === "custom" ? null : form.institutionChoice,
			accountType: form.accountType,
			note: form.note.trim() || null,
		};

		if (isEditing && editingAccountId) {
			await toast.promise(
				updateAccountMutation.mutateAsync({
					id: editingAccountId,
					input: { ...payload, isActive: form.isActive },
				}),
				{
					loading: "Updating account...",
					success: "Account updated",
					error: (message) =>
						message instanceof Error
							? message.message
							: "Unable to update account",
				},
			);
		} else {
			await toast.promise(createAccountMutation.mutateAsync(payload), {
				loading: "Adding account...",
				success: "Account added",
				error: (message) =>
					message instanceof Error ? message.message : "Unable to add account",
			});
		}

		setEditingAccountId(null);
		setForm(getDefaultAccountForm());
		setIsSheetOpen(false);
	}

	const accountColumns = useMemo<ColumnDef<PaymentAccountDto>[]>(
		() => [
			{
				accessorKey: "name",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Account" />
				),
				cell: ({ row }) => (
					<span className="font-medium">
						{formatPaymentAccountLabel(row.original)}
					</span>
				),
			},
			{
				accessorKey: "accountType",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Type" />
				),
				cell: ({ row }) => formatPaymentAccountType(row.original.accountType),
			},
			{
				id: "institution",
				accessorFn: (row) =>
					getInstitutionName(row.institutionSlug) ?? "Custom",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Provider" />
				),
			},
			{
				id: "balance",
				accessorFn: (row) => accountBalances[row.id] ?? 0,
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Balance" />
				),
				cell: ({ row }) => {
					if (row.original.institutionSlug !== "cash") {
						return "—";
					}

					return (
						<SensitiveAmount
							amount={String(accountBalances[row.original.id] ?? 0)}
							currency={userCurrency}
							className="font-medium"
						/>
					);
				},
			},
			{
				accessorKey: "isActive",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Status" />
				),
				cell: ({ row }) => (row.original.isActive ? "Active" : "Inactive"),
			},
			{
				id: "actions",
				enableSorting: false,
				enableGlobalFilter: false,
				header: () => <div className="text-right">Actions</div>,
				meta: { cellClassName: "w-[6.5rem]" },
				cell: ({ row }) => (
					<TableRowActions
						label={row.original.name}
						onEdit={() => openEditAccount(row.original)}
						onDelete={() =>
							void handleDeleteAccount(row.original.id, row.original.name)
						}
						isDeletePending={deleteAccountMutation.isPending}
						canDelete={canDeletePaymentAccount(row.original)}
					/>
				),
			},
		],
		[
			accountBalances,
			deleteAccountMutation.isPending,
			handleDeleteAccount,
			openEditAccount,
			userCurrency,
		],
	);

	return (
		<main className="p-4 sm:p-6 md:p-8">
			<section className="md-panel p-5 md:p-6">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
							Cards &amp; accounts
						</h1>
						<p className="mt-2 max-w-2xl text-sm text-muted-foreground">
							Bank cards, wallets, and cash accounts you can link on
							transactions and savings. Cash on hand balance updates from linked
							income, expenses, transfers, and savings.
						</p>
					</div>
					<Button
						className="gap-2 bg-primary text-primary-foreground"
						onClick={openCreateSheet}
					>
						<Plus className="size-4" />
						Add account
					</Button>
				</div>

				{!isPending && !isError && accounts.length ? (
					<div className="mt-5 flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3 xl:grid-cols-4">
						{accounts.map((account, index) => (
							<div
								key={account.id}
								className={cn(
									"relative min-w-[14rem] shrink-0 overflow-hidden rounded-panel bg-gradient-to-br p-5 text-left text-white shadow-lg sm:min-w-0",
									getInstitutionGradient(account.institutionSlug, index),
									account.isActive ? "" : "opacity-60",
								)}
							>
								<div className="flex items-center justify-between gap-1 text-xs font-medium uppercase tracking-wide text-white/70">
									<span className="min-w-0 truncate">
										{formatPaymentAccountLabel(account)}
									</span>
									<span className="shrink-0 truncate">
										{getInstitutionName(account.institutionSlug) ?? "Custom"}
									</span>
								</div>
								{account.institutionSlug === "cash" ? (
									<SensitiveAmount
										amount={String(accountBalances[account.id] ?? 0)}
										currency={userCurrency}
										className="mt-6 block font-num text-2xl font-extrabold tracking-tight tabular-nums"
									/>
								) : (
									<p className="mt-6 font-num text-2xl font-extrabold tracking-tight tabular-nums">
										{formatPaymentAccountType(account.accountType)}
									</p>
								)}
								<p className="mt-1 text-xs capitalize text-white/60">
									{account.isActive ? "Active" : "Inactive"}
								</p>
							</div>
						))}
					</div>
				) : null}

				{isPending ? (
					<div className="mt-5">
						<PageContentSkeleton tableColumns={4} />
					</div>
				) : null}
				{isError ? (
					<div className="mt-5">
						<PageErrorState message={error.message} />
					</div>
				) : null}

				{!isPending && !isError ? (
					accounts.length ? (
						<div className="mt-5">
							<DataTable
								columns={accountColumns}
								data={accounts}
								filterPlaceholder="Filter accounts..."
								emptyMessage="No accounts added yet."
								fillWidth
							/>
						</div>
					) : (
						<div className="mt-5">
							<PageEmptyState message="No accounts yet. Add one to track where money moves." />
						</div>
					)
				) : null}

				<Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
					<SheetContent className="w-full sm:max-w-md">
						<SheetHeader>
							<SheetTitle>
								{isEditing ? "Edit account" : "Add account"}
							</SheetTitle>
							<SheetDescription>
								{isEditing
									? "Update card or account details."
									: "Pick a bank or wallet, or use a custom name."}
							</SheetDescription>
						</SheetHeader>
						<form className="grid gap-4 px-4" onSubmit={handleSaveAccount}>
							<div className="grid gap-2">
								<label className="text-sm font-medium">Bank / provider</label>
								<SearchableSelect
									value={form.institutionChoice}
									onValueChange={handleInstitutionChange}
									options={institutionOptions}
									placeholder="Select provider"
									searchPlaceholder="Search banks and wallets..."
									emptyMessage="No providers found."
								/>
							</div>
							<div className="grid gap-2">
								<label className="text-sm font-medium">Display name</label>
								<Input
									value={form.name}
									onChange={(event) =>
										setForm((state) => ({ ...state, name: event.target.value }))
									}
									placeholder="e.g. HBL Salary"
								/>
							</div>
							<div className="grid gap-2">
								<label className="text-sm font-medium">Type</label>
								<SearchableSelect
									value={form.accountType}
									onValueChange={(value) =>
										setForm((state) => ({
											...state,
											accountType: value as PaymentAccountType,
										}))
									}
									options={accountTypeOptions}
									placeholder="Select account type"
									searchPlaceholder="Search account types..."
									emptyMessage="No account types found."
								/>
							</div>
							{isEditing ? (
								<div className="grid gap-2">
									<label className="text-sm font-medium">Status</label>
									<Select
										value={form.isActive ? "active" : "inactive"}
										onValueChange={(value) =>
											setForm((state) => ({
												...state,
												isActive: value === "active",
											}))
										}
									>
										<SelectTrigger className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="active">Active</SelectItem>
											<SelectItem value="inactive">Inactive</SelectItem>
										</SelectContent>
									</Select>
								</div>
							) : null}
							<div className="grid gap-2">
								<label className="text-sm font-medium">Note (optional)</label>
								<Input
									value={form.note}
									onChange={(event) =>
										setForm((state) => ({ ...state, note: event.target.value }))
									}
									placeholder="Any extra detail"
								/>
							</div>
							<SheetFooter className="px-0">
								<Button type="submit" disabled={isSaving} className="w-full">
									{isSaving
										? "Saving..."
										: isEditing
											? "Save changes"
											: "Add account"}
								</Button>
							</SheetFooter>
						</form>
					</SheetContent>
				</Sheet>
			</section>
		</main>
	);
}
