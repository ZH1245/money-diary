import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "#/features/query-keys";
import {
	createRecurringRule,
	deleteRecurringRule,
	getRecurringRules,
	updateRecurringRule,
} from "../api/recurring-api";
import type { UpdateRecurringInput } from "../types/recurring";

/** Fetches the user's recurring rules. */
export function useRecurringRulesQuery() {
	return useQuery({
		queryKey: queryKeys.recurring.all,
		queryFn: getRecurringRules,
	});
}

/** Creates a recurring rule. */
export function useCreateRecurringMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createRecurringRule,
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: queryKeys.recurring.all,
			});
		},
	});
}

/** Updates a recurring rule. */
export function useUpdateRecurringMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, input }: { id: number; input: UpdateRecurringInput }) =>
			updateRecurringRule(id, input),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: queryKeys.recurring.all,
			});
		},
	});
}

/** Deletes a recurring rule. */
export function useDeleteRecurringMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteRecurringRule,
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: queryKeys.recurring.all,
			});
		},
	});
}
