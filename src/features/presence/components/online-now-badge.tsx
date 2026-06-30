import { usePresenceContext } from "#/features/presence/context/presence-context";

/**
 * Small badge showing how many users are currently online.
 * Returns null when the count is 0 (Pusher disabled or no data yet).
 */
export function OnlineNowBadge() {
	const { onlineCount } = usePresenceContext();

	if (onlineCount === 0) return null;

	return (
		<div className="flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 dark:border-emerald-800 dark:bg-emerald-950/40">
			<span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
			<span className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
				{onlineCount} online now
			</span>
		</div>
	);
}
