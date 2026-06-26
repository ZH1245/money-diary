/**
 * CSS/HTML-only device mockups — no image files.
 * Shows a desktop browser frame with a stylized dashboard, and a phone
 * frame overlapping it on desktop / stacking below it on mobile.
 */
export function DeviceMockups() {
	return (
		<div className="relative mx-auto w-full max-w-4xl px-4">
			{/* Desktop browser frame */}
			<div className="relative z-10 w-full overflow-hidden rounded-panel border border-border bg-panel shadow-lg">
				{/* Browser chrome bar */}
				<div className="flex items-center gap-3 border-b border-border bg-canvas px-4 py-2.5">
					{/* Traffic lights */}
					<div className="flex shrink-0 items-center gap-1.5">
						<span className="block size-2.5 rounded-full bg-expense/70" />
						<span className="block size-2.5 rounded-full bg-[#c9952f]/70" />
						<span className="block size-2.5 rounded-full bg-income/70" />
					</div>
					{/* URL bar */}
					<div className="flex min-w-0 flex-1 justify-center">
						<span className="max-w-[200px] truncate rounded-full border border-border bg-input-bg px-3 py-0.5 text-[11px] text-muted-foreground">
							moneydiary.app/dashboard
						</span>
					</div>
				</div>

				{/* Dashboard content */}
				<div className="p-4">
					{/* Account cards row */}
					<div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
						<div className="col-span-1 overflow-hidden rounded-panel bg-gradient-to-br from-[#1f6b4a] to-[#15402f] p-3 text-white shadow">
							<p className="text-[9px] font-medium uppercase tracking-wide text-white/70">
								Checking
							</p>
							<p className="mt-2 font-num text-sm font-bold">$4,821.00</p>
							<p className="mt-0.5 text-[8px] text-white/60">•• 4521</p>
						</div>
						<div className="col-span-1 overflow-hidden rounded-panel bg-gradient-to-br from-[#4f46e5] to-[#2e2a8c] p-3 text-white shadow">
							<p className="text-[9px] font-medium uppercase tracking-wide text-white/70">
								Savings
							</p>
							<p className="mt-2 font-num text-sm font-bold">$12,340.00</p>
							<p className="mt-0.5 text-[8px] text-white/60">•• 9910</p>
						</div>
						<div className="col-span-1 overflow-hidden rounded-panel bg-gradient-to-br from-[#b0473d] to-[#6f2a24] p-3 text-white shadow">
							<p className="text-[9px] font-medium uppercase tracking-wide text-white/70">
								Credit
							</p>
							<p className="mt-2 font-num text-sm font-bold">-$1,203.00</p>
							<p className="mt-0.5 text-[8px] text-white/60">•• 7734</p>
						</div>
						<div className="col-span-1 hidden overflow-hidden rounded-panel bg-gradient-to-br from-[#3a9b6f] to-[#1f6b4a] p-3 text-white shadow sm:block">
							<p className="text-[9px] font-medium uppercase tracking-wide text-white/70">
								Investment
							</p>
							<p className="mt-2 font-num text-sm font-bold">$8,900.00</p>
							<p className="mt-0.5 text-[8px] text-white/60">•• 0021</p>
						</div>
					</div>

					{/* Stats + chart row */}
					<div className="mb-4 grid grid-cols-5 gap-2">
						{/* Stat tiles */}
						<div className="col-span-2 space-y-2">
							<div className="rounded-lg border border-border bg-card p-2.5">
								<p className="text-[9px] text-muted-foreground">
									Income this month
								</p>
								<p className="font-num text-sm font-bold text-income">
									+$5,400
								</p>
							</div>
							<div className="rounded-lg border border-border bg-card p-2.5">
								<p className="text-[9px] text-muted-foreground">
									Expenses this month
								</p>
								<p className="font-num text-sm font-bold text-expense">
									-$2,138
								</p>
							</div>
							<div className="rounded-lg border border-border bg-card p-2.5">
								<p className="text-[9px] text-muted-foreground">Net savings</p>
								<p className="font-num text-sm font-bold text-foreground">
									$3,262
								</p>
							</div>
						</div>

						{/* Mini bar chart */}
						<div className="col-span-3 rounded-lg border border-border bg-card p-3">
							<p className="mb-2 text-[9px] font-medium text-muted-foreground">
								Spending by category
							</p>
							<div className="flex h-16 items-end gap-1">
								{[55, 80, 40, 65, 90, 35, 70].map((h, i) => (
									<div
										// biome-ignore lint/suspicious/noArrayIndexKey: static demo bars
										key={i}
										className="flex-1 rounded-sm bg-primary/70"
										style={{ height: `${h}%` }}
									/>
								))}
							</div>
							<div className="mt-1 flex justify-between text-[7px] text-muted-foreground">
								<span>Mon</span>
								<span>Tue</span>
								<span>Wed</span>
								<span>Thu</span>
								<span>Fri</span>
								<span>Sat</span>
								<span>Sun</span>
							</div>
						</div>
					</div>

					{/* Transaction list */}
					<div className="rounded-lg border border-border bg-card">
						<p className="border-b border-border px-3 py-2 text-[10px] font-semibold text-muted-foreground">
							Recent transactions
						</p>
						{[
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
						].map((row) => (
							<div
								key={row.label}
								className="flex items-center justify-between px-3 py-1.5 odd:bg-row-hover/40"
							>
								<div className="min-w-0 flex-1">
									<p className="truncate text-[10px] font-medium text-foreground">
										{row.label}
									</p>
									<p className="text-[8px] text-muted-foreground">{row.cat}</p>
								</div>
								<span
									className={`shrink-0 font-num text-[10px] font-bold ${row.type === "income" ? "text-income" : "text-expense"}`}
								>
									{row.amount}
								</span>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Phone frame — overlapping bottom-right on desktop, stacked below on mobile */}
			<div className="relative z-20 mx-auto mt-4 w-[160px] sm:absolute sm:bottom-[-2rem] sm:right-[-1rem] sm:mt-0 sm:w-[140px] lg:right-[-2rem] lg:w-[160px]">
				<div className="overflow-hidden rounded-[2rem] border-2 border-border bg-panel shadow-xl">
					{/* Notch */}
					<div className="flex justify-center bg-canvas py-1.5">
						<div className="h-1.5 w-10 rounded-full bg-border" />
					</div>

					{/* Phone dashboard */}
					<div className="px-2.5 pb-3 pt-1">
						{/* Balance card */}
						<div className="mb-2 overflow-hidden rounded-xl bg-gradient-to-br from-[#1f6b4a] to-[#15402f] p-3 text-white shadow">
							<p className="text-[8px] font-medium uppercase tracking-wide text-white/70">
								Total balance
							</p>
							<p className="mt-2 font-num text-base font-extrabold">$24,858</p>
							<p className="mt-0.5 text-[8px] text-white/60">
								↑ 12% vs last month
							</p>
						</div>

						{/* Mini stats */}
						<div className="mb-2 grid grid-cols-2 gap-1.5">
							<div className="rounded-lg border border-border bg-card p-2">
								<p className="text-[7px] text-muted-foreground">Income</p>
								<p className="font-num text-[10px] font-bold text-income">
									+$5.4k
								</p>
							</div>
							<div className="rounded-lg border border-border bg-card p-2">
								<p className="text-[7px] text-muted-foreground">Expenses</p>
								<p className="font-num text-[10px] font-bold text-expense">
									-$2.1k
								</p>
							</div>
						</div>

						{/* Mini transaction list */}
						<div className="rounded-lg border border-border bg-card">
							{[
								{ label: "Groceries", amount: "-$67", type: "expense" },
								{ label: "Salary", amount: "+$2.7k", type: "income" },
								{ label: "Netflix", amount: "-$16", type: "expense" },
							].map((row) => (
								<div
									key={row.label}
									className="flex items-center justify-between px-2 py-1 odd:bg-row-hover/40"
								>
									<p className="truncate text-[8px] text-foreground">
										{row.label}
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
					<div className="flex justify-center py-1.5">
						<div className="h-1 w-8 rounded-full bg-border" />
					</div>
				</div>
			</div>
		</div>
	);
}
