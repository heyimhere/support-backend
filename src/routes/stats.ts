import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { sql, eq, and, gte, lte } from 'drizzle-orm';

import { db } from '../models/db';
import { ticketsTable } from '../models/schema';
import { 
  createApiResponse,
} from '../types';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Request schema for stats filtering
const GetStatsQuerySchema = z.object({
  dateFrom: z.string().optional().transform(str => str ? new Date(str) : undefined),
  dateTo: z.string().optional().transform(str => str ? new Date(str) : undefined),
  status: z.string().optional(),
  category: z.string().optional(),
  priority: z.string().optional(),
});

// GET /api/stats/tickets - Get comprehensive ticket statistics
router.get('/tickets', asyncHandler(async (req: Request, res: Response) => {
  const query = GetStatsQuerySchema.parse(req.query);
  
  // Build where conditions for filtering
  const conditions = [];
  
  if (query.dateFrom) {
    conditions.push(gte(ticketsTable.createdAt, query.dateFrom));
  }
  
  if (query.dateTo) {
    conditions.push(lte(ticketsTable.createdAt, query.dateTo));
  }
  
  if (query.status) {
    conditions.push(eq(ticketsTable.status, query.status));
  }
  
  if (query.category) {
    conditions.push(eq(ticketsTable.category, query.category));
  }
  
  if (query.priority) {
    conditions.push(eq(ticketsTable.priority, query.priority));
  }
  
  const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
  
  // Get total ticket count
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(ticketsTable)
    .where(whereCondition);
  
  const totalTickets = totalResult[0].count;
  
  // Get tickets by status
  const statusStats = await db
    .select({
      status: ticketsTable.status,
      count: sql<number>`count(*)`
    })
    .from(ticketsTable)
    .where(whereCondition)
    .groupBy(ticketsTable.status);
  
  // Get tickets by category
  const categoryStats = await db
    .select({
      category: ticketsTable.category,
      count: sql<number>`count(*)`
    })
    .from(ticketsTable)
    .where(whereCondition)
    .groupBy(ticketsTable.category);
  
  // Get tickets by priority
  const priorityStats = await db
    .select({
      priority: ticketsTable.priority,
      count: sql<number>`count(*)`
    })
    .from(ticketsTable)
    .where(whereCondition)
    .groupBy(ticketsTable.priority);
  
  // Calculate resolution time for resolved tickets
  const resolutionTimeResult = await db
    .select({
      avgResolutionTime: sql<number>`AVG((julianday(resolved_at) - julianday(created_at)) * 24)`
    })
    .from(ticketsTable)
    .where(
      whereCondition 
        ? and(whereCondition, eq(ticketsTable.status, 'resolved'))
        : eq(ticketsTable.status, 'resolved')
    );
  
  // Transform results to match frontend expectations
  const byStatus = {
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
  };
  
  statusStats.forEach(stat => {
    byStatus[stat.status as keyof typeof byStatus] = stat.count;
  });
  
  const byCategory: Record<string, number> = {};
  categoryStats.forEach(stat => {
    byCategory[stat.category] = stat.count;
  });
  
  const byPriority: Record<string, number> = {};
  priorityStats.forEach(stat => {
    byPriority[stat.priority] = stat.count;
  });
  
  const stats = {
    totalTickets,
    openTickets: byStatus.open,
    inProgressTickets: byStatus.in_progress,
    resolvedTickets: byStatus.resolved,
    closedTickets: byStatus.closed,
    byCategory,
    byPriority,
    averageResolutionTime: resolutionTimeResult[0].avgResolutionTime || 0,
  };
  
  res.json(createApiResponse(true, stats));
}));

// GET /api/stats/dashboard - Get real-time dashboard metrics
router.get('/dashboard', asyncHandler(async (req: Request, res: Response) => {
  // Get recent activity (last 24 hours)
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const recentActivity = await db
    .select({
      hour: sql<string>`strftime('%H', created_at)`,
      count: sql<number>`count(*)`
    })
    .from(ticketsTable)
    .where(gte(ticketsTable.createdAt, last24Hours))
    .groupBy(sql`strftime('%H', created_at)`)
    .orderBy(sql`strftime('%H', created_at)`);
  
  // Get urgent tickets count
  const urgentTicketsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(ticketsTable)
    .where(
      and(
        eq(ticketsTable.priority, 'urgent'),
        eq(ticketsTable.status, 'open')
      )
    );
  
  const urgentTickets = urgentTicketsResult[0].count;
  
  // Get tickets created today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayTicketsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(ticketsTable)
    .where(gte(ticketsTable.createdAt, today));
  
  const todayTickets = todayTicketsResult[0].count;
  
  // Get average response time (mock for now)
  const dashboardMetrics = {
    urgentTickets,
    todayTickets,
    averageResponseTime: 2.5, // hours (mock data)
    recentActivity: recentActivity.map(activity => ({
      hour: parseInt(activity.hour),
      tickets: activity.count,
    })),
    trends: {
      ticketsThisWeek: todayTickets * 7, // approximation
      ticketsLastWeek: todayTickets * 6, // approximation for trend
      resolutionRate: 85, // percentage (mock)
      customerSatisfaction: 4.2, // out of 5 (mock)
    }
  };
  
  res.json(createApiResponse(true, dashboardMetrics));
}));

export default router; 