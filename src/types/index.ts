import { z } from 'zod';

// Import frontend-compatible types (matching your frontend exactly)

// Ticket Status Enum
export const TicketStatus = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress', 
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const;

export type TicketStatusType = typeof TicketStatus[keyof typeof TicketStatus];

// Ticket Priority Enum
export const TicketPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type TicketPriorityType = typeof TicketPriority[keyof typeof TicketPriority];

// Ticket Category Enum
export const TicketCategory = {
  TECHNICAL: 'technical',
  BILLING: 'billing', 
  ACCOUNT: 'account',
  FEATURE_REQUEST: 'feature_request',
  BUG_REPORT: 'bug_report',
  GENERAL: 'general',
  OTHER: 'other',
} as const;

export type TicketCategoryType = typeof TicketCategory[keyof typeof TicketCategory];

// Message Types
export const MessageRole = {
  USER: 'user',
  ASSISTANT: 'assistant', 
  SYSTEM: 'system',
} as const;

export type MessageRoleType = typeof MessageRole[keyof typeof MessageRole];

// Conversation Steps
export const ConversationStep = {
  GREETING: 'greeting',
  COLLECT_NAME: 'collect_name',
  COLLECT_ISSUE: 'collect_issue', 
  CLARIFY_DETAILS: 'clarify_details',
  SUGGEST_CATEGORY: 'suggest_category',
  CONFIRM_CATEGORY: 'confirm_category',
  FINAL_CONFIRMATION: 'final_confirmation',
  TICKET_CREATED: 'ticket_created',
  ERROR: 'error',
} as const;

export type ConversationStepType = typeof ConversationStep[keyof typeof ConversationStep];

// API Response Types (matching frontend expectations)
export const ApiErrorType = {
  VALIDATION_ERROR: 'validation_error',
  NOT_FOUND: 'not_found',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  INTERNAL_ERROR: 'internal_error',
  NETWORK_ERROR: 'network_error',
  TIMEOUT: 'timeout',
} as const;

export type ApiErrorTypeType = typeof ApiErrorType[keyof typeof ApiErrorType];

// Zod Schemas for validation (matching frontend schemas)
export const TicketStatusSchema = z.enum(['open', 'in_progress', 'resolved', 'closed']);
export const TicketPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export const TicketCategorySchema = z.enum(['technical', 'billing', 'account', 'feature_request', 'bug_report', 'general', 'other']);
export const MessageRoleSchema = z.enum(['user', 'assistant', 'system']);
export const ConversationStepSchema = z.enum(['greeting', 'collect_name', 'collect_issue', 'clarify_details', 'suggest_category', 'confirm_category', 'final_confirmation', 'ticket_created', 'error']);

// Message Schema
export const MessageSchema = z.object({
  id: z.string(),
  role: MessageRoleSchema,
  content: z.string(),
  timestamp: z.string(), // ISO string
  metadata: z.record(z.any()).optional(),
});

export type Message = z.infer<typeof MessageSchema>;

// API Response Schema
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  timestamp: z.date().default(() => new Date()),
});

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
};

// API Error Schema
export const ApiErrorSchema = z.object({
  type: z.enum(['validation_error', 'not_found', 'unauthorized', 'forbidden', 'internal_error', 'network_error', 'timeout']),
  message: z.string(),
  details: z.record(z.any()).optional(),
  code: z.string().optional(),
  timestamp: z.date().default(() => new Date()),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

// Pagination Schema
export const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  total: z.number().optional(),
  totalPages: z.number().optional(),
  hasNext: z.boolean().optional(),
  hasPrev: z.boolean().optional(),
});

export type Pagination = z.infer<typeof PaginationSchema>;

// WebSocket Message Types
export const WebSocketMessageType = {
  TICKET_CREATED: 'ticket_created',
  TICKET_UPDATED: 'ticket_updated',
  CONVERSATION_UPDATE: 'conversation_update', 
  TYPING_INDICATOR: 'typing_indicator',
  ERROR: 'error',
  PING: 'ping',
  PONG: 'pong',
} as const;

export type WebSocketMessageTypeType = typeof WebSocketMessageType[keyof typeof WebSocketMessageType];

// Helper functions
export const createApiResponse = <T>(
  success: boolean,
  data?: T,
  error?: string,
  message?: string
): ApiResponse<T> => ({
  success,
  data,
  error,
  message,
  timestamp: new Date(),
});

export const createApiError = (
  type: ApiErrorTypeType,
  message: string,
  details?: Record<string, any>,
  code?: string
): ApiError => ({
  type,
  message,
  details,
  code,
  timestamp: new Date(),
}); 