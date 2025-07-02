import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { runMigrations } from './models/db';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger';

// Import routes
import ticketRoutes from './routes/tickets';
import chatRoutes from './routes/chat';
import statsRoutes from './routes/stats';
import healthRoutes from './routes/health';

// Import WebSocket setup
import { setupWebSocket } from './websocket/socketHandler';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// Create Express app
const app = express();

// Create HTTP server and Socket.IO
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST']
  }
});

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false // Allow embedding for development
}));

// CORS configuration
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    timestamp: new Date()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Health check endpoint (before rate limiting)
app.use('/api/health', healthRoutes);

// API routes
app.use('/api/tickets', ticketRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/stats', statsRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Setup WebSocket handling
setupWebSocket(io);

// Start server
const startServer = async () => {
  try {
    // Run database migrations
    console.log('🔄 Running database migrations...');
    runMigrations();
    
    // Start server
    server.listen(PORT, () => {
      console.log(`Support API Server running on port ${PORT}`);
      console.log(`WebSocket server ready`);
      console.log(`CORS enabled for: ${CORS_ORIGIN}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
      console.log(`Available endpoints:`);
      console.log(`   GET    /api/tickets`);
      console.log(`   POST   /api/tickets`);
      console.log(`   GET    /api/tickets/:id`);
      console.log(`   PATCH  /api/tickets/:id`);
      console.log(`   POST   /api/chat/message`);
      console.log(`   GET    /api/chat/conversations/:id`);
      console.log(`   GET    /api/stats/tickets`);
      console.log(`   GET    /api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🔄 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🔄 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();

export { io };
