import { createHash, randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { account, user } from "#/db/auth-schema";
import { db } from "#/db/index";
import { passwordResetTokens } from "#/db/schema";
import { revokeAllUserSessions } from "#/features/auth/server/user-security-repository";

function hashToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

/**
 * Generates a one-time admin password reset token for the target user.
 * Invalidates any previous unused tokens first.
 * Returns the RAW token (not the hash) to be embedded in the reset URL.
 */
export async function generatePasswordResetToken({
	adminUserId,
	targetUserId,
}: {
	adminUserId: string;
	targetUserId: string;
}): Promise<{ token: string; expiresAt: string }> {
	const [targetUser] = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.id, targetUserId))
		.limit(1);

	if (!targetUser) {
		throw new Error("User not found");
	}

	// Invalidate all prior unused tokens for this user.
	await db
		.delete(passwordResetTokens)
		.where(
			and(
				eq(passwordResetTokens.userId, targetUserId),
				isNull(passwordResetTokens.usedAt),
			),
		);

	const token = randomBytes(32).toString("hex");
	const tokenHash = hashToken(token);
	const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

	await db.insert(passwordResetTokens).values({
		userId: targetUserId,
		tokenHash,
		expiresAt,
		createdBy: adminUserId,
	});

	return { token, expiresAt: expiresAt.toISOString() };
}

/**
 * Consumes a raw reset token: verifies it, updates the account password,
 * marks the token as used, and revokes all sessions for the user.
 */
export async function consumePasswordResetToken({
	token,
	newPassword,
}: {
	token: string;
	newPassword: string;
}): Promise<"ok" | "invalid"> {
	const tokenHash = hashToken(token);
	const now = new Date();

	const [row] = await db
		.select()
		.from(passwordResetTokens)
		.where(
			and(
				eq(passwordResetTokens.tokenHash, tokenHash),
				isNull(passwordResetTokens.usedAt),
				gt(passwordResetTokens.expiresAt, now),
			),
		)
		.limit(1);

	if (!row) return "invalid";

	// Find the credential (email/password) account for this user.
	const [credentialAccount] = await db
		.select({ id: account.id, password: account.password })
		.from(account)
		.where(eq(account.userId, row.userId))
		.limit(1);

	if (!credentialAccount?.password) return "invalid";

	const newPasswordHash = await hashPassword(newPassword);

	await db
		.update(account)
		.set({
			password: newPasswordHash,
			updatedAt: new Date(),
		})
		.where(eq(account.id, credentialAccount.id));

	await db
		.update(passwordResetTokens)
		.set({ usedAt: now })
		.where(eq(passwordResetTokens.id, row.id));

	await revokeAllUserSessions(row.userId);

	return "ok";
}
