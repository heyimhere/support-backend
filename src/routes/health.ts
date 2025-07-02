import { Router, Request, Response } from 'express';
import { createApiResponse } from '../types';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// GET /api/health - Health check endpoint
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    environment: process.env.NODE_ENV || 'development'
  };

  res.json(createApiResponse(true, healthData, undefined, 'Service is healthy'));
}));

export default router; 