export type BanTargetType = "email" | "ip";

export interface AdminBanRecord {
	id: number;
	targetType: BanTargetType;
	email: string | null;
	ipAddress: string | null;
	reason: string;
	createdBy: string | null;
	expiresAt: string | null;
	isActive: boolean;
	createdAt: string;
}

export interface CreateBanInput {
	email?: string;
	ip?: string;
	reason: string;
	expiresAt?: string | null;
}
