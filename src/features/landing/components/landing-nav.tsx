import { Link } from "@tanstack/react-router";
import { CircleDollarSign } from "lucide-react";
import { ThemeToggle } from "#/components/layout/theme-toggle";
import { Button } from "#/components/ui/button";

export function LandingNav() {
	return (
		<header className="sticky top-0 z-50 w-full border-b border-border bg-canvas/90 backdrop-blur-md">
			<div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
				{/* Brand */}
				<Link
					to="/"
					className="flex shrink-0 items-center gap-2.5 no-underline"
				>
					<span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
						<CircleDollarSign className="size-4" />
					</span>
					<span className="hidden text-sm font-bold text-foreground sm:block">
						Money Diary
					</span>
				</Link>

				{/* Actions */}
				<nav className="flex shrink-0 items-center gap-2">
					<ThemeToggle />
					<Button variant="ghost" size="sm" asChild>
						<Link to="/sign-in" className="no-underline">
							Sign in
						</Link>
					</Button>
					<Button size="sm" asChild>
						<Link to="/sign-up" className="no-underline">
							Get started
						</Link>
					</Button>
				</nav>
			</div>
		</header>
	);
}
