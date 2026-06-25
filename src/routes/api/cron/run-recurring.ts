import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled worker endpoint invoked by Vercel Cron (see `vercel.json` → `crons`).
 *
 * This is the single idempotent "tick" described in docs/plans/PLATFORM_ROADMAP.md:
 * it is meant to scan recurring rules whose next run is due, materialize them into
 * real transactions (deduped by rule + period), and advance their schedule. Until
 * the recurring/bills feature lands it is a guarded no-op that proves the wiring.
 *
 * Security: when the CRON_SECRET env var is set, Vercel automatically sends
 * `Authorization: Bearer <CRON_SECRET>` with each scheduled invocation. We reject
 * anything without it so the public can't trigger the job. In production we refuse
 * to run at all unless the secret is configured.
 */
export const Route = createFileRoute("/api/cron/run-recurring")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const secret = process.env.CRON_SECRET;

				if (secret) {
					const authHeader = request.headers.get("authorization");
					if (authHeader !== `Bearer ${secret}`) {
						return Response.json(
							{ success: false, error: "Unauthorized" },
							{ status: 401 },
						);
					}
				} else if (process.env.NODE_ENV === "production") {
					return Response.json(
						{ success: false, error: "CRON_SECRET is not configured" },
						{ status: 503 },
					);
				}

				// TODO(recurring): select recurring_rules where nextRunAt <= now() and
				// isActive, create the due transaction(s) with a dedupe key of
				// `${ruleId}:${period}`, then advance nextRunAt to the next occurrence.
				const ranAt = new Date().toISOString();

				return Response.json({
					success: true,
					data: { processed: 0, ranAt },
				});
			},
		},
	},
});
