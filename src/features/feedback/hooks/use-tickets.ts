import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '#/features/query-keys'
import type {
  CreateTicketMessageInput,
  UpdateTicketStatusInput,
} from '../types/ticket'
import {
  createAdminTicketMessage,
  createTicket,
  createUserTicketMessage,
  getAdminTicketDetail,
  getUserTicketDetail,
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

/** Fetches a single ticket with thread (user). */
export function useUserTicketDetailQuery(ticketId: number | null) {
  return useQuery({
    queryKey: ticketId == null ? ['tickets', 'none'] : queryKeys.tickets.detail(ticketId),
    queryFn: () => getUserTicketDetail(ticketId as number),
    enabled: ticketId != null,
  })
}

/** Submits a new ticket. */
export function useCreateTicketMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTicket,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all })
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.tickets })
    },
  })
}

/** Sends a user reply on a ticket thread. */
export function useCreateUserTicketMessageMutation(ticketId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateTicketMessageInput) =>
      createUserTicketMessage(ticketId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.detail(ticketId),
      })
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

/** Fetches a single ticket with thread (admin). */
export function useAdminTicketDetailQuery(ticketId: number | null) {
  return useQuery({
    queryKey:
      ticketId == null ? ['admin', 'tickets', 'none'] : queryKeys.admin.ticket(ticketId),
    queryFn: () => getAdminTicketDetail(ticketId as number),
    enabled: ticketId != null,
  })
}

/** Updates a ticket's status (admin). */
export function useUpdateTicketStatusMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateTicketStatusInput }) =>
      updateAdminTicketStatus(id, input),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.tickets })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.admin.ticket(variables.id),
      })
    },
  })
}

/** Sends an admin reply on a ticket thread. */
export function useCreateAdminTicketMessageMutation(ticketId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateTicketMessageInput) =>
      createAdminTicketMessage(ticketId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.admin.ticket(ticketId),
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.tickets })
    },
  })
}
