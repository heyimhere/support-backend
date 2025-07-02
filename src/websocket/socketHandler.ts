import { Server as SocketIOServer, Socket } from 'socket.io';
import { 
  WebSocketMessageType, 
  createApiResponse 
} from '../types';

interface ConnectedUser {
  id: string;
  type: 'user' | 'support';
  joinedAt: Date;
  lastActivity: Date;
}

// Store connected users
const connectedUsers = new Map<string, ConnectedUser>();

// Setup WebSocket event handlers
export function setupWebSocket(io: SocketIOServer): void {
  console.log('🔌 Setting up WebSocket handlers...');

  io.on('connection', (socket: Socket) => {
    console.log(`🟢 User connected: ${socket.id}`);

    // Handle user joining
    socket.on('join', (data: { type: 'user' | 'support'; userId?: string }) => {
      const user: ConnectedUser = {
        id: data.userId || socket.id,
        type: data.type || 'user',
        joinedAt: new Date(),
        lastActivity: new Date(),
      };

      connectedUsers.set(socket.id, user);
      socket.join(data.type === 'support' ? 'support-room' : 'user-room');

      console.log(`👤 User ${user.id} joined as ${user.type}`);

      // Send connection confirmation
      socket.emit('connection-confirmed', createApiResponse(true, {
        userId: user.id,
        type: user.type,
        connectedUsers: connectedUsers.size,
      }));

      // Notify support room about new connections
      if (data.type === 'user') {
        socket.to('support-room').emit('user-connected', {
          type: WebSocketMessageType.CONVERSATION_UPDATE,
          data: {
            userId: user.id,
            status: 'connected',
            timestamp: new Date().toISOString(),
          }
        });
      }
    });

    // Handle typing indicators
    socket.on('typing-start', (data: { conversationId: string; userName?: string }) => {
      updateUserActivity(socket.id);
      
      socket.broadcast.emit('typing-indicator', {
        type: WebSocketMessageType.TYPING_INDICATOR,
        data: {
          conversationId: data.conversationId,
          userName: data.userName || 'User',
          isTyping: true,
          timestamp: new Date().toISOString(),
        }
      });
    });

    socket.on('typing-stop', (data: { conversationId: string }) => {
      updateUserActivity(socket.id);
      
      socket.broadcast.emit('typing-indicator', {
        type: WebSocketMessageType.TYPING_INDICATOR,
        data: {
          conversationId: data.conversationId,
          isTyping: false,
          timestamp: new Date().toISOString(),
        }
      });
    });

    // Handle ticket creation broadcast
    socket.on('ticket-created', (data: { ticket: any; conversationId?: string }) => {
      updateUserActivity(socket.id);
      
      // Broadcast to support room
      io.to('support-room').emit('ticket-created', {
        type: WebSocketMessageType.TICKET_CREATED,
        data: {
          ticket: data.ticket,
          conversationId: data.conversationId,
          timestamp: new Date().toISOString(),
        }
      });

      console.log(`🎫 New ticket created: ${data.ticket.id}`);
    });

    // Handle ticket updates
    socket.on('ticket-updated', (data: { ticketId: string; updates: any; updatedBy?: string }) => {
      updateUserActivity(socket.id);
      
      // Broadcast to both user and support rooms
      io.emit('ticket-updated', {
        type: WebSocketMessageType.TICKET_UPDATED,
        data: {
          ticketId: data.ticketId,
          updates: data.updates,
          updatedBy: data.updatedBy,
          timestamp: new Date().toISOString(),
        }
      });

      console.log(`📝 Ticket updated: ${data.ticketId}`);
    });

    // Handle conversation updates
    socket.on('conversation-update', (data: { conversationId: string; step: string; progress: number }) => {
      updateUserActivity(socket.id);
      
      // Broadcast to support room for monitoring
      socket.to('support-room').emit('conversation-update', {
        type: WebSocketMessageType.CONVERSATION_UPDATE,
        data: {
          conversationId: data.conversationId,
          step: data.step,
          progress: data.progress,
          timestamp: new Date().toISOString(),
        }
      });
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      updateUserActivity(socket.id);
      socket.emit('pong', {
        type: WebSocketMessageType.PONG,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        console.log(`🔴 User disconnected: ${user.id} (${reason})`);
        
        // Notify support room about user disconnection
        if (user.type === 'user') {
          socket.to('support-room').emit('user-disconnected', {
            type: WebSocketMessageType.CONVERSATION_UPDATE,
            data: {
              userId: user.id,
              status: 'disconnected',
              reason,
              timestamp: new Date().toISOString(),
            }
          });
        }

        connectedUsers.delete(socket.id);
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error);
      socket.emit('error', {
        type: WebSocketMessageType.ERROR,
        data: {
          message: 'Connection error occurred',
          timestamp: new Date().toISOString(),
        }
      });
    });
  });

  // Broadcast server stats periodically to support room
  setInterval(() => {
    broadcastServerStats(io);
  }, 30000); // Every 30 seconds

  console.log('✅ WebSocket handlers setup complete');
}

// Helper function to update user activity
function updateUserActivity(socketId: string): void {
  const user = connectedUsers.get(socketId);
  if (user) {
    user.lastActivity = new Date();
  }
}

// Broadcast server statistics to support room
function broadcastServerStats(io: SocketIOServer): void {
  const stats = {
    connectedUsers: connectedUsers.size,
    activeUsers: Array.from(connectedUsers.values()).filter(
      user => Date.now() - user.lastActivity.getTime() < 5 * 60 * 1000 // Active in last 5 minutes
    ).length,
    supportAgents: Array.from(connectedUsers.values()).filter(
      user => user.type === 'support'
    ).length,
    timestamp: new Date().toISOString(),
  };

  io.to('support-room').emit('server-stats', {
    type: 'server_stats',
    data: stats,
  });
}

// Utility functions for external use
export function broadcastTicketCreated(io: SocketIOServer, ticket: any, conversationId?: string): void {
  io.to('support-room').emit('ticket-created', {
    type: WebSocketMessageType.TICKET_CREATED,
    data: {
      ticket,
      conversationId,
      timestamp: new Date().toISOString(),
    }
  });
}

export function broadcastTicketUpdated(io: SocketIOServer, ticketId: string, updates: any, updatedBy?: string): void {
  io.emit('ticket-updated', {
    type: WebSocketMessageType.TICKET_UPDATED,
    data: {
      ticketId,
      updates,
      updatedBy,
      timestamp: new Date().toISOString(),
    }
  });
}

export function getConnectedUsersCount(): number {
  return connectedUsers.size;
}

export function getActiveUsersCount(): number {
  return Array.from(connectedUsers.values()).filter(
    user => Date.now() - user.lastActivity.getTime() < 5 * 60 * 1000
  ).length;
} 