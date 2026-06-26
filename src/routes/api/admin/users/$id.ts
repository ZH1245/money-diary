import { createFileRoute } from "@tanstack/react-router";
import { moderateAdminUserSchema } from "#/features/admin/schemas/admin-user";
import {
	banAdminUser,
	deleteAdminUser,
	restoreAdminUser,
	restrictAdminUser,
} from "#/features/admin/server/admin-users-repository";
import { requireAdmin } from "#/lib/server/admin-guard";
import {
	buildOptionsResponse,
	guardApiRequest,
	rejectClientSuppliedUserId,
	requireUserContext,
} from "#/lib/server/api-guards";

export const Route = createFileRoute("/api/admin/users/$id")({
	server: {
		handlers: {
			PATCH: async ({ request, params }) => {
				const blockedResponse = await guardApiRequest(request);
				if (blockedResponse) return blockedResponse;
				const adminResponse = await requireAdmin(request);
				if (adminResponse) return adminResponse;

				const userContext = await requireUserContext(request);
				if (userContext instanceof Response) return userContext;

				const userIdRejected = rejectClientSuppliedUserId(request);
				if (userIdRejected) return userIdRejected;

				const body = await request.json().catch(() => null);
				const bodyUserIdRejected = rejectClientSuppliedUserId(
					request,
					body && typeof body === "object"
						? (body as Record<string, unknown>)
						: null,
				);
				if (bodyUserIdRejected) return bodyUserIdRejected;

				const parsed = moderateAdminUserSchema.safeParse(body);
				if (!parsed.success) {
					return Response.json(
						{
							success: false,
							error: "Invalid moderation payload",
							details: parsed.error.flatten(),
						},
						{ status: 400 },
					);
				}

				try {
					const expiresAt =
						parsed.data.action !== "restore" && parsed.data.expiresAt
							? new Date(parsed.data.expiresAt)
							: null;

					const data =
						parsed.data.action === "restrict"
							? await restrictAdminUser({
									adminUserId: userContext.id,
									targetUserId: params.id,
									reason: parsed.data.reason,
									expiresAt,
								})
							: parsed.data.action === "ban"
								? await banAdminUser({
										adminUserId: userContext.id,
										targetUserId: params.id,
										reason: parsed.data.reason,
										expiresAt,
									})
								: await restoreAdminUser({
										adminUserId: userContext.id,
										targetUserId: params.id,
									});

					if (!data) {
						return Response.json(
							{ success: false, error: "User not found" },
							{ status: 404 },
						);
					}

					return Response.json({ success: true, data });
				} catch (error) {
					console.error("[admin/users PATCH]", error);
					return Response.json(
						{ success: false, error: "Unable to update user moderation." },
						{ status: 400 },
					);
				}
			},
			DELETE: async ({ request, params }) => {
				const blockedResponse = await guardApiRequest(request);
				if (blockedResponse) return blockedResponse;
				const adminResponse = await requireAdmin(request);
				if (adminResponse) return adminResponse;

				const userContext = await requireUserContext(request);
				if (userContext instanceof Response) return userContext;

				const userIdRejected = rejectClientSuppliedUserId(request);
				if (userIdRejected) return userIdRejected;

				try {
					const deleted = await deleteAdminUser({
						adminUserId: userContext.id,
						targetUserId: params.id,
					});

					if (!deleted) {
						return Response.json(
							{ success: false, error: "User not found" },
							{ status: 404 },
						);
					}

					return Response.json({ success: true, data: { id: params.id } });
				} catch (error) {
					console.error("[admin/users DELETE]", error);
					return Response.json(
						{ success: false, error: "Unable to delete user." },
						{ status: 400 },
					);
				}
			},
			OPTIONS: ({ request }) => buildOptionsResponse(request),
		},
	},
});
