/**
 * Seeds a demo account with fictional PKR data for screenshots and QA.
 *
 * Usage:
 *   pnpm seed:demo          # local DB (.env.local / .env)
 *   pnpm seed:demo:prod     # production DB (.env.prod)
 */
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { hashPassword } from "better-auth/crypto";
import { addDays, subDays } from "date-fns";
import { and, eq, isNull } from "drizzle-orm";

const isProd = process.env.DRIZZLE_ENV === "prod";
config({ path: isProd ? ".env.prod" : [".env.local", ".env"], override: isProd });

export const DEMO_USER = {
	name: "Demo User",
	email: "demo@moneydiary.app",
	password: "Demo@Money2026",
	securityQuestionKey: "childhood_nickname" as const,
	securityAnswer: "demo",
};

async function getGlobalCategoryId(
	slug: string,
): Promise<number | null> {
	const { db } = await import("#/db/index");
	const { categories } = await import("#/db/schema");
	const [row] = await db
		.select({ id: categories.id })
		.from(categories)
		.where(and(eq(categories.slug, slug), isNull(categories.userId)))
		.limit(1);
	return row?.id ?? null;
}

async function removeExistingDemoUser() {
	const { db } = await import("#/db/index");
	const { user } = await import("#/db/auth-schema");

	const [existing] = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.email, DEMO_USER.email))
		.limit(1);

	if (!existing) return;

	await db.delete(user).where(eq(user.id, existing.id));
	console.log("Removed existing demo user (cascade wiped related data).");
}

async function createDemoAuthUser(): Promise<string> {
	const { db } = await import("#/db/index");
	const { account, user } = await import("#/db/auth-schema");
	const { createSecurityProfile } = await import(
		"#/features/auth/server/user-security-repository"
	);

	const userId = randomUUID();
	const passwordHash = await hashPassword(DEMO_USER.password);

	await db.insert(user).values({
		id: userId,
		name: DEMO_USER.name,
		email: DEMO_USER.email,
		emailVerified: true,
		currency: "PKR",
		role: "user",
		accountStatus: "active",
		createdAt: new Date(),
		updatedAt: new Date(),
	});

	await db.insert(account).values({
		id: randomUUID(),
		userId,
		accountId: DEMO_USER.email,
		providerId: "credential",
		password: passwordHash,
		createdAt: new Date(),
		updatedAt: new Date(),
	});

	await createSecurityProfile({
		userId,
		questionOneKey: DEMO_USER.securityQuestionKey,
		answerOne: DEMO_USER.securityAnswer,
	});

	return userId;
}

