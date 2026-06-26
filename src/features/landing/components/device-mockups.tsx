/**
 * CSS/HTML-only device mockups — no image files.
 * A desktop browser frame with a stylized dashboard, and a phone frame that
 * overlaps the chart column on desktop / stacks below on mobile. Transactions
 * sit on the left so their amounts are never hidden by the phone.
 */

const ACCOUNT_CARDS = [
	{
		label: "Checking",
		amount: "$4,821.00",
		last: "•• 4521",
		grad: "from-[#1f6b4a] to-[#15402f]",
	},
	{
		label: "Savings",
		amount: "$12,340.00",
		last: "•• 9910",
		grad: "from-[#4f46e5] to-[#2e2a8c]",
	},
	{
		label: "Credit",
		amount: "-$1,203.00",
		last: "•• 7734",
		grad: "from-[#b0473d] to-[#6f2a24]",
	},
	{
		label: "Invest",
		amount: "$8,900.00",
		last: "•• 0021",
		grad: "from-[#3a9b6f] to-[#1f6b4a]",
	},
] as const;

const TRANSACTIONS = [
	{
		label: "Whole Foods Market",
		cat: "Groceries",
		amount: "-$67.42",
		type: "expense",
	},
	{
		label: "Salary — Acme Corp",
		cat: "Income",
		amount: "+$2,700.00",
		type: "income",
	},
	{
		label: "Netflix",
		cat: "Subscriptions",
		amount: "-$15.99",
		type: "expense",
	},
	{
		label: "Freelance payment",
		cat: "Income",
		amount: "+$350.00",
		type: "income",
	},
	{ label: "Shell Fuel", cat: "Transport", amount: "-$48.10", type: "expense" },
] as const;

const CHART = [
	{ d: "M", h: 52 },
	{ d: "T", h: 78 },
	{ d: "W", h: 40 },
	{ d: "T", h: 66 },
	{ d: "F", h: 92 },
	{ d: "S", h: 34 },
	{ d: "S", h: 70 },
] as const;

