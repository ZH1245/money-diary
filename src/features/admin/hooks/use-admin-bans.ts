import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateBanInput } from "#/features/admin/types/admin-ban";
import { queryKeys } from "#/features/query-keys";
import {
	createAdminBan,
	deleteAdminBan,
	listAdminBans,
} from "../api/admin-bans-api";

/** Fetches the admin ban list. */
export function useBansQuery() {
	return useQuery({
		queryKey: queryKeys.admin.bans,
		queryFn: listAdminBans,
	});
}

/** Creates a ban entry (email, IP, or both). */
export function useCreateBanMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: CreateBanInput) => createAdminBan(input),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: queryKeys.admin.bans });
		},
	});
}

/** Deletes a ban entry by id. */
export function useDeleteBanMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: number) => deleteAdminBan(id),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: queryKeys.admin.bans });
		},
	});
}
