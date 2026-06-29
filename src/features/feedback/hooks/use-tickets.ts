import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '#/features/query-keys'
import type { UpdateTicketStatusInput } from '../types/ticket'
import {
  createTicket,
  getUserTickets,
  listAdminTickets,
  updateAdminTicketStatus,
} from '../api/tickets-api'

/** Fetches the user's own tickets. */
export function useUserTicketsQuery() {
  return useQuery({
    queryKey: queryKeys.tickets.all,
    queryFn: getUserTickets,
  })
}

/** Submits a new ticket. */
export function useCreateTicketMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTicket,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all })
    },
  })
}

/** Fetches all tickets (admin). */
export function useAdminTicketsQuery() {
  return useQuery({
    queryKey: queryKeys.admin.tickets,
    queryFn: listAdminTickets,
  })
}

/** Updates a ticket's status (admin). */
export function useUpdateTicketStatusMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateTicketStatusInput }) =>
      updateAdminTicketStatus(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.tickets })
    },
  })
}
