import { useCallback, useState } from "react";

export interface ResetLinkData {
	token: string;
	expiresAt: string;
}

export interface UseGenerateResetLinkMutationReturn {
	mutate: (targetUserId: string) => Promise<ResetLinkData | null>;
	isPending: boolean;
	error: string | null;
	reset: () => void;
}

export function useGenerateResetLinkMutation(): UseGenerateResetLinkMutationReturn {
	const [isPending, setIsPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const reset = useCallback(() => {
		setError(null);
	}, []);

	const mutate = useCallback(
		async (targetUserId: string): Promise<ResetLinkData | null> => {
			setIsPending(true);
			setError(null);
			try {
				const response = await fetch(
					`/api/admin/users/${targetUserId}/reset-link`,
					{
						method: "POST",
						headers: { "content-type": "application/json" },
					},
				);

				const payload = (await response.json().catch(() => null)) as {
					success?: boolean;
					error?: string;
					data?: ResetLinkData;
				} | null;

				if (!response.ok || !payload?.success || !payload.data) {
					throw new Error(payload?.error ?? "Unable to generate reset link");
				}

				return payload.data;
			} catch (err) {
				const message =
					err instanceof Error ? err.message : "Unable to generate reset link";
				setError(message);
				return null;
			} finally {
				setIsPending(false);
			}
		},
		[],
	);

	return { mutate, isPending, error, reset };
}
