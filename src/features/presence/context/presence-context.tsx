import type { PresenceChannel } from "pusher-js";
import {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
	type ReactNode,
} from "react";
import { getPusherClient } from "#/lib/pusher-client";

const PRESENCE_CHANNEL = "presence-online";

interface PresenceContextValue {
	onlineCount: number;
}

const PresenceContext = createContext<PresenceContextValue>({ onlineCount: 0 });

export function PresenceProvider({ children }: { children: ReactNode }) {
	const [onlineCount, setOnlineCount] = useState(0);
	const channelRef = useRef<PresenceChannel | null>(null);

	useEffect(() => {
		let cancelled = false;

		void getPusherClient().then((pusher) => {
			if (!pusher || cancelled) return;

			const channel = pusher.subscribe(PRESENCE_CHANNEL) as PresenceChannel;
			channelRef.current = channel;

			channel.bind(
				"pusher:subscription_succeeded",
				(members: { count: number }) => {
					if (!cancelled) setOnlineCount(members.count);
				},
			);

			channel.bind("pusher:member_added", () => {
				if (!cancelled) setOnlineCount((prev) => prev + 1);
			});

			channel.bind("pusher:member_removed", () => {
				if (!cancelled) setOnlineCount((prev) => Math.max(0, prev - 1));
			});
		});

		return () => {
			cancelled = true;
			const ch = channelRef.current;
			if (ch) {
				ch.unbind_all();
				ch.unsubscribe();
				channelRef.current = null;
			}
			setOnlineCount(0);
		};
	}, []);

	return (
		<PresenceContext.Provider value={{ onlineCount }}>
			{children}
		</PresenceContext.Provider>
	);
}

export function usePresenceContext(): PresenceContextValue {
	return useContext(PresenceContext);
}