export function DeviceMockups() {
	return (
		<div className="relative mx-auto w-full max-w-4xl">
			{/* Desktop browser frame */}
			<div className="relative z-10 w-full overflow-hidden rounded-panel border border-border bg-panel shadow-2xl sm:w-[90%]">
				{/* Browser chrome bar */}
				<div className="flex items-center gap-3 border-b border-border bg-canvas px-4 py-2.5">
					<div className="flex shrink-0 items-center gap-1.5">
						<span className="block size-2.5 rounded-full bg-expense/80" />
						<span className="block size-2.5 rounded-full bg-[#c9952f]/80" />
						<span className="block size-2.5 rounded-full bg-income/80" />
					</div>
					<div className="flex min-w-0 flex-1 justify-center">
						<span className="max-w-[220px] truncate rounded-full border border-border bg-input-bg px-3 py-0.5 text-[11px] text-muted-foreground">
							moneydiary.app/dashboard
						</span>
					</div>
				</div>

				{/* Dashboard content */}
				<div className="space-y-3 p-4">
					{/* Account cards row */}
					<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
						{ACCOUNT_CARDS.map((card) => (
							<div
								key={card.label}
								className={`overflow-hidden rounded-xl bg-gradient-to-br ${card.grad} p-3 text-white shadow`}
							>
								<p className="text-[9px] font-semibold uppercase tracking-wide text-white/70">
									{card.label}
								</p>
								<p className="mt-2 truncate font-num text-sm font-extrabold tracking-tight">
									{card.amount}
								</p>
								<p className="mt-0.5 text-[8px] text-white/60">{card.last}</p>
							</div>
						))}
					</div>

					{/* Body: transactions (left) + stats & chart (right) */}
					<div className="grid grid-cols-5 gap-3">
						{/* Transactions */}
						<div className="col-span-3 overflow-hidden rounded-xl border border-border bg-card">
							<p className="border-b border-border px-3 py-2 text-[10px] font-semibold text-foreground">
								Recent transactions
							</p>
							{TRANSACTIONS.map((row) => (
								<div
									key={row.label}
									className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-[7px] last:border-0"
								>
									<div className="flex min-w-0 items-center gap-2">
										<span
											className={`size-1.5 shrink-0 rounded-full ${row.type === "income" ? "bg-income" : "bg-expense"}`}
										/>
										<div className="min-w-0">
											<p className="truncate text-[10px] font-medium text-foreground">
												{row.label}
											</p>
											<p className="truncate text-[8px] text-muted-foreground">
												{row.cat}
											</p>
										</div>
									</div>
									<span
										className={`shrink-0 font-num text-[10px] font-bold ${row.type === "income" ? "text-income" : "text-expense"}`}
									>
										{row.amount}
									</span>
								</div>
							))}
						</div>

						{/* Stats + chart */}
						<div className="col-span-2 space-y-2">
							<div className="grid grid-cols-2 gap-2">
								<div className="rounded-lg border border-border bg-card p-2">
									<p className="text-[8px] text-muted-foreground">Income</p>
									<p className="font-num text-[11px] font-bold text-income">
										+$5,400
									</p>
								</div>
								<div className="rounded-lg border border-border bg-card p-2">
									<p className="text-[8px] text-muted-foreground">Expenses</p>
									<p className="font-num text-[11px] font-bold text-expense">
										-$2,138
									</p>
								</div>
							</div>
							<div className="rounded-lg border border-border bg-card p-2.5">
								<p className="mb-2 text-[9px] font-medium text-muted-foreground">
									Spending this week
								</p>
								<div className="flex h-14 items-end gap-1.5">
									{CHART.map((bar, i) => (
										<div
											// biome-ignore lint/suspicious/noArrayIndexKey: static demo bars
											key={i}
											className="min-h-[2px] flex-1 rounded-t-[3px] bg-gradient-to-t from-primary/50 to-primary"
											style={{ height: `${bar.h}%` }}
										/>
									))}
								</div>
								<div className="mt-1 flex justify-between">
									{CHART.map((bar, i) => (
										<span
											// biome-ignore lint/suspicious/noArrayIndexKey: static demo labels
											key={i}
											className="flex-1 text-center text-[7px] text-muted-foreground"
										>
											{bar.d}
										</span>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Phone frame — overlaps the chart column on desktop, stacks below on mobile */}
			<div className="relative z-20 mx-auto mt-5 w-[210px] sm:absolute sm:-bottom-10 sm:-right-2 sm:mt-0 sm:w-[180px] lg:-right-8 lg:w-[208px]">
				<div className="overflow-hidden rounded-[2.2rem] border-[5px] border-border bg-panel shadow-2xl ring-1 ring-black/10">
					{/* Notch */}
					<div className="relative flex justify-center bg-canvas pb-1 pt-2">
						<div className="h-1.5 w-12 rounded-full bg-border" />
					</div>

					{/* Phone dashboard */}
					<div className="space-y-2 px-2.5 pb-3 pt-1">
						<div className="overflow-hidden rounded-xl bg-gradient-to-br from-[#1f6b4a] to-[#15402f] p-3 text-white shadow">
							<p className="text-[8px] font-semibold uppercase tracking-wide text-white/70">
								Total balance
							</p>
							<p className="mt-1.5 font-num text-lg font-extrabold tracking-tight">
								$24,858
							</p>
							<p className="mt-0.5 text-[8px] text-white/70">
								↑ 12% vs last month
							</p>
						</div>

						<div className="grid grid-cols-2 gap-1.5">
							<div className="rounded-lg border border-border bg-card p-1.5">
								<p className="text-[7px] text-muted-foreground">Income</p>
								<p className="font-num text-[10px] font-bold text-income">
									+$5.4k
								</p>
							</div>
							<div className="rounded-lg border border-border bg-card p-1.5">
								<p className="text-[7px] text-muted-foreground">Expenses</p>
								<p className="font-num text-[10px] font-bold text-expense">
									-$2.1k
								</p>
							</div>
						</div>

						<div className="overflow-hidden rounded-lg border border-border bg-card">
							{TRANSACTIONS.slice(0, 3).map((row) => (
								<div
									key={row.label}
									className="flex items-center justify-between gap-1 border-b border-border/50 px-2 py-1.5 last:border-0"
								>
									<p className="truncate text-[8px] font-medium text-foreground">
										{row.cat}
									</p>
									<span
										className={`shrink-0 font-num text-[8px] font-bold ${row.type === "income" ? "text-income" : "text-expense"}`}
									>
										{row.amount}
									</span>
								</div>
							))}
						</div>
					</div>

					{/* Home indicator */}
					<div className="flex justify-center pb-2 pt-0.5">
						<div className="h-1 w-10 rounded-full bg-border" />
					</div>
				</div>
			</div>
		</div>
	);
}
