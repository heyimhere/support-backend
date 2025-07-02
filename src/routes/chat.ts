import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

import { db } from '../models/db';
import { conversationsTable } from '../models/schema';
import { 
  createApiResponse, 
  MessageRoleSchema,
  ConversationStepSchema,
} from '../types';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { processAIMessage } from '../services/aiService';

const router = Router();

// Request schemas
const SendMessageSchema = z.object({
  input: z.object({
    message: z.string().min(1, 'Message cannot be empty'),
    conversationId: z.string().uuid(),
    quickReply: z.boolean().default(false),
  }),
  conversationState: z.object({
    id: z.string().uuid(),
    currentStep: ConversationStepSchema,
    collectedData: z.object({
      userName: z.string().optional(),
      userEmail: z.string()
        .transform((val) => val?.trim().toLowerCase() || '')
        .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
          message: 'Invalid email format'
        })
        .optional(),
      issueDescription: z.string().optional(),
      issueTitle: z.string().optional(),
      suggestedCategory: z.string().optional(),
      confirmedCategory: z.string().optional(),
      additionalDetails: z.array(z.string()).default([]),
    }),
    messages: z.array(z.object({
      id: z.string(),
      role: MessageRoleSchema,
      content: z.string(),
      timestamp: z.string(),
      metadata: z.record(z.any()).optional(),
    })),
    isComplete: z.boolean().default(false),
    createdTicketId: z.string().uuid().optional(),
    startedAt: z.string(),
    completedAt: z.string().optional(),
  }).optional(),
});

// POST /api/chat/message - Process chat message with AI
router.post('/message', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = SendMessageSchema.parse(req.body);
  const { input, conversationState } = validatedData;
  
  // Get or create conversation from database
  let conversation = conversationState;
  
  if (!conversation) {
    // Try to get from database
    const dbConversation = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, input.conversationId))
      .limit(1);
    
    if (dbConversation.length === 0) {
      throw new ApiError('Conversation not found', 404);
    }
    
    conversation = {
      id: dbConversation[0].id,
      currentStep: dbConversation[0].currentStep as any,
      collectedData: dbConversation[0].collectedData as any,
      messages: dbConversation[0].messages as any,
      isComplete: dbConversation[0].isComplete,
      createdTicketId: dbConversation[0].createdTicketId || undefined,
      startedAt: dbConversation[0].startedAt.toISOString(),
      completedAt: dbConversation[0].completedAt?.toISOString(),
    };
  }
  
  // Add user message to conversation
  const userMessage = {
    id: uuidv4(),
    role: 'user' as const,
    content: input.message,
    timestamp: new Date().toISOString(),
  };
  
  const updatedMessages = [...conversation.messages, userMessage];
  
  // Process message with AI service
  const aiResult = await processAIMessage(input.message, {
    ...conversation,
    messages: updatedMessages,
  });
  
  // Add AI response to messages
  const aiMessage = {
    id: uuidv4(),
    role: 'assistant' as const,
    content: aiResult.assistantResponse.content,
    timestamp: new Date().toISOString(),
    metadata: {
      type: aiResult.assistantResponse.type,
      nextStep: aiResult.assistantResponse.nextStep,
      suggestions: aiResult.assistantResponse.suggestions,
    },
  };
  
  const finalMessages = [...updatedMessages, aiMessage];
  let updatedConversation = {
    ...aiResult.updatedConversation,
    messages: finalMessages,
  };

  // Auto-create ticket if conversation is complete
  if (updatedConversation.isComplete && !updatedConversation.createdTicketId) {
    try {
      const { ticketsTable } = await import('../models/schema');
      
      const ticketData = {
        id: uuidv4(),
        userName: updatedConversation.collectedData.userName!,
        userEmail: updatedConversation.collectedData.userEmail,
        title: updatedConversation.collectedData.issueTitle || 'Support Request',
        description: updatedConversation.collectedData.issueDescription!,
        category: updatedConversation.collectedData.confirmedCategory as any,
        priority: 'medium' as const,
        status: 'open' as const,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        conversationId: updatedConversation.id,
      };

      const insertedTicket = await db
        .insert(ticketsTable)
        .values(ticketData)
        .returning();

      // Update conversation with actual ticket ID
      updatedConversation = {
        ...updatedConversation,
        createdTicketId: insertedTicket[0].id,
      };

      // Update the AI response with the real ticket ID
      aiMessage.content = `✅ Great! Your support ticket has been created successfully.

**Ticket ID:** ${insertedTicket[0].id}
**Status:** Open
**Priority:** Medium

Our support team will review your ticket and get back to you soon. You can reference this ticket ID in any future communications.

Is there anything else I can help you with today?`;

      console.log(`🎫 Auto-created ticket: ${insertedTicket[0].id} for conversation: ${updatedConversation.id}`);
    } catch (ticketError) {
      console.error('Failed to auto-create ticket:', ticketError);
      // Update AI response with error message
      aiMessage.content = `❌ I apologize, but there was an issue creating your ticket. Please try again or contact support directly.

Error: Unable to create ticket at this time.`;
    }
  }
  
  // Save conversation to database
  const conversationData = {
    id: updatedConversation.id,
    currentStep: updatedConversation.currentStep,
    collectedData: updatedConversation.collectedData,
    messages: finalMessages,
    isComplete: updatedConversation.isComplete,
    createdTicketId: updatedConversation.createdTicketId,
    startedAt: new Date(updatedConversation.startedAt),
    completedAt: updatedConversation.completedAt ? new Date(updatedConversation.completedAt) : null,
  };
  
  // Update or insert conversation
  const existingConversation = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, updatedConversation.id))
    .limit(1);
  
  if (existingConversation.length > 0) {
    await db
      .update(conversationsTable)
      .set(conversationData)
      .where(eq(conversationsTable.id, updatedConversation.id));
  } else {
    await db
      .insert(conversationsTable)
      .values(conversationData);
  }
  
  res.json(createApiResponse(true, {
    assistantResponse: aiResult.assistantResponse,
    updatedConversation,
    suggestedCategory: aiResult.suggestedCategory,
  }));
}));

// GET /api/chat/conversations/:id - Get conversation by ID
router.get('/conversations/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!id) {
    throw new ApiError('Conversation ID is required', 400);
  }
  
  const conversation = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, id))
    .limit(1);
  
  if (conversation.length === 0) {
    throw new ApiError('Conversation not found', 404);
  }
  
  // Transform to match frontend expectations
  const transformedConversation = {
    id: conversation[0].id,
    currentStep: conversation[0].currentStep,
    collectedData: conversation[0].collectedData,
    messages: conversation[0].messages,
    isComplete: conversation[0].isComplete,
    createdTicketId: conversation[0].createdTicketId || undefined,
    startedAt: conversation[0].startedAt.toISOString(),
    completedAt: conversation[0].completedAt?.toISOString(),
  };
  
  res.json(createApiResponse(true, transformedConversation));
}));

export default router; 