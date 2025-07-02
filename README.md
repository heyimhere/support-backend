# AI Support System - Backend API

A robust, production-ready backend API built with **Node.js**, **Express**, **TypeScript**, and **SQLite/Drizzle ORM**. This system provides intelligent chat processing, real-time WebSocket communication, and comprehensive ticket management for the AI-powered support platform.

## Features Overview

### **AI-Powered Chat Processing**
- **Rule-Based Intelligence**: Sophisticated conversation logic without requiring LLM APIs
- **Smart Category Detection**: Advanced keyword pattern matching across 5+ categories
- **Natural Language Processing**: Handles varied user inputs with intelligent parsing
- **Input Sanitization**: Comprehensive validation and filtering for security
- **Conversation State Management**: Tracks 8-step conversation flow with persistence
- **Auto-Ticket Creation**: Seamlessly converts completed conversations to tickets
- **Multi-Language Ready**: Extensible pattern matching system

### **Comprehensive API Endpoints**
- **Ticket Management**: Full CRUD operations with advanced filtering
- **Chat Processing**: Real-time message handling with state persistence
- **Statistics API**: Live metrics and analytics for dashboard consumption
- **Health Monitoring**: System health checks with detailed diagnostics
- **RESTful Design**: Clean, consistent API architecture
- **Pagination Support**: Efficient data handling for large datasets
- **Sorting & Filtering**: Multiple sort options and complex filter combinations

### **Real-time WebSocket Features**
- **Socket.IO Integration**: Robust WebSocket communication
- **User Rooms**: Organized real-time communication channels
- **Event Broadcasting**: Live updates for ticket changes and system events
- **Connection Management**: Auto-reconnect and connection status tracking
- **User Type Detection**: Support for different user roles (end-user, support)
- **Event Persistence**: Reliable message delivery and state synchronization

### **Database & Data Management**
- **SQLite with Drizzle ORM**: Type-safe database operations
- **Migration System**: Automated database schema management
- **Relational Design**: Properly normalized tables with foreign key constraints
- **Transaction Support**: ACID-compliant operations for data integrity
- **Performance Optimized**: Indexed queries and efficient data retrieval
- **Backup Ready**: Easy database backup and restore capabilities

### **Security & Validation**
- **Zod Validation**: Runtime type checking and input validation
- **CORS Configuration**: Secure cross-origin resource sharing
- **Input Sanitization**: XSS and injection attack prevention
- **Error Handling**: Comprehensive error management with secure error messages
- **Rate Limiting Ready**: Extensible middleware for API protection
- **Environment Security**: Secure environment variable management

### **Production Features**
- **Comprehensive Logging**: Detailed request/response logging with metrics
- **Error Handling**: Graceful error recovery with detailed diagnostics
- **Performance Monitoring**: Response time tracking and performance metrics
- **Health Checks**: System status endpoints for monitoring
- **Environment Management**: Multi-environment configuration support
- **Docker Ready**: Containerization support for deployment

## **Technical Architecture**

### **Backend Stack**
- **Node.js 18+** - JavaScript runtime
- **Express.js** - Web application framework
- **TypeScript** - Type-safe JavaScript development
- **SQLite** - Lightweight, embedded database
- **Drizzle ORM** - Type-safe SQL toolkit
- **Socket.IO** - Real-time WebSocket communication
- **Zod** - Runtime type validation
- **Dotenv** - Environment variable management
- **UUID** - Unique identifier generation

### **Project Structure**
```
src/
├── routes/              # API endpoint definitions
│   ├── chat.ts         # Chat processing endpoints
│   ├── tickets.ts      # Ticket CRUD operations
│   ├── stats.ts        # Statistics and analytics
│   └── health.ts       # Health check endpoints
├── services/            # Business logic layer
│   └── aiService.ts    # AI conversation processing
├── models/              # Database layer
│   ├── db.ts           # Database connection and setup
│   └── schema.ts       # Drizzle table definitions
├── websocket/           # Real-time communication
│   └── socketHandler.ts # WebSocket event management
├── middleware/          # Express middleware
│   ├── errorHandler.ts # Global error handling
│   └── logger.ts       # Request/response logging
├── types/               # TypeScript definitions
│   └── index.ts        # Shared type definitions
└── server.ts            # Application entry point
```

