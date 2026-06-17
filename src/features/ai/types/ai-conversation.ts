export interface AiMessageMetadata {
  action?: string
  ok?: boolean
  steps?: Array<{ action: string; success: boolean }>
}

export interface AiConversationSummary {
  id: number
  title: string
  isClosed: boolean
  createdAt: string
  updatedAt: string
}

export interface AiConversationMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  metadata: AiMessageMetadata | null
  createdAt: string
}

export interface AiConversationDetail {
  id: number
  title: string
  isClosed: boolean
  createdAt: string
  updatedAt: string
  messages: AiConversationMessage[]
}
