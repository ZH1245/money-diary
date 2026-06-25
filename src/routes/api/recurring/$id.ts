import { createFileRoute } from "@tanstack/react-router";
import { updateRecurringSchema } from "#/features/recurring/schemas/recurring";
import {
	deleteUserRecurringRule,
	getUserRecurringRuleById,
	updateUserRecurringRule,
} from "#/features/recurring/server/recurring-repository";
import {
	buildOptionsResponse,
	guardApiRequest,
	rejectClientSuppliedUserId,
	requireUserContext,
} from "#/lib/server/api-guards";
import { parseRouteId } from "#/lib/server/parse-route-id";
import { parseJsonBody } from "#/lib/server/request-body";

export const Route = createFileRoute("/api/recurring/$id")({
	server: {
		handlers: {
			PATCH: async ({ request, params }) => {
				const blockedResponse = await guardApiRequest(request);
				if (blockedResponse) return blockedResponse;
				const userContext = await requireUserContext(request);
				if (userContext instanceof Response) return userContext;
				const userIdRejected = rejectClientSuppliedUserId(request);
				if (userIdRejected) return userIdRejected;

				const ruleId = parseRouteId(params.id);
				if (!ruleId) {
					return Response.json(
						{ success: false, error: "Invalid recurring id" },
						{ status: 400 },
					);
				}

				const body = await parseJsonBody(request);
				if (body instanceof Response) return body;
				const bodyUserIdRejected = rejectClientSuppliedUserId(
					request,
					body as Record<string, unknown>,
				);
				if (bodyUserIdRejected) return bodyUserIdRejected;

				const parsed = updateRecurringSchema.safeParse(body);
				if (!parsed.success) {
					return Response.json(
						{
							success: false,
							error: "Invalid recurring payload",
							details: parsed.error.flatten(),
						},
						{ status: 400 },
					);
				}

				const existing = await getUserRecurringRuleById(userContext.id, ruleId);
				if (!existing) {
					return Response.json(
						{ success: false, error: "Recurring rule not found" },
						{ status: 404 },
					);
				}

				const row = await updateUserRecurringRule({
					userId: userContext.id,
					ruleId,
					title: parsed.data.title?.trim(),
					amount: parsed.data.amount?.trim(),
					currency: parsed.data.currency?.toUpperCase(),
					type: parsed.data.type,
					categoryId: parsed.data.categoryId,
					paymentAccountId: parsed.data.paymentAccountId,
					source: parsed.data.source,
					note: parsed.data.note,
					cadence: parsed.data.cadence,
					nextRunAt: parsed.data.nextRunAt
						? new Date(parsed.data.nextRunAt)
						: undefined,
					isActive: parsed.data.isActive,
				});

				return Response.json({ success: true, data: row });
			},
			DELETE: async ({ request, params }) => {
				const blockedResponse = await guardApiRequest(request);
				if (blockedResponse) return blockedResponse;
				const userContext = await requireUserContext(request);
				if (userContext instanceof Response) return userContext;
				const userIdRejected = rejectClientSuppliedUserId(request);
				if (userIdRejected) return userIdRejected;

				const ruleId = parseRouteId(params.id);
				if (!ruleId) {
					return Response.json(
						{ success: false, error: "Invalid recurring id" },
						{ status: 400 },
					);
				}

				const deleted = await deleteUserRecurringRule(userContext.id, ruleId);
				if (!deleted) {
					return Response.json(
						{ success: false, error: "Recurring rule not found" },
						{ status: 404 },
					);
				}

				return Response.json({ success: true, data: deleted });
			},
			OPTIONS: ({ request }) => buildOptionsResponse(request),
		},
	},
});
