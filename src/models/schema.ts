import { sql } from 'drizzle-orm';
import { text, integer, sqliteTable, index } from 'drizzle-orm/sqlite-core';

// Tickets table - matches frontend Ticket type exactly
export const ticketsTable = sqliteTable(
  'tickets',
  {
    id: text('id').primaryKey(),
    userName: text('user_name').notNull(),
    userEmail: text('user_email'),
    title: text('title').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull(), // 'technical', 'billing', 'account', etc.
    status: text('status').notNull().default('open'), // 'open', 'in_progress', 'resolved', 'closed'
    priority: text('priority').notNull().default('medium'), // 'low', 'medium', 'high', 'urgent'
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
    assignedTo: text('assigned_to'), // Support tech ID
    tags: text('tags', { mode: 'json' }).$type<string[]>().default([]), // JSON array of strings
    conversationId: text('conversation_id'), // Link to chat conversation
  },
  (table) => ({
    statusIdx: index('status_idx').on(table.status),
    categoryIdx: index('category_idx').on(table.category),
    priorityIdx: index('priority_idx').on(table.priority),
    createdAtIdx: index('created_at_idx').on(table.createdAt),
    conversationIdIdx: index('conversation_id_idx').on(table.conversationId),
  })
);

// Conversations table - matches frontend ConversationState type exactly
export const conversationsTable = sqliteTable(
  'conversations',
  {
    id: text('id').primaryKey(),
    currentStep: text('current_step').notNull(), // 'greeting', 'collect_name', etc.
    collectedData: text('collected_data', { mode: 'json' }).$type<{
      userName?: string;
      userEmail?: string;
      issueDescription?: string;
      issueTitle?: string;
      suggestedCategory?: string;
      confirmedCategory?: string;
      additionalDetails?: string[];
    }>().notNull().default({}),
    messages: text('messages', { mode: 'json' }).$type<Array<{
      id: string;
      role: 'user' | 'assistant' | 'system';
      content: string;
      timestamp: string; // ISO string
      metadata?: Record<string, any>;
    }>>().notNull().default([]),
    isComplete: integer('is_complete', { mode: 'boolean' }).notNull().default(false),
    createdTicketId: text('created_ticket_id'),
    startedAt: integer('started_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
  },
  (table) => ({
    currentStepIdx: index('current_step_idx').on(table.currentStep),
    isCompleteIdx: index('is_complete_idx').on(table.isComplete),
    startedAtIdx: index('started_at_idx').on(table.startedAt),
  })
);

// Support technicians table (for future use)
export const supportTechsTable = sqliteTable(
  'support_techs',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  }
);

// Type exports for use in the application
export type SelectTicket = typeof ticketsTable.$inferSelect;
export type InsertTicket = typeof ticketsTable.$inferInsert;
export type SelectConversation = typeof conversationsTable.$inferSelect;
export type InsertConversation = typeof conversationsTable.$inferInsert;
export type SelectSupportTech = typeof supportTechsTable.$inferSelect;
export type InsertSupportTech = typeof supportTechsTable.$inferInsert; 