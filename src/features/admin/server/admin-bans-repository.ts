import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { db } from "#/db/index";
import { bans } from "#/db/schema";
import type { AdminBanRecord } from "#/features/admin/types/admin-ban";

function toBanRecord(row: typeof bans.$inferSelect): AdminBanRecord {
	return {
		id: row.id,
		targetType: row.targetType as "email" | "ip",
		email: row.email ?? null,
		ipAddress: row.ipAddress ?? null,
		reason: row.reason,
		createdBy: row.createdBy ?? null,
		expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
		isActive: row.isActive,
		createdAt: row.createdAt.toISOString(),
	};
}

/** Lists all bans, newest first. */
export async function listBans(): Promise<AdminBanRecord[]> {
	const rows = await db.select().from(bans).orderBy(desc(bans.createdAt));
	return rows.map(toBanRecord);
}

/**
 * Creates one row per provided target. If both email and ip are given,
 * inserts two rows: one with targetType 'email', one with 'ip'.
 */
export async function createBan({
	adminUserId,
	email,
	ip,
	reason,
	expiresAt,
}: {
	adminUserId: string;
	email?: string;
	ip?: string;
	reason: string;
	expiresAt?: string | null;
}): Promise<AdminBanRecord[]> {
	const expiresAtDate = expiresAt ? new Date(expiresAt) : null;
	const rows: (typeof bans.$inferInsert)[] = [];

	if (email) {
		rows.push({
			targetType: "email",
			email: email.trim().toLowerCase(),
			ipAddress: null,
			reason: reason.trim(),
			createdBy: adminUserId,
			expiresAt: expiresAtDate,
			isActive: true,
		});
	}

	if (ip) {
		rows.push({
			targetType: "ip",
			email: null,
			ipAddress: ip.trim(),
			reason: reason.trim(),
			createdBy: adminUserId,
			expiresAt: expiresAtDate,
			isActive: true,
		});
	}

	if (rows.length === 0) return [];

	const inserted = await db.insert(bans).values(rows).returning();
	return inserted.map(toBanRecord);
}

/** Deletes a ban row by id. Returns true if a row was deleted. */
export async function deleteBan(id: number): Promise<boolean> {
	const result = await db
		.delete(bans)
		.where(eq(bans.id, id))
		.returning({ id: bans.id });
	return result.length > 0;
}

/**
 * Returns the first active, non-expired ban matching the email or IP.
 * Used during sign-in enforcement.
 */
export async function getActiveBanMatch({
	email,
	ip,
}: {
	email?: string;
	ip?: string;
}): Promise<{ reason: string } | null> {
	const normalizedEmail = email?.trim().toLowerCase();
	const now = new Date();

	const targetConditions: ReturnType<typeof and>[] = [];

	if (normalizedEmail) {
		targetConditions.push(
			and(
				eq(bans.targetType, "email"),
				sql`lower(${bans.email}) = ${normalizedEmail}`,
			),
		);
	}

	if (ip) {
		targetConditions.push(
			and(eq(bans.targetType, "ip"), eq(bans.ipAddress, ip)),
		);
	}

	if (targetConditions.length === 0) return null;

	try {
		const [row] = await db
			.select({ reason: bans.reason })
			.from(bans)
			.where(
				and(
					eq(bans.isActive, true),
					or(...targetConditions),
					or(isNull(bans.expiresAt), gt(bans.expiresAt, now)),
				),
			)
			.limit(1);

		return row ?? null;
	} catch {
		return null;
	}
}
