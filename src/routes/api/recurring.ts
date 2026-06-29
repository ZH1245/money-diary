import { createFileRoute } from "@tanstack/react-router";
import { isPaymentAccountAccessibleByUser } from "#/features/payment-accounts/server/payment-accounts-repository";
import { createRecurringSchema } from "#/features/recurring/schemas/recurring";
import {
	createUserRecurringRule,
	getUserRecurringRules,
} from "#/features/recurring/server/recurring-repository";
import { computeNextRun } from "#/features/recurring/utils/recurring-schedule";
import { isCategoryAccessibleByUser } from "#/features/transactions/server/transactions-repository";
import {
	requiresTransactionCategory,
	resolveTransactionCategoryId,
} from "#/features/transactions/utils/transaction-category";
import {
	buildOptionsResponse,
	guardApiRequest,
	rejectClientSuppliedUserId,
	requireUserContext,
} from "#/lib/server/api-guards";
import { parseJsonBody } from "#/lib/server/request-body";

export const Route = createFileRoute("/api/recurring")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const blockedResponse = await guardApiRequest(request);
				if (blockedResponse) return blockedResponse;
				const userContext = await requireUserContext(request);
				if (userContext instanceof Response) return userContext;
				const userIdRejected = rejectClientSuppliedUserId(request);
				if (userIdRejected) return userIdRejected;

				const rows = await getUserRecurringRules(userContext.id);
				return Response.json({ success: true, data: rows });
			},
			POST: async ({ request }) => {
				const blockedResponse = await guardApiRequest(request);
				if (blockedResponse) return blockedResponse;
				const userContext = await requireUserContext(request);
				if (userContext instanceof Response) return userContext;

				const body = await parseJsonBody(request);
				if (body instanceof Response) return body;
				const userIdRejected = rejectClientSuppliedUserId(
					request,
					body as Record<string, unknown>,
				);
				if (userIdRejected) return userIdRejected;

				const parsed = createRecurringSchema.safeParse(body);
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

				const categoryId = resolveTransactionCategoryId(
					parsed.data.type,
					parsed.data.categoryId ?? null,
				);

				if (
					requiresTransactionCategory(parsed.data.type) &&
					categoryId === null
				) {
					return Response.json(
						{
							success: false,
							error: "Category is required for expense and transfer",
						},
						{ status: 400 },
					);
				}

				if (categoryId !== null) {
					const canUseCategory = await isCategoryAccessibleByUser({
						userId: userContext.id,
						categoryId,
					});
					if (!canUseCategory) {
						return Response.json(
							{ success: false, error: "Category not found" },
							{ status: 404 },
						);
					}
				}

				if (parsed.data.paymentAccountId) {
					const canUseAccount = await isPaymentAccountAccessibleByUser({
						userId: userContext.id,
						paymentAccountId: parsed.data.paymentAccountId,
					});
					if (!canUseAccount) {
						return Response.json(
							{ success: false, error: "Payment account not found" },
							{ status: 404 },
						);
					}
				}

				const now = new Date();
				const nextRunAt = parsed.data.nextRunAt
					? new Date(parsed.data.nextRunAt)
					: computeNextRun(now, parsed.data.cadence, now);

				const row = await createUserRecurringRule({
					userId: userContext.id,
					title: parsed.data.title.trim(),
					amount: parsed.data.amount.trim(),
					currency: parsed.data.currency.toUpperCase(),
					type: parsed.data.type,
					categoryId,
					paymentAccountId: parsed.data.paymentAccountId ?? null,
					source: parsed.data.source ?? "recurring",
					note: parsed.data.note ?? null,
					sourceTransactionId: parsed.data.sourceTransactionId ?? null,
					cadence: parsed.data.cadence,
					nextRunAt,
				});

				return Response.json({ success: true, data: row }, { status: 201 });
			},
			OPTIONS: ({ request }) => buildOptionsResponse(request),
		},
	},
});
