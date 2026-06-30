import { z } from 'zod'

export const ticketTypeSchema = z.enum(['bug', 'feature', 'support'])
export const ticketStatusSchema = z.enum([
  'open',
  'in_progress',
  'resolved',
  'closed',
])
export const ticketMessageAuthorRoleSchema = z.enum(['user', 'admin'])

export const createTicketSchema = z.object({
  type: ticketTypeSchema,
  subject: z.string().trim().min(1, 'Subject is required').max(200),
  body: z.string().trim().min(1, 'Description is required').max(2000),
})

export const updateTicketStatusSchema = z.object({
  status: ticketStatusSchema,
})

export const createTicketMessageSchema = z.object({
  body: z.string().trim().min(1, 'Message is required').max(2000),
})
