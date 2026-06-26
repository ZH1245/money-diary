import { createFileRoute } from "@tanstack/react-router";
import { createBanSchema } from "#/features/admin/schemas/admin-ban";
import {
	createBan,
	listBans,
} from "#/features/admin/server/admin-bans-repository";
import { requireAdmin } from "#/lib/server/admin-guard";
import {
	buildOptionsResponse,
	guardApiRequest,
	requireUserContext,
} from "#/lib/server/api-guards";

export const Route = createFileRoute("/api/admin/bans")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const blockedResponse = await guardApiRequest(request);
				if (blockedResponse) return blockedResponse;
				const adminResponse = await requireAdmin(request);
				if (adminResponse) return adminResponse;

				try {
					const data = await listBans();
					return Response.json({ success: true, data });
				} catch (error) {
					console.error("[admin/bans GET]", error);
					return Response.json(
						{ success: false, error: "Unable to load bans." },
						{ status: 500 },
					);
				}
			},
			POST: async ({ request }) => {
				const blockedResponse = await guardApiRequest(request);
				if (blockedResponse) return blockedResponse;
				const adminResponse = await requireAdmin(request);
				if (adminResponse) return adminResponse;

				const userContext = await requireUserContext(request);
				if (userContext instanceof Response) return userContext;

				const body = await request.json().catch(() => null);
				const parsed = createBanSchema.safeParse(body);
				if (!parsed.success) {
					return Response.json(
						{
							success: false,
							error: "Invalid ban payload",
							details: parsed.error.flatten(),
						},
						{ status: 400 },
					);
				}

				try {
					const data = await createBan({
						adminUserId: userContext.id,
						email:
							parsed.data.email && parsed.data.email.length > 0
								? parsed.data.email
								: undefined,
						ip:
							parsed.data.ip && parsed.data.ip.length > 0
								? parsed.data.ip
								: undefined,
						reason: parsed.data.reason,
						expiresAt: parsed.data.expiresAt ?? null,
					});
					return Response.json({ success: true, data });
				} catch (error) {
					console.error("[admin/bans POST]", error);
					return Response.json(
						{ success: false, error: "Unable to create ban." },
						{ status: 500 },
					);
				}
			},
			OPTIONS: ({ request }) => buildOptionsResponse(request),
		},
	},
});
