import type { ReactNode } from "react";
import { PresenceProvider } from "#/features/presence/context/presence-context";

interface PresenceMountProps {
	children: ReactNode;
}

/**
 * Wraps authenticated content with the Pusher presence context.
 * Every signed-in user wrapped here joins the presence-online channel.
 */
export function PresenceMount({ children }: PresenceMountProps) {
	return <PresenceProvider>{children}</PresenceProvider>;
}
