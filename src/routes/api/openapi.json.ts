import { createFileRoute } from '@tanstack/react-router'
import { requireAdmin } from '#/lib/server/admin-guard'
import { enforceSameOrigin } from '#/lib/server/same-origin'

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Money Diary API',
    version: '0.1.0',
    description: 'OpenAPI specification for Money Diary server routes.',
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'auth', description: 'Authentication endpoints' },
    { name: 'categories', description: 'Category endpoints' },
    { name: 'transactions', description: 'Transaction endpoints' },
  ],
  paths: {
    '/api/auth/{path}': {
      get: {
        tags: ['auth'],
        summary: 'Auth GET endpoint',
        description: 'Delegates to Better Auth handler.',
        parameters: [
          {
            name: 'path',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Better Auth dynamic subpath.',
          },
        ],
        responses: {
          '200': { description: 'Auth response' },
          default: { description: 'Auth error response' },
        },
      },
      post: {
        tags: ['auth'],
        summary: 'Auth POST endpoint',
        description: 'Delegates to Better Auth handler.',
        parameters: [
          {
            name: 'path',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Better Auth dynamic subpath.',
          },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { type: 'object', additionalProperties: true },
            },
          },
        },
        responses: {
          '200': { description: 'Auth response' },
          default: { description: 'Auth error response' },
        },
      },
    },
    '/api/categories': {
      get: {
        tags: ['categories'],
        summary: 'List categories',
        responses: {
          '200': {
            description: 'Category list',
          },
        },
      },
      post: {
        tags: ['categories'],
        summary: 'Create category',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'slug', 'kind'],
                properties: {
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  kind: { type: 'string', enum: ['need', 'want', 'subscription', 'other'] },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Category created' },
          '400': { description: 'Validation error' },
        },
      },
    },
    '/api/transactions': {
      get: {
        tags: ['transactions'],
        summary: 'List transactions',
        responses: {
          '200': {
            description: 'Transaction list',
          },
        },
      },
      post: {
        tags: ['transactions'],
        summary: 'Create transaction',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'amount', 'type', 'categoryId'],
                properties: {
                  title: { type: 'string' },
                  amount: { type: 'string' },
                  type: { type: 'string', enum: ['income', 'expense', 'transfer'] },
                  categoryId: { type: 'integer' },
                  source: { type: 'string' },
                  note: { type: 'string' },
                  happenedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Transaction created' },
          '400': { description: 'Validation error' },
          '404': { description: 'Category not found' },
        },
      },
    },
  },
} as const

export const Route = createFileRoute('/api/openapi/json')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const blockedResponse = enforceSameOrigin(request)
        if (blockedResponse) return blockedResponse
        const authResponse = await requireAdmin(request)
        if (authResponse) return authResponse

        return new Response(JSON.stringify(openApiSpec, null, 2), {
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
          },
        })
      },
      OPTIONS: ({ request }) => {
        const blockedResponse = enforceSameOrigin(request)
        if (blockedResponse) return blockedResponse
        return new Response(null, { status: 204 })
      },
    },
  },
})
