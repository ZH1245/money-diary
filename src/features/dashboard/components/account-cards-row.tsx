import { SensitiveText } from "#/components/privacy/sensitive-text";
import type { PaymentAccountDto } from "#/features/payment-accounts/types/payment-account";
import { formatSensitiveCurrency } from "#/lib/privacy/sensitive-format";
import { cn } from "#/lib/utils";

/** Gradient stops per palette card slot — matches the redesign spec mock. */
const CARD_GRADIENTS = [
	"from-[#1f6b4a] to-[#15402f]",
	"from-[#4f46e5] to-[#2e2a8c]",
	"from-[#b0473d] to-[#6f2a24]",
	"from-[#3a9b6f] to-[#1f6b4a]",
	"from-[#6c63ff] to-[#3a3499]",
] as const;

interface AccountCardsRowProps {
	accounts: PaymentAccountDto[];
	balances: Record<number, number>;
	selectedAccountId: number | null;
	onSelect: (accountId: number | null) => void;
	currency: string;
	isPrivacyMode: boolean;
}

/**
 * Selectable gradient cards built from payment accounts. Tapping a card filters
 * the dashboard to that account; tapping the active card clears the filter.
 */
export function AccountCardsRow({
	accounts,
	balances,
	selectedAccountId,
	onSelect,
	currency,
	isPrivacyMode,
}: AccountCardsRowProps) {
	if (accounts.length === 0) return null;

	return (
		<div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
			{accounts.map((account, index) => {
				const isActive = account.id === selectedAccountId;
				const balance = balances[account.id] ?? 0;

				return (
					<button
						key={account.id}
						type="button"
						onClick={() => onSelect(isActive ? null : account.id)}
						aria-pressed={isActive}
						className={cn(
							"relative min-w-[15rem] shrink-0 snap-start overflow-hidden rounded-panel bg-gradient-to-br p-5 text-left text-white shadow-lg transition sm:min-w-0",
							CARD_GRADIENTS[index % CARD_GRADIENTS.length],
							isActive
								? "ring-2 ring-primary ring-offset-2 ring-offset-canvas"
								: "opacity-95 hover:opacity-100",
						)}
					>
						<div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-white/70">
							<SensitiveText text={account.name} className="truncate" />
							<span>
								{account.lastFour
									? `•• ${account.lastFour}`
									: account.accountType}
							</span>
						</div>
						<p className="mt-6 block truncate font-num text-xl font-extrabold tracking-tight tabular-nums">
							{isPrivacyMode ? (
								<SensitiveText
									text={formatSensitiveCurrency(balance, currency, true)}
								/>
							) : (
								formatSensitiveCurrency(balance, currency, false)
							)}
						</p>
						<p className="mt-1 text-xs text-white/60 capitalize">
							{account.accountType}
						</p>
					</button>
				);
			})}
		</div>
	);
}