### **Database Schema**
```sql
-- Tickets table
CREATE TABLE tickets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  category TEXT NOT NULL,
  user_name TEXT,
  user_email TEXT,
  conversation_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Conversations table
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Support Technicians table
CREATE TABLE support_technicians (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'technician',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

## **Getting Started**

### Prerequisites
- **Node.js 18+**
- **npm** or **yarn**

### Quick Setup

1. **Clone and navigate to backend**
   ```bash
   git clone <repository-url>
   cd support-backend
   ```

2. **Run automated setup**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

### Manual Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database setup**
   ```bash
   npm run db:generate  # Generate migrations
   npm run db:migrate   # Run migrations
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Verify installation**
   ```bash
   curl http://localhost:3001/api/health
   ```

### Available Scripts

```bash
# Development
npm run dev          # Start development server with nodemon
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler

# Database
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Run database migrations
npm run db:push      # Push schema changes to database
npm run db:studio    # Open Drizzle Studio (database GUI)
```

## **API Endpoints**

### **Chat Processing**
```bash
# Send chat message and process conversation
POST /api/chat/message
Content-Type: application/json
{
  "input": {
    "message": "I need help with my account",
    "conversationId": "uuid",
    "quickReply": false
  },
  "conversationState": { ... }
}

# Get conversation by ID
GET /api/chat/conversations/:id
```

### **Ticket Management**
```bash
# Get all tickets (with filtering, sorting, pagination)
GET /api/tickets?page=1&limit=20&status=open&priority=high&sortBy=createdAt&sortOrder=desc

# Create new ticket
POST /api/tickets
Content-Type: application/json
{
  "ticket": {
    "title": "Account Access Issue",
    "description": "Cannot log into my account",
    "category": "account",
    "priority": "high",
    "user_name": "John Doe",
    "user_email": "john@example.com"
  },
  "conversationId": "uuid"
}

# Get specific ticket
GET /api/tickets/:id

# Update ticket
PATCH /api/tickets/:id
Content-Type: application/json
{
  "status": "in_progress",
  "priority": "urgent"
}
```

### **Statistics & Analytics**
```bash
# Get ticket statistics
GET /api/stats/tickets?status=open&timeframe=week

# Response format:
{
  "data": {
    "totalTickets": 150,
    "openTickets": 45,
    "inProgressTickets": 23,
    "resolvedTickets": 82,
    "urgentTickets": 8,
    "responseTime": { "average": 2.5, "unit": "hours" },
    "resolutionTime": { "average": 24, "unit": "hours" },
    "satisfactionScore": 4.2
  }
}
```

### **System Health**
```bash
# Health check endpoint
GET /api/health

# Response includes:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": "connected",
  "websocket": "active",
  "uptime": "2h 15m",
  "version": "1.0.0"
}
```

## **AI Chat Processing Logic**

### **Conversation Flow (8 Steps)**
1. **GREETING** - Welcome message and process explanation
2. **COLLECT_ISSUE** - Gather problem description
3. **CLARIFY_DETAILS** - Ask follow-up questions
4. **SUGGEST_CATEGORY** - AI categorizes the issue
5. **CONFIRM_CATEGORY** - User confirms or corrects category
6. **COLLECT_EMAIL** - Gather contact information
7. **FINAL_CONFIRMATION** - Review and confirm all details
8. **TICKET_CREATED** - Auto-create ticket and provide confirmation

### **Smart Category Detection**
The AI service uses sophisticated pattern matching across multiple categories:

```typescript
// Technical Issues
patterns: [
  /bug|error|crash|broken|not working|issue/i,
  /website|app|software|system/i,
  /load|slow|performance|timeout/i
]

// Billing Issues
patterns: [
  /bill|billing|payment|charge|invoice/i,
  /subscription|plan|upgrade|downgrade/i,
  /refund|money|cost|price/i
]

// Account Issues
patterns: [
  /account|login|password|access/i,
  /profile|settings|preferences/i,
  /forgot|reset|locked|suspended/i
]
```

### **Input Validation & Sanitization**
- **Email Validation**: RFC-compliant email regex
- **Name Extraction**: Smart parsing from natural language
- **Length Limits**: Configurable input length restrictions
- **XSS Prevention**: HTML tag stripping and encoding
- **SQL Injection Protection**: Parameterized queries via Drizzle ORM

## **WebSocket Events**

### **Client → Server Events**
```javascript
// Join user room
socket.emit('join', { 
  userType: 'support',  // or 'end-user'
  userId: 'unique-id' 
});

// Send message
socket.emit('message', {
  room: 'support',
  message: 'Hello world',
  type: 'chat'
});
```

