import { Monitor, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "#/lib/utils";

export type ViewportMode = "desktop" | "mobile";

/** True when the OS/browser requests reduced motion. */
function prefersReducedMotion(): boolean {
	if (typeof window === "undefined") return false;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Fades and slides content in when it enters the viewport.
 * Skips animation when prefers-reduced-motion is active.
 */
export function ScrollReveal({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	const ref = useRef<HTMLDivElement>(null);
	// Start visible immediately when reduced motion is preferred.
	const [visible, setVisible] = useState(() => prefersReducedMotion());

	useEffect(() => {
		// If already visible (reduced-motion path) nothing to observe.
		if (visible) return;

		const node = ref.current;
		if (!node) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) {
					setVisible(true);
					observer.disconnect();
				}
			},
			{ threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
		);

		observer.observe(node);
		return () => observer.disconnect();
	}, [visible]);

	return (
		<div
			ref={ref}
			className={cn(
				"transition-all duration-700 ease-out",
				visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
				className,
			)}
		>
			{children}
		</div>
	);
}

/**
 * Desktop / mobile toggle for landing screenshot previews.
 */
export function ViewportToggle({
	mode,
	onChange,
}: {
	mode: ViewportMode;
	onChange: (mode: ViewportMode) => void;
}) {
	return (
		<div
			className="inline-flex rounded-full border border-border bg-panel p-1 shadow-sm"
			role="group"
			aria-label="Screenshot viewport"
		>
			<button
				type="button"
				onClick={() => onChange("desktop")}
				aria-pressed={mode === "desktop"}
				className={cn(
					"inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
					mode === "desktop"
						? "bg-primary text-primary-foreground"
						: "text-muted-foreground hover:text-foreground",
				)}
			>
				<Monitor className="size-3.5" />
				Desktop
			</button>
			<button
				type="button"
				onClick={() => onChange("mobile")}
				aria-pressed={mode === "mobile"}
				className={cn(
					"inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
					mode === "mobile"
						? "bg-primary text-primary-foreground"
						: "text-muted-foreground hover:text-foreground",
				)}
			>
				<Smartphone className="size-3.5" />
				Mobile
			</button>
		</div>
	);
}
