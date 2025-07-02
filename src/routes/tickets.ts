import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm';

import { db } from '../models/db';
import { ticketsTable } from '../models/schema';
import { 
  createApiResponse, 
  TicketStatusSchema, 
  TicketPrioritySchema, 
  TicketCategorySchema,
  PaginationSchema
} from '../types';
import { asyncHandler, ApiError } from '../middleware/errorHandler';

const router = Router();

// Request/Response schemas for validation
const CreateTicketSchema = z.object({
  ticket: z.object({
    userName: z.string().min(1, 'User name is required'),
    userEmail: z.string().email('Valid email required').optional(),
    title: z.string().min(5, 'Title must be at least 5 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    category: TicketCategorySchema,
    priority: TicketPrioritySchema.default('medium'),
    tags: z.array(z.string()).default([]),
  }),
  conversationId: z.string().uuid().optional(),
});

const UpdateTicketSchema = z.object({
  status: TicketStatusSchema.optional(),
  priority: TicketPrioritySchema.optional(),
  assignedTo: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const GetTicketsQuerySchema = z.object({
  // Filters
  status: z.string().optional(),
  category: z.string().optional(), 
  priority: z.string().optional(),
  assignedTo: z.string().optional(),
  searchQuery: z.string().optional(),
  
  // Pagination
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  
  // Sorting
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// GET /api/tickets - List tickets with filtering and pagination
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const query = GetTicketsQuerySchema.parse(req.query);
  
  // Build where conditions
  const conditions = [];
  
  if (query.status) {
    const statuses = query.status.split(',');
    conditions.push(inArray(ticketsTable.status, statuses));
  }
  
  if (query.category) {
    const categories = query.category.split(',');
    conditions.push(inArray(ticketsTable.category, categories));
  }
  
  if (query.priority) {
    const priorities = query.priority.split(',');
    conditions.push(inArray(ticketsTable.priority, priorities));
  }
  
  if (query.assignedTo) {
    conditions.push(eq(ticketsTable.assignedTo, query.assignedTo));
  }
  
  if (query.searchQuery) {
    conditions.push(
      sql`(${ticketsTable.title} LIKE ${'%' + query.searchQuery + '%'} OR ${ticketsTable.description} LIKE ${'%' + query.searchQuery + '%'})`
    );
  }
  
  // Build ORDER BY
  const orderColumnMap = {
    createdAt: ticketsTable.createdAt,
    updatedAt: ticketsTable.updatedAt,
    priority: ticketsTable.priority,
    status: ticketsTable.status,
  };
  const orderColumn = orderColumnMap[query.sortBy];
  const orderDirection = query.sortOrder === 'asc' ? asc : desc;
  
  // Get total count for pagination
  const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(ticketsTable)
    .where(whereCondition);
  
  const total = totalResult[0].count;
  const totalPages = Math.ceil(total / query.limit);
  const offset = (query.page - 1) * query.limit;
  
  // Get tickets
  const tickets = await db
    .select()
    .from(ticketsTable)
    .where(whereCondition)
    .orderBy(orderDirection(orderColumn))
    .limit(query.limit)
    .offset(offset);
  
  // Transform dates to ISO strings for JSON response
  const transformedTickets = tickets.map(ticket => ({
    ...ticket,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    resolvedAt: ticket.resolvedAt?.toISOString(),
  }));
  
  const pagination = {
    page: query.page,
    limit: query.limit,
    total,
    totalPages,
    hasNext: query.page < totalPages,
    hasPrev: query.page > 1,
  };
  
  res.json(createApiResponse(true, {
    data: transformedTickets,
    pagination
  }));
}));

// GET /api/tickets/:id - Get single ticket
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!id) {
    throw new ApiError('Ticket ID is required', 400);
  }
  
  const ticket = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.id, id))
    .limit(1);
  
  if (ticket.length === 0) {
    throw new ApiError('Ticket not found', 404);
  }
  
  // Transform dates to ISO strings
  const transformedTicket = {
    ...ticket[0],
    createdAt: ticket[0].createdAt.toISOString(),
    updatedAt: ticket[0].updatedAt.toISOString(),
    resolvedAt: ticket[0].resolvedAt?.toISOString(),
  };
  
  res.json(createApiResponse(true, transformedTicket));
}));

// POST /api/tickets - Create new ticket
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = CreateTicketSchema.parse(req.body);
  const { ticket: ticketData, conversationId } = validatedData;
  
  const newTicket = {
    id: uuidv4(),
    ...ticketData,
    status: 'open' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    conversationId,
  };
  
  const insertedTicket = await db
    .insert(ticketsTable)
    .values(newTicket)
    .returning();
  
  // Transform dates to ISO strings
  const transformedTicket = {
    ...insertedTicket[0],
    createdAt: insertedTicket[0].createdAt.toISOString(),
    updatedAt: insertedTicket[0].updatedAt.toISOString(),
    resolvedAt: insertedTicket[0].resolvedAt?.toISOString(),
  };
  
  res.status(201).json(createApiResponse(true, transformedTicket, undefined, 'Ticket created successfully'));
}));

// PATCH /api/tickets/:id - Update ticket
router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = UpdateTicketSchema.parse(req.body);
  
  if (!id) {
    throw new ApiError('Ticket ID is required', 400);
  }
  
  // Check if ticket exists
  const existingTicket = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.id, id))
    .limit(1);
  
  if (existingTicket.length === 0) {
    throw new ApiError('Ticket not found', 404);
  }
  
  // Prepare update data
  const updateData = {
    ...updates,
    updatedAt: new Date(),
    // Set resolvedAt if status is being changed to resolved
    ...(updates.status === 'resolved' && existingTicket[0].status !== 'resolved' && {
      resolvedAt: new Date()
    }),
  };
  
  const updatedTicket = await db
    .update(ticketsTable)
    .set(updateData)
    .where(eq(ticketsTable.id, id))
    .returning();
  
  // Transform dates to ISO strings
  const transformedTicket = {
    ...updatedTicket[0],
    createdAt: updatedTicket[0].createdAt.toISOString(),
    updatedAt: updatedTicket[0].updatedAt.toISOString(),
    resolvedAt: updatedTicket[0].resolvedAt?.toISOString(),
  };
  
  res.json(createApiResponse(true, transformedTicket, undefined, 'Ticket updated successfully'));
}));

export default router;