### **Server → Client Events**
```javascript
// Ticket updates
socket.on('ticket_updated', (data) => {
  console.log('Ticket updated:', data.ticketId);
});

// New ticket created
socket.on('ticket_created', (data) => {
  console.log('New ticket:', data.ticket);
});

// System events
socket.on('user_joined', (data) => {
  console.log('User joined:', data.userId);
});
```

## **Environment Configuration**

### **Environment Variables**

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Application environment | `development` | No |
| `PORT` | Server port | `3001` | No |
| `DATABASE_URL` | Database connection string | `sqlite:./dev.db` | No |
| `CORS_ORIGIN` | Frontend URL for CORS | `http://localhost:3000` | No |
| `JWT_SECRET` | JWT signing secret | - | No* |
| `OPENAI_API_KEY` | OpenAI API key | - | No* |
| `EMAIL_SERVICE_KEY` | Email service API key | - | No* |

*Optional: The system works fully without LLM APIs

### **Example .env Configuration**
```bash
# Server Configuration
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=sqlite:./dev.db

# CORS
CORS_ORIGIN=http://localhost:3000

# Optional: Advanced Features
# JWT_SECRET=your-super-secure-jwt-secret
# OPENAI_API_KEY=sk-your-openai-api-key
# EMAIL_SERVICE_KEY=your-email-service-key
```

## **Monitoring & Observability**

### **Request Logging**
Every API request is logged with:
- HTTP method and endpoint
- Response status and time
- Request size and user agent
- Client IP address
- Response payload size

```bash
 POST /api/chat/message - ::1 - 2024-01-15T10:30:00.000Z
 POST /api/chat/message - 200 - 6ms - ::1
 Response: 1205 bytes | User-Agent: Mozilla/5.0...
```

### **Database Operations**
```bash
Auto-created ticket: af0217d1-8d52-4b6d-8fb9-79d554ab4b49
Running database migrations...
Database migrations completed successfully
```

### **WebSocket Activity**
```bash
User connected: eKvEhL4tJpGquKqcAAAE
User support-dashboard joined as support
User disconnected: eKvEhL4tJpGquKqcAAAE
```

## **Integration with Frontend**

This backend is designed to work seamlessly with the support-frontend repository:

### **API Client Integration**
- **Base URL**: `http://localhost:3001/api`
- **WebSocket**: `http://localhost:3001`
- **CORS**: Configured for `http://localhost:3000`
- **Error Handling**: Consistent error response format

### **Real-time Features**
- **Socket.IO**: Bidirectional communication
- **Event Broadcasting**: Live ticket updates
- **Connection Status**: Real-time connection monitoring

### **Data Synchronization**
- **Type Safety**: Shared TypeScript definitions
- **Validation**: Zod schemas for API contracts
- **State Management**: Conversation state persistence

## **API Documentation**

### **Response Format**
All API responses follow a consistent format:

```typescript
// Success Response
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-15T10:30:00.000Z"
}

// Error Response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input provided",
    "details": { ... }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### **Error Codes**
- `VALIDATION_ERROR` - Input validation failed
- `NOT_FOUND` - Resource not found
- `DATABASE_ERROR` - Database operation failed
- `WEBSOCKET_ERROR` - WebSocket connection issue
- `INTERNAL_ERROR` - Unexpected server error

## **Future Enhancements**

### **Planned Features**
- [ ] **Authentication System**: JWT-based user authentication
- [ ] **Real LLM Integration**: OpenAI/Anthropic API support
- [ ] **Email Notifications**: Automated email sending
- [ ] **File Uploads**: Attachment support for tickets
- [ ] **Advanced Analytics**: Detailed reporting and metrics
- [ ] **Multi-tenant Support**: Organization-based isolation
- [ ] **API Rate Limiting**: Protection against abuse
- [ ] **Caching Layer**: Redis integration for performance
- [ ] **Message Queue**: Bull/Redis for background jobs
- [ ] **Audit Logging**: Comprehensive audit trail

### **Scalability Improvements**
- [ ] **Database Sharding**: Horizontal scaling support
- [ ] **Load Balancing**: Multi-instance deployment
- [ ] **CDN Integration**: Static asset optimization
- [ ] **Microservices**: Service decomposition for scale

---

**Related Repositories:**
- [Frontend Repository](https://github.com/heyimhere/support-frontend) - Next.js UI application
- [Documentation](https://github.com/heyimhere/support-frontend/blob/main/ENV_SETUP.md) - Environment setup guide

**Need Help?**
Check the health endpoint at `http://localhost:3001/api/health` to verify your installation. 
