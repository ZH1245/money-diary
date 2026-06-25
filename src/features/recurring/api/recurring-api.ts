import type { ApiListResponse } from "#/types/api";
import type {
	CreateRecurringInput,
	RecurringRuleDto,
	UpdateRecurringInput,
} from "../types/recurring";

/** Loads recurring rules for the active user. */
export async function getRecurringRules(): Promise<RecurringRuleDto[]> {
	const response = await fetch("/api/recurring");
	const json = (await response.json()) as ApiListResponse<RecurringRuleDto>;

	if (!response.ok || !json.success) {
		throw new Error(json.error ?? "Unable to load recurring rules");
	}

	return json.data;
}

/** Creates a recurring rule. */
export async function createRecurringRule(
	input: CreateRecurringInput,
): Promise<RecurringRuleDto> {
	const response = await fetch("/api/recurring", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(input),
	});

	const json = (await response.json()) as {
		success: boolean;
		data: RecurringRuleDto;
		error?: string;
	};

	if (!response.ok || !json.success) {
		throw new Error(json.error ?? "Unable to create recurring rule");
	}

	return json.data;
}

/** Updates a recurring rule. */
export async function updateRecurringRule(
	id: number,
	input: UpdateRecurringInput,
): Promise<RecurringRuleDto> {
	const response = await fetch(`/api/recurring/${id}`, {
		method: "PATCH",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(input),
	});

	const json = (await response.json()) as {
		success: boolean;
		data: RecurringRuleDto;
		error?: string;
	};

	if (!response.ok || !json.success) {
		throw new Error(json.error ?? "Unable to update recurring rule");
	}

	return json.data;
}

/** Deletes a recurring rule. */
export async function deleteRecurringRule(id: number): Promise<void> {
	const response = await fetch(`/api/recurring/${id}`, { method: "DELETE" });
	const json = (await response.json()) as { success: boolean; error?: string };

	if (!response.ok || !json.success) {
		throw new Error(json.error ?? "Unable to delete recurring rule");
	}
}
