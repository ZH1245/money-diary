import type {
	AdminBanRecord,
	CreateBanInput,
} from "#/features/admin/types/admin-ban";

/** Loads all bans for the admin panel. */
export async function listAdminBans(): Promise<AdminBanRecord[]> {
	const response = await fetch("/api/admin/bans");
	const json = (await response.json()) as {
		success: boolean;
		data?: AdminBanRecord[];
		error?: string;
	};

	if (!response.ok || !json.success) {
		throw new Error(json.error ?? "Unable to load bans");
	}

	return json.data ?? [];
}

/** Creates one or two ban entries (email, IP, or both). */
export async function createAdminBan(
	input: CreateBanInput,
): Promise<AdminBanRecord[]> {
	const response = await fetch("/api/admin/bans", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(input),
	});

	const json = (await response.json()) as {
		success: boolean;
		data?: AdminBanRecord[];
		error?: string;
	};

	if (!response.ok || !json.success) {
		throw new Error(json.error ?? "Unable to create ban");
	}

	return json.data ?? [];
}

/** Removes a ban entry by id. */
export async function deleteAdminBan(id: number): Promise<void> {
	const response = await fetch(`/api/admin/bans/${id}`, { method: "DELETE" });
	const json = (await response.json()) as { success: boolean; error?: string };

	if (!response.ok || !json.success) {
		throw new Error(json.error ?? "Unable to delete ban");
	}
}
