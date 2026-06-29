import { z } from "zod";

const cadenceSchema = z.enum(["weekly", "monthly", "yearly"]);
const typeSchema = z.enum(["income", "expense", "transfer"]);

export const createRecurringSchema = z.object({
	title: z.string().trim().min(1, "Title is required").max(200),
	amount: z.string().trim().min(1, "Amount is required"),
	currency: z.string().trim().length(3),
	type: typeSchema,
	categoryId: z.number().int().positive().nullable().optional(),
	paymentAccountId: z.number().int().positive().nullable().optional(),
	source: z.string().trim().max(100).nullable().optional(),
	note: z.string().trim().max(500).nullable().optional(),
	sourceTransactionId: z.number().int().positive().nullable().optional(),
	cadence: cadenceSchema.default("monthly"),
	nextRunAt: z.string().datetime().optional(),
});

export const updateRecurringSchema = z.object({
	title: z.string().trim().min(1).max(200).optional(),
	amount: z.string().trim().min(1).optional(),
	currency: z.string().trim().length(3).optional(),
	type: typeSchema.optional(),
	categoryId: z.number().int().positive().nullable().optional(),
	paymentAccountId: z.number().int().positive().nullable().optional(),
	source: z.string().trim().max(100).nullable().optional(),
	note: z.string().trim().max(500).nullable().optional(),
	cadence: cadenceSchema.optional(),
	nextRunAt: z.string().datetime().optional(),
	isActive: z.boolean().optional(),
});
