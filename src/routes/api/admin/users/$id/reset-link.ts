import { createFileRoute } from "@tanstack/react-router";
import { generatePasswordResetToken } from "#/features/admin/server/admin-password-reset-repository";
import { requireAdmin } from "#/lib/server/admin-guard";
import {
	buildOptionsResponse,
	guardApiRequest,
	requireUserContext,
} from "#/lib/server/api-guards";

export const Route = createFileRoute("/api/admin/users/$id/reset-link")({
	server: {
		handlers: {
			POST: async ({ request, params }) => {
				const blockedResponse = await guardApiRequest(request);
				if (blockedResponse) return blockedResponse;
				const adminResponse = await requireAdmin(request);
				if (adminResponse) return adminResponse;

				const userContext = await requireUserContext(request);
				if (userContext instanceof Response) return userContext;

				try {
					const data = await generatePasswordResetToken({
						adminUserId: userContext.id,
						targetUserId: params.id,
					});

					return Response.json({ success: true, data });
				} catch (error) {
					console.error("[admin/users/reset-link POST]", error);
					return Response.json(
						{ success: false, error: "Unable to generate reset link." },
						{ status: 400 },
					);
				}
			},
			OPTIONS: ({ request }) => buildOptionsResponse(request),
		},
	},
});
