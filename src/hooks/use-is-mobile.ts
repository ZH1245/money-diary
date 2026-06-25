import { useEffect, useState } from "react";

/** Tailwind `lg` breakpoint — below this we render the mobile app shell. */
const MOBILE_BREAKPOINT = 1024;

/**
 * Returns true when the viewport is narrower than the `lg` breakpoint.
 * SSR-safe: returns false on the server and syncs on mount.
 */
export function useIsMobile(): boolean {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
		const update = () => setIsMobile(query.matches);
		update();
		query.addEventListener("change", update);
		return () => query.removeEventListener("change", update);
	}, []);

	return isMobile;
}
