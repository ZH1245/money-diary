import {
	BarChart3,
	CalendarClock,
	Globe,
	Goal,
	ReceiptText,
	Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";

interface FeatureCardProps {
	icon: ReactNode;
	title: string;
	description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
	return (
		<div className="group rounded-panel border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
			<div className="mb-3 inline-flex size-11 items-center justify-center rounded-xl bg-soft-accent text-primary transition-transform group-hover:scale-105">
				{icon}
			</div>
			<h3 className="mb-1 text-base font-semibold text-foreground">{title}</h3>
			<p className="text-sm leading-relaxed text-muted-foreground">
				{description}
			</p>
		</div>
	);
}

const FEATURES: FeatureCardProps[] = [
	{
		icon: <ReceiptText className="size-5" />,
		title: "Transactions",
		description:
			"Log income and expenses in seconds with smart categorization.",
	},
	{
		icon: <BarChart3 className="size-5" />,
		title: "Analytics",
		description:
			"Visualize spending trends and net worth with beautiful charts.",
	},
	{
		icon: <Goal className="size-5" />,
		title: "Savings goals",
		description:
			"Set targets, track progress, and celebrate milestones on the way.",
	},
	{
		icon: <CalendarClock className="size-5" />,
		title: "Recurring bills",
		description:
			"Never miss a subscription or bill with automatic recurring rules.",
	},
	{
		icon: <Sparkles className="size-5" />,
		title: "AI assistant",
		description:
			"Describe a transaction in plain English and let AI fill in the details.",
	},
	{
		icon: <Globe className="size-5" />,
		title: "Multi-currency",
		description:
			"Track accounts in any currency with live exchange rate conversion.",
	},
];

export function FeatureGrid() {
	return (
		<section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
			<div className="mb-10 text-center">
				<h2 className="text-2xl font-bold text-foreground sm:text-3xl">
					Everything you need to stay in control
				</h2>
				<p className="mt-3 text-muted-foreground">
					One place for all your personal finance — simple, private, powerful.
				</p>
			</div>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{FEATURES.map((feature) => (
					<FeatureCard key={feature.title} {...feature} />
				))}
			</div>
		</section>
	);
}
