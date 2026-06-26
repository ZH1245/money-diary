export const USER_ACCOUNT_STATUSES = [
	"active",
	"restricted",
	"banned",
] as const;

export type UserAccountStatus = (typeof USER_ACCOUNT_STATUSES)[number];

export interface AdminUserRecord {
	id: string;
	name: string;
	email: string;
	role: string;
	accountStatus: UserAccountStatus;
	moderationReason: string | null;
	moderationExpiresAt: string | null;
	createdAt: string;
}

export interface UserModerationState {
	accountStatus: UserAccountStatus;
	moderationReason: string | null;
}
