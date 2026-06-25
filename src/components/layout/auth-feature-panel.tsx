import type { LucideIcon } from "lucide-react";
import { CircleDollarSign } from "lucide-react";

interface AuthFeatureItem {
	icon: LucideIcon;
	title: string;
	description: string;
}

interface AuthFeaturePanelProps {
	kicker: string;
	title: string;
	description: string;
	features: AuthFeatureItem[];
	tags?: string[];
}

/**
 * Renders the brand side panel (gradient + logo + tagline + feature blurbs)
 * for the auth routes. The gradient runs from the theme accent to a darker
 * shade so it adapts across every palette/mode.
 */
export function AuthFeaturePanel({
	kicker,
	title,
	description,
	features,
	tags = [],
}: AuthFeaturePanelProps) {
	return (
		<div
			className="relative flex h-full flex-col justify-between overflow-hidden p-10 text-primary-foreground xl:p-14"
			style={{
				background:
					"linear-gradient(160deg, var(--accent), color-mix(in oklab, var(--accent) 55%, black))",
			}}
		>
			{/* Soft glow accents */}
			<div className="pointer-events-none absolute -left-24 top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
			<div className="pointer-events-none absolute -right-16 bottom-12 h-72 w-72 rounded-full bg-black/10 blur-3xl" />

			<div className="relative rise-in flex items-center gap-2.5">
				<span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/15 text-primary-foreground backdrop-blur-sm">
					<CircleDollarSign className="size-5" />
				</span>
				<span className="text-base font-bold tracking-tight">Money Diary</span>
			</div>

			<div className="relative rise-in max-w-xl">
				<p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground/70">
					{kicker}
				</p>
				<h2 className="display-title mt-4 text-3xl font-bold leading-tight tracking-[-0.02em] xl:text-4xl">
					{title}
				</h2>
				<p className="mt-4 max-w-md text-sm leading-relaxed text-primary-foreground/80">
					{description}
				</p>

				{tags.length ? (
					<div className="mt-6 flex flex-wrap gap-2">
						{tags.map((tag) => (
							<span
								key={tag}
								className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-primary-foreground/90 backdrop-blur-sm"
							>
								{tag}
							</span>
						))}
					</div>
				) : null}
			</div>

			<ul className="relative rise-in grid max-w-xl gap-4 sm:grid-cols-1">
				{features.map((feature) => (
					<li
						key={feature.title}
						className="flex gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
					>
						<span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/15">
							<feature.icon className="size-4" />
						</span>
						<div>
							<p className="text-sm font-semibold">{feature.title}</p>
							<p className="mt-1 text-xs leading-relaxed text-primary-foreground/75">
								{feature.description}
							</p>
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}
