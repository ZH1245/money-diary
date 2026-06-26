export const queryKeys = {
	auth: {
		securityProfile: ["auth", "security-profile"] as const,
	},
	categories: {
		all: ["categories"] as const,
	},
	paymentAccounts: {
		all: ["payment-accounts"] as const,
	},
	goals: {
		all: ["goals"] as const,
	},
	savings: {
		all: ["savings"] as const,
	},
	transactions: {
		all: ["transactions"] as const,
	},
	recurring: {
		all: ["recurring"] as const,
	},
	wishlist: {
		all: ["wishlist"] as const,
	},
	ai: {
		conversations: ["ai", "conversations"] as const,
		conversation: (id: number) => ["ai", "conversations", id] as const,
	},
	admin: {
		bans: ["admin", "bans"] as const,
	},
};
