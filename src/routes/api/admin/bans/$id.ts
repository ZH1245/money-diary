import { createFileRoute } from "@tanstack/react-router";
import { deleteBan } from "#/features/admin/server/admin-bans-repository";
import { requireAdmin } from "#/lib/server/admin-guard";
import {
	buildOptionsResponse,
	guardApiRequest,
	requireUserContext,
} from "#/lib/server/api-guards";

export const Route = createFileRoute("/api/admin/bans/$id")({
	server: {
		handlers: {
			DELETE: async ({ request, params }) => {
				const blockedResponse = await guardApiRequest(request);
				if (blockedResponse) return blockedResponse;
				const adminResponse = await requireAdmin(request);
				if (adminResponse) return adminResponse;

				const userContext = await requireUserContext(request);
				if (userContext instanceof Response) return userContext;

				const id = Number(params.id);
				if (!Number.isInteger(id) || id <= 0) {
					return Response.json(
						{ success: false, error: "Invalid ban id" },
						{ status: 400 },
					);
				}

				try {
					const deleted = await deleteBan(id);
					if (!deleted) {
						return Response.json(
							{ success: false, error: "Ban not found" },
							{ status: 404 },
						);
					}
					return Response.json({ success: true, data: { id } });
				} catch (error) {
					console.error("[admin/bans/$id DELETE]", error);
					return Response.json(
						{ success: false, error: "Unable to delete ban." },
						{ status: 500 },
					);
				}
			},
			OPTIONS: ({ request }) => buildOptionsResponse(request),
		},
	},
});
