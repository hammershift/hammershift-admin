import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { OrderBookSnapshot } from '../orderbook/matcher';

/**
 * WebSocket server for real-time order book updates
 *
 * Events emitted:
 * - orderBook:update - when order book changes
 * - order:matched - when trade executes
 * - order:cancelled - when order is cancelled
 * - market:resolved - when market resolves
 *
 * Rooms:
 * - market:{marketId} - per-market subscriptions
 */

let io: SocketIOServer | null = null;

// Rate limiting: max 50 markets per user
const userMarketSubscriptions = new Map<string, Set<string>>();
const MAX_MARKETS_PER_USER = 50;

export interface OrderMatchedEvent {
  marketId: string;
  orderId: string;
  side: 'BUY' | 'SELL';
  outcome: 'YES' | 'NO';
  price: number;
  size: number;
  timestamp: Date;
}

export interface OrderCancelledEvent {
  marketId: string;
  orderId: string;
  userId: string;
}

export interface MarketResolvedEvent {
  marketId: string;
  winningOutcome: 'YES' | 'NO';
  hammerPrice: number;
  resolvedAt: Date;
}

/**
 * Initialize Socket.IO server
 */
export function initializeOrderBookServer(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(httpServer, {
    path: '/api/socket',
    cors: {
      origin: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    // Extract userId from socket handshake (set by auth middleware)
    const userId = socket.handshake.auth?.userId;

    if (!userId) {
      console.log(`[WebSocket] Unauthorized connection attempt: ${socket.id}`);
      socket.disconnect();
      return;
    }

    // Initialize user's subscription set
    if (!userMarketSubscriptions.has(userId)) {
      userMarketSubscriptions.set(userId, new Set());
    }

    /**
     * Subscribe to market order book updates
     */
    socket.on('subscribe:market', (marketId: string) => {
      const userSubscriptions = userMarketSubscriptions.get(userId);

      if (!userSubscriptions) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Rate limit: max 50 markets per user
      if (userSubscriptions.size >= MAX_MARKETS_PER_USER) {
        socket.emit('error', {
          message: `Maximum ${MAX_MARKETS_PER_USER} market subscriptions reached`,
        });
        return;
      }

      // Join room
      socket.join(`market:${marketId}`);
      userSubscriptions.add(marketId);

      console.log(`[WebSocket] ${socket.id} subscribed to market:${marketId}`);
      socket.emit('subscribed', { marketId });
    });

    /**
     * Unsubscribe from market
     */
    socket.on('unsubscribe:market', (marketId: string) => {
      socket.leave(`market:${marketId}`);

      const userSubscriptions = userMarketSubscriptions.get(userId);
      if (userSubscriptions) {
        userSubscriptions.delete(marketId);
      }

      console.log(`[WebSocket] ${socket.id} unsubscribed from market:${marketId}`);
      socket.emit('unsubscribed', { marketId });
    });

    /**
     * Handle disconnection
     */
    socket.on('disconnect', () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);

      // Clean up user subscriptions
      if (userId) {
        userMarketSubscriptions.delete(userId);
      }
    });
  });

  return io;
}

/**
 * Get Socket.IO server instance
 */
export function getOrderBookServer(): SocketIOServer | null {
  return io;
}

/**
 * Emit order book update to all subscribers of a market
 */
export function emitOrderBookUpdate(
  marketId: string,
  orderBook: OrderBookSnapshot
): void {
  if (!io) {
    console.warn('[WebSocket] Socket.IO server not initialized');
    return;
  }

  io.to(`market:${marketId}`).emit('orderBook:update', {
    marketId,
    orderBook,
    timestamp: new Date(),
  });
}

/**
 * Emit order matched event
 */
export function emitOrderMatched(event: OrderMatchedEvent): void {
  if (!io) {
    console.warn('[WebSocket] Socket.IO server not initialized');
    return;
  }

  io.to(`market:${event.marketId}`).emit('order:matched', event);
}

/**
 * Emit order cancelled event
 */
export function emitOrderCancelled(event: OrderCancelledEvent): void {
  if (!io) {
    console.warn('[WebSocket] Socket.IO server not initialized');
    return;
  }

  io.to(`market:${event.marketId}`).emit('order:cancelled', event);
}

/**
 * Emit market resolved event
 */
export function emitMarketResolved(event: MarketResolvedEvent): void {
  if (!io) {
    console.warn('[WebSocket] Socket.IO server not initialized');
    return;
  }

  io.to(`market:${event.marketId}`).emit('market:resolved', event);
}

/**
 * Get count of active connections
 */
export function getActiveConnectionCount(): number {
  if (!io) return 0;
  return io.engine.clientsCount;
}

/**
 * Get count of subscribers for a market
 */
export function getMarketSubscriberCount(marketId: string): number {
  if (!io) return 0;

  const room = io.sockets.adapter.rooms.get(`market:${marketId}`);
  return room ? room.size : 0;
}
