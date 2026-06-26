import { z } from "zod";

export const createBanSchema = z
	.object({
		email: z
			.string()
			.trim()
			.email("Enter a valid email address")
			.optional()
			.or(z.literal("")),
		ip: z.string().trim().optional().or(z.literal("")),
		reason: z.string().trim().min(3, "Reason must be at least 3 characters"),
		expiresAt: z.string().nullable().optional(),
	})
	.refine(
		(data) =>
			(data.email !== undefined && data.email.length > 0) ||
			(data.ip !== undefined && data.ip.length > 0),
		{
			message: "At least one of email or IP address must be provided",
			path: ["email"],
		},
	);