async function seedDemoFinanceData(userId: string) {
	const { createUserPaymentAccount } = await import(
		"#/features/payment-accounts/server/payment-accounts-repository"
	);
	const { createUserTransaction } = await import(
		"#/features/transactions/server/transactions-repository"
	);
	const { createUserGoal } = await import(
		"#/features/goals/server/goals-repository"
	);
	const { createUserSaving } = await import(
		"#/features/savings/server/savings-repository"
	);
	const { createUserWishlistItem } = await import(
		"#/features/wishlist/server/wishlist-repository"
	);
	const { createUserRecurringRule } = await import(
		"#/features/recurring/server/recurring-repository"
	);

	const foodId = await getGlobalCategoryId("food");
	const transportId = await getGlobalCategoryId("transport");
	const subscriptionsId = await getGlobalCategoryId("subscriptions");
	const entertainmentId = await getGlobalCategoryId("entertainment");
	const shoppingId = await getGlobalCategoryId("shopping");

	const nayapay = await createUserPaymentAccount({
		userId,
		name: "NayaPay",
		institutionSlug: "nayapay",
		accountType: "wallet",
		lastFour: null,
		note: "Demo wallet",
	});

	const meezan = await createUserPaymentAccount({
		userId,
		name: "Meezan Bank",
		institutionSlug: "meezan",
		accountType: "debit",
		lastFour: "4521",
		note: "Salary account",
	});

	const cash = await createUserPaymentAccount({
		userId,
		name: "Cash on hand",
		institutionSlug: "cash",
		accountType: "cash",
		lastFour: null,
		note: null,
	});

	const jazzcash = await createUserPaymentAccount({
		userId,
		name: "JazzCash",
		institutionSlug: "jazzcash",
		accountType: "wallet",
		lastFour: null,
		note: "Subscriptions",
	});

	const now = new Date();
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 10, 0, 0);

	const tx = async (input: {
		title: string;
		amount: string;
		type: "income" | "expense";
		categoryId: number | null;
		paymentAccountId: number;
		daysAgo: number;
	}) => {
		await createUserTransaction({
			userId,
			title: input.title,
			amount: input.amount,
			sourceAmount: null,
			sourceCurrency: "PKR",
			exchangeRate: "1",
			type: input.type,
			categoryId: input.categoryId,
			paymentAccountId: input.paymentAccountId,
			source: null,
			note: null,
			happenedAt: subDays(monthStart, -input.daysAgo),
		});
	};

	await tx({
		title: "Salary — Acme Studio",
		amount: "55000",
		type: "income",
		categoryId: null,
		paymentAccountId: meezan.id,
		daysAgo: 0,
	});
	await tx({
		title: "Freelance — UI project",
		amount: "12000",
		type: "income",
		categoryId: null,
		paymentAccountId: nayapay.id,
		daysAgo: 5,
	});
	await tx({
		title: "JazzCash top-up",
		amount: "10000",
		type: "income",
		categoryId: null,
		paymentAccountId: jazzcash.id,
		daysAgo: 1,
	});
	await tx({
		title: "ATM withdrawal — petty cash",
		amount: "8000",
		type: "income",
		categoryId: null,
		paymentAccountId: cash.id,
		daysAgo: 1,
	});
	await tx({
		title: "Netflix",
		amount: "1500",
		type: "expense",
		categoryId: subscriptionsId,
		paymentAccountId: jazzcash.id,
		daysAgo: 2,
	});
	await tx({
		title: "Claude AI",
		amount: "2500",
		type: "expense",
		categoryId: subscriptionsId,
		paymentAccountId: jazzcash.id,
		daysAgo: 3,
	});
	await tx({
		title: "Imtiaz groceries",
		amount: "3200",
		type: "expense",
		categoryId: foodId,
		paymentAccountId: meezan.id,
		daysAgo: 4,
	});
	await tx({
		title: "Shell petrol",
		amount: "2800",
		type: "expense",
		categoryId: transportId,
		paymentAccountId: meezan.id,
		daysAgo: 6,
	});
	await tx({
		title: "Zong recharge",
		amount: "500",
		type: "expense",
		categoryId: subscriptionsId,
		paymentAccountId: jazzcash.id,
		daysAgo: 7,
	});
	await tx({
		title: "Bundu Khan — lunch",
		amount: "1850",
		type: "expense",
		categoryId: foodId,
		paymentAccountId: cash.id,
		daysAgo: 8,
	});
	await tx({
		title: "Cakes & Bakes",
		amount: "980",
		type: "expense",
		categoryId: foodId,
		paymentAccountId: cash.id,
		daysAgo: 9,
	});
	await tx({
		title: "Loaded fries",
		amount: "650",
		type: "expense",
		categoryId: foodId,
		paymentAccountId: nayapay.id,
		daysAgo: 10,
	});
	await tx({
		title: "Uber ride",
		amount: "680",
		type: "expense",
		categoryId: transportId,
		paymentAccountId: nayapay.id,
		daysAgo: 11,
	});
	await tx({
		title: "Khaadi — kurta",
		amount: "6500",
		type: "expense",
		categoryId: shoppingId,
		paymentAccountId: meezan.id,
		daysAgo: 12,
	});
	await tx({
		title: "Cinema — Guardians",
		amount: "2400",
		type: "expense",
		categoryId: entertainmentId,
		paymentAccountId: meezan.id,
		daysAgo: 13,
	});
	await tx({
		title: "Chai & snacks",
		amount: "450",
		type: "expense",
		categoryId: foodId,
		paymentAccountId: cash.id,
		daysAgo: 14,
	});
	await tx({
		title: "Spotify",
		amount: "349",
		type: "expense",
		categoryId: subscriptionsId,
		paymentAccountId: jazzcash.id,
		daysAgo: 15,
	});
	await tx({
		title: "Pharmacy",
		amount: "1200",
		type: "expense",
		categoryId: shoppingId,
		paymentAccountId: cash.id,
		daysAgo: 16,
	});
	await tx({
		title: "Bonus — client tip",
		amount: "5000",
		type: "income",
		categoryId: null,
		paymentAccountId: nayapay.id,
		daysAgo: 18,
	});

	const emergencyGoal = await createUserGoal({
		userId,
		title: "Emergency fund",
		targetAmount: "150000",
		currentAmount: "35000",
		savingsAmount: "35000",
		status: "active",
		targetDate: addDays(now, 180),
		note: "6 months of expenses",
	});

	await createUserGoal({
		userId,
		title: "MacBook Air",
		targetAmount: "85000",
		currentAmount: "12000",
		savingsAmount: "12000",
		status: "active",
		targetDate: addDays(now, 120),
		note: null,
	});

	await createUserSaving({
		userId,
		goalId: emergencyGoal.id,
		paymentAccountId: meezan.id,
		title: "June savings transfer",
		amount: "8000",
		note: "Pay yourself first",
		savedAt: subDays(now, 3),
	});

	await createUserWishlistItem({
		userId,
		title: "AirPods Pro",
		targetAmount: "35000",
		currentAmount: "5000",
		priority: "medium",
		status: "active",
		note: "After laptop goal",
	});

	await createUserWishlistItem({
		userId,
		title: "Weekend trip — Hunza",
		targetAmount: "45000",
		currentAmount: "0",
		priority: "low",
		status: "active",
		note: null,
	});

	await createUserRecurringRule({
		userId,
		title: "Netflix",
		amount: "1500",
		currency: "PKR",
		type: "expense",
		categoryId: subscriptionsId,
		paymentAccountId: jazzcash.id,
		source: null,
		note: "Monthly subscription",
		cadence: "monthly",
		nextRunAt: addDays(now, 28),
	});

	await createUserRecurringRule({
		userId,
		title: "Claude AI",
		amount: "2500",
		currency: "PKR",
		type: "expense",
		categoryId: subscriptionsId,
		paymentAccountId: jazzcash.id,
		source: null,
		note: "Pro plan",
		cadence: "monthly",
		nextRunAt: addDays(now, 3),
	});

	console.log(
		"Seeded demo accounts, transactions, goals, savings, wishlist, and bills.",
	);
}

async function main() {
	console.log(
		`Seeding demo user on ${isProd ? "production" : "local"} database…`,
	);
	await removeExistingDemoUser();
	const userId = await createDemoAuthUser();
	await seedDemoFinanceData(userId);

	console.log("\nDemo account ready:\n");
	console.log(`  Email:    ${DEMO_USER.email}`);
	console.log(`  Password: ${DEMO_USER.password}`);
	console.log(
		`  Security answer (${DEMO_USER.securityQuestionKey}): ${DEMO_USER.securityAnswer}`,
	);
	console.log("\nAll balances and transactions are fictional.");
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
