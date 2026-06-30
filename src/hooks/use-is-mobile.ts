import { useEffect, useState } from "react";

/** App shell mobile layout — Tailwind `lg` breakpoint. */
export const APP_SHELL_MOBILE_BREAKPOINT = 1024;

/** Shadcn sidebar sheet mode — Tailwind `md` breakpoint. */
export const SIDEBAR_MOBILE_BREAKPOINT = 768;

/**
 * Returns true when the viewport is narrower than `breakpoint`.
 * SSR-safe: returns false on the server and syncs on mount.
 */
export function useIsMobile(
	breakpoint: number = APP_SHELL_MOBILE_BREAKPOINT,
): boolean {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const query = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
		const update = () => setIsMobile(query.matches);
		update();
		query.addEventListener("change", update);
		return () => query.removeEventListener("change", update);
	}, [breakpoint]);

	return isMobile;
}
