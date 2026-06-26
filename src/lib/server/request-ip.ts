/**
 * Extracts the client IP address from request headers.
 * Reads x-forwarded-for first (taking the first value), falling back to x-real-ip.
 */
export function getClientIp(request: Request): string | null {
	const forwardedFor = request.headers.get("x-forwarded-for");
	if (forwardedFor) {
		const first = forwardedFor.split(",")[0]?.trim();
		if (first) return first;
	}
	const realIp = request.headers.get("x-real-ip");
	return realIp?.trim() ?? null;
}
