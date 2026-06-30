import { Monitor, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "#/lib/utils";

export type ViewportMode = "desktop" | "mobile";

/**
 * Fades and slides content in when it enters the viewport.
 */
export function ScrollReveal({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const node = ref.current;
		if (!node) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) {
					setVisible(true);
					observer.disconnect();
				}
			},
			{ threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
		);

		observer.observe(node);
		return () => observer.disconnect();
	}, []);

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
