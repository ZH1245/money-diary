import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { consumePasswordResetToken } from "#/features/admin/server/admin-password-reset-repository";
import { buildOptionsResponse, guardApiRequest } from "#/lib/server/api-guards";

const resetPasswordTokenSchema = z.object({
	token: z.string().min(1, "Token is required"),
	newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const Route = createFileRoute("/api/auth/reset-password-token")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const blockedResponse = await guardApiRequest(request);
				if (blockedResponse) return blockedResponse;

				const body = await request.json().catch(() => null);

				const parsed = resetPasswordTokenSchema.safeParse(body);
				if (!parsed.success) {
					return Response.json(
						{
							success: false,
							error: "Invalid payload",
							details: parsed.error.flatten(),
						},
						{ status: 400 },
					);
				}

				const result = await consumePasswordResetToken({
					token: parsed.data.token,
					newPassword: parsed.data.newPassword,
				});

				if (result === "invalid") {
					return Response.json(
						{
							success: false,
							error: "This reset link is invalid or has expired.",
						},
						{ status: 400 },
					);
				}

				return Response.json({ success: true });
			},
			OPTIONS: ({ request }) => buildOptionsResponse(request),
		},
	},
});
