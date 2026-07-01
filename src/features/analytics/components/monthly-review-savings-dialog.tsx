import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { PaymentAccountSelect } from "#/features/payment-accounts/components/payment-account-select";
import type { PaymentAccountDto } from "#/features/payment-accounts/types/payment-account";
import type { MonthlyReviewAccountBalance } from "#/features/analytics/utils/monthly-review";
import { useCreateSavingMutation } from "#/features/savings/hooks/use-savings";
import { toIsoDateAtNoon } from "#/lib/date-input";
import {
	formatSensitiveCurrency,
	formatSensitiveCompactAmount,
	usePrivacyModeEnabled,
} from "#/lib/privacy/sensitive-format";
import { endOfMonth, format, parseISO } from "date-fns";

export interface MonthlyReviewSavingsPreset {
	accountId: number | null;
	amount: number;
}

interface MonthlyReviewSavingsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	preset: MonthlyReviewSavingsPreset | null;
	monthKey: string;
	monthLabel: string;
	userCurrency: string;
	paymentAccounts: PaymentAccountDto[];
	accountBalances: MonthlyReviewAccountBalance[];
	unallocatedCashFlow: number;
}

function monthEndIso(monthKey: string): string {
	const monthStart = parseISO(`${monthKey}-01`);
	return toIsoDateAtNoon(format(endOfMonth(monthStart), "yyyy-MM-dd"));
}

function parseAmountInput(value: string): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Dialog to log a savings deposit from monthly review with account and amount choice.
 */
export function MonthlyReviewSavingsDialog({
	open,
	onOpenChange,
	preset,
	monthKey,
	monthLabel,
	userCurrency,
	paymentAccounts,
	accountBalances,
	unallocatedCashFlow,
}: MonthlyReviewSavingsDialogProps) {
	const currency = userCurrency.toUpperCase();
	const isPrivacyMode = usePrivacyModeEnabled();
	const createSavingMutation = useCreateSavingMutation();

	const [paymentAccountId, setPaymentAccountId] = useState("none");
	const [amount, setAmount] = useState("");

	const selectedAccountBalance = useMemo(() => {
		if (paymentAccountId === "none") {
			return null;
		}

		const accountId = Number(paymentAccountId);
		return (
			accountBalances.find((row) => row.accountId === accountId)?.balance ?? 0
		);
	}, [paymentAccountId, accountBalances]);

	const maxAmount =
		selectedAccountBalance != null ? Math.max(0, selectedAccountBalance) : null;

	useEffect(() => {
		if (!open || !preset) {
			return;
		}

		setPaymentAccountId(preset.accountId ? String(preset.accountId) : "none");
		setAmount(preset.amount > 0 ? preset.amount.toFixed(2) : "");
	}, [open, preset]);

	function handleUseFullAccountBalance() {
		if (maxAmount == null || maxAmount <= 0) {
			return;
		}

		setAmount(maxAmount.toFixed(2));
	}

	function handleUseUnallocated() {
		if (unallocatedCashFlow <= 0) {
			return;
		}

		setAmount(unallocatedCashFlow.toFixed(2));
	}

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();

		const parsedAmount = parseAmountInput(amount);
		if (parsedAmount <= 0) {
			toast.error("Enter an amount greater than zero");
			return;
		}

		if (maxAmount != null && parsedAmount > maxAmount + 0.0001) {
			toast.error("Amount exceeds this account's balance at month end");
			return;
		}

		const linkedAccountId =
			paymentAccountId === "none" ? null : Number(paymentAccountId);

		const promise = createSavingMutation.mutateAsync({
			title: `${monthLabel} savings`,
			amount: parsedAmount.toFixed(2),
			entryType: "deposit",
			savedAt: monthEndIso(monthKey),
			paymentAccountId: linkedAccountId,
			note: linkedAccountId
				? "Logged from monthly review (account transfer)"
				: "Logged from monthly review",
		});

		await toast.promise(promise, {
			loading: "Saving deposit…",
			success: () => {
				onOpenChange(false);
				return "Savings deposit recorded";
			},
			error: (err) =>
				err instanceof Error ? err.message : "Could not save deposit",
		});
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Log savings deposit</DialogTitle>
					<DialogDescription>
						Choose how much to move into savings for {monthLabel}. Pick an
						account to save from a specific balance, or leave account unset for
						a general deposit.
					</DialogDescription>
				</DialogHeader>

				<form className="grid gap-4" onSubmit={handleSubmit}>
					<PaymentAccountSelect
						value={paymentAccountId}
						onValueChange={setPaymentAccountId}
						accounts={paymentAccounts}
						label="Saved from (optional)"
						showManageLink={false}
					/>

					{maxAmount != null ? (
						<p className="text-xs text-muted-foreground">
							Up to{" "}
							{formatSensitiveCurrency(maxAmount, currency, isPrivacyMode)}{" "}
							available in this account at month end.
						</p>
					) : (
						<p className="text-xs text-muted-foreground">
							Unallocated cash flow this month:{" "}
							{formatSensitiveCurrency(
								unallocatedCashFlow,
								currency,
								isPrivacyMode,
							)}
							. Account balances are shown separately above.
						</p>
					)}

					<div className="grid gap-2">
						<label htmlFor="review-savings-amount" className="text-sm font-medium">
							Amount ({currency})
						</label>
						<Input
							id="review-savings-amount"
							type="number"
							min="0"
							step="0.01"
							value={amount}
							onChange={(event) => setAmount(event.target.value)}
							placeholder="0.00"
							required
						/>
						<div className="flex flex-wrap gap-2">
							{maxAmount != null && maxAmount > 0 ? (
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleUseFullAccountBalance}
								>
									Use full account balance
								</Button>
							) : null}
							{unallocatedCashFlow > 0 ? (
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleUseUnallocated}
								>
									Use unallocated (
									{formatSensitiveCompactAmount(
										unallocatedCashFlow,
										currency,
										isPrivacyMode,
									)}
									)
								</Button>
							) : null}
						</div>
					</div>

					<DialogFooter className="gap-2 sm:gap-0">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={createSavingMutation.isPending}>
							{createSavingMutation.isPending ? "Saving…" : "Log deposit"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
