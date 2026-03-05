import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Socket, io as ioc } from 'socket.io-client';
import {
  initializeOrderBookServer,
  getOrderBookServer,
  emitOrderBookUpdate,
  emitOrderMatched,
  emitOrderCancelled,
  emitMarketResolved,
  getActiveConnectionCount,
  getMarketSubscriberCount,
} from '@/app/lib/websocket/orderBookServer';

describe('Order Book WebSocket Server', () => {
  let httpServer: HTTPServer;
  let io: SocketIOServer;
  let clientSocket: Socket;
  const TEST_PORT = 3001;

  beforeAll((done) => {
    httpServer = require('http').createServer();
    io = initializeOrderBookServer(httpServer);
    httpServer.listen(TEST_PORT, () => {
      console.log(`Test server listening on port ${TEST_PORT}`);
      done();
    });
  });

  afterAll((done) => {
    io.close();
    httpServer.close(done);
  });

  beforeEach((done) => {
    clientSocket = ioc(`http://localhost:${TEST_PORT}`, {
      path: '/api/socket',
      auth: { userId: 'test-user-123' },
    });
    clientSocket.on('connect', done);
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Connection', () => {
    it('should establish WebSocket connection', () => {
      expect(clientSocket.connected).toBe(true);
    });

    it('should reject connection without userId', (done) => {
      const unauthorizedioc = ioc(`http://localhost:${TEST_PORT}`, {
        path: '/api/socket',
      });

      let connected = false;

      unauthorizedioc.on('connect', () => {
        connected = true;
      });

      unauthorizedioc.on('disconnect', (reason) => {
        // Server should disconnect immediately after connecting
        expect(connected).toBe(true);
        expect(reason).toBeDefined();
        unauthorizedioc.close();
        done();
      });

      setTimeout(() => {
        // If still connected after 1s, server didn't disconnect (fail)
        if (unauthorizedioc.connected) {
          unauthorizedioc.close();
          throw new Error('Server should have disconnected unauthorized client');
        } else if (!connected) {
          // Never connected at all (also acceptable)
          unauthorizedioc.close();
          done();
        }
      }, 1000);
    });

    it('should return Socket.IO server instance', () => {
      const server = getOrderBookServer();
      expect(server).toBe(io);
    });
  });

  describe('Market Subscription', () => {
    it('should subscribe to market', (done) => {
      const marketId = 'market-123';

      clientSocket.on('subscribed', (data) => {
        expect(data.marketId).toBe(marketId);
        done();
      });

      clientSocket.emit('subscribe:market', marketId);
    });

    it('should unsubscribe from market', (done) => {
      const marketId = 'market-123';

      clientSocket.on('subscribed', () => {
        clientSocket.emit('unsubscribe:market', marketId);
      });

      clientSocket.on('unsubscribed', (data) => {
        expect(data.marketId).toBe(marketId);
        done();
      });

      clientSocket.emit('subscribe:market', marketId);
    });

    it('should enforce max 50 market subscriptions per user', (done) => {
      const subscribePromises: Promise<void>[] = [];

      // Subscribe to 50 markets
      for (let i = 1; i <= 50; i++) {
        const promise = new Promise<void>((resolve) => {
          clientSocket.once('subscribed', () => resolve());
          clientSocket.emit('subscribe:market', `market-${i}`);
        });
        subscribePromises.push(promise);
      }

      Promise.all(subscribePromises).then(() => {
        // Try to subscribe to 51st market
        clientSocket.once('error', (error) => {
          expect(error.message).toContain('Maximum 50 market subscriptions');
          done();
        });

        clientSocket.emit('subscribe:market', 'market-51');
      });
    }, 10000);

    it('should count market subscribers', (done) => {
      const marketId = 'market-count-test';

      clientSocket.on('subscribed', () => {
        const count = getMarketSubscriberCount(marketId);
        expect(count).toBe(1);
        done();
      });

      clientSocket.emit('subscribe:market', marketId);
    });
  });

  describe('Order Book Updates', () => {
    it('should receive order book update after subscription', (done) => {
      const marketId = 'market-update-test';
      const mockOrderBook = {
        bids: [{ price: 0.60, size: 100, orders: 1 }],
        asks: [{ price: 0.61, size: 50, orders: 1 }],
      };

      clientSocket.on('subscribed', () => {
        emitOrderBookUpdate(marketId, mockOrderBook);
      });

      clientSocket.on('orderBook:update', (data) => {
        expect(data.marketId).toBe(marketId);
        expect(data.orderBook).toEqual(mockOrderBook);
        expect(data.timestamp).toBeDefined();
        done();
      });

      clientSocket.emit('subscribe:market', marketId);
    });

    it('should not receive updates for unsubscribed markets', (done) => {
      const subscribedMarket = 'market-subscribed';
      const unsubscribedMarket = 'market-unsubscribed';

      const mockOrderBook = {
        bids: [],
        asks: [],
      };

      let receivedCount = 0;

      clientSocket.on('subscribed', () => {
        // Emit to both markets
        emitOrderBookUpdate(subscribedMarket, mockOrderBook);
        emitOrderBookUpdate(unsubscribedMarket, mockOrderBook);

        // Wait to ensure we only receive one update
        setTimeout(() => {
          expect(receivedCount).toBe(1);
          done();
        }, 500);
      });

      clientSocket.on('orderBook:update', (data) => {
        receivedCount++;
        expect(data.marketId).toBe(subscribedMarket);
      });

      clientSocket.emit('subscribe:market', subscribedMarket);
    });
  });

  describe('Order Events', () => {
    it('should receive order matched event', (done) => {
      const marketId = 'market-match-test';
      const matchEvent = {
        marketId,
        orderId: 'order-123',
        side: 'BUY' as const,
        outcome: 'YES' as const,
        price: 0.65,
        size: 50,
        timestamp: new Date(),
      };

      clientSocket.on('subscribed', () => {
        emitOrderMatched(matchEvent);
      });

      clientSocket.on('order:matched', (data) => {
        expect(data.marketId).toBe(matchEvent.marketId);
        expect(data.orderId).toBe(matchEvent.orderId);
        expect(data.side).toBe(matchEvent.side);
        expect(data.outcome).toBe(matchEvent.outcome);
        expect(data.price).toBe(matchEvent.price);
        expect(data.size).toBe(matchEvent.size);
        // Date may be serialized as ISO string
        expect(data.timestamp).toBeDefined();
        done();
      });

      clientSocket.emit('subscribe:market', marketId);
    }, 60000);

    it('should receive order cancelled event', (done) => {
      const marketId = 'market-cancel-test';
      const cancelEvent = {
        marketId,
        orderId: 'order-456',
        userId: 'user-789',
      };

      clientSocket.on('subscribed', () => {
        emitOrderCancelled(cancelEvent);
      });

      clientSocket.on('order:cancelled', (data) => {
        expect(data).toEqual(cancelEvent);
        done();
      });

      clientSocket.emit('subscribe:market', marketId);
    }, 60000);

    it('should receive market resolved event', (done) => {
      const marketId = 'market-resolved-test';
      const resolvedEvent = {
        marketId,
        winningOutcome: 'YES' as const,
        hammerPrice: 125000,
        resolvedAt: new Date(),
      };

      clientSocket.on('subscribed', () => {
        emitMarketResolved(resolvedEvent);
      });

      clientSocket.on('market:resolved', (data) => {
        expect(data.marketId).toBe(resolvedEvent.marketId);
        expect(data.winningOutcome).toBe(resolvedEvent.winningOutcome);
        expect(data.hammerPrice).toBe(resolvedEvent.hammerPrice);
        // Date may be serialized as ISO string
        expect(data.resolvedAt).toBeDefined();
        done();
      });

      clientSocket.emit('subscribe:market', marketId);
    }, 60000);
  });

  describe('Connection Tracking', () => {
    it('should track active connections', () => {
      const count = getActiveConnectionCount();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('should clean up after disconnection', (done) => {
      const marketId = 'market-cleanup-test';

      clientSocket.on('subscribed', () => {
        const beforeCount = getMarketSubscriberCount(marketId);
        expect(beforeCount).toBe(1);

        clientSocket.disconnect();

        setTimeout(() => {
          const afterCount = getMarketSubscriberCount(marketId);
          expect(afterCount).toBe(0);
          done();
        }, 100);
      });

      clientSocket.emit('subscribe:market', marketId);
    });
  });

  describe('Error Handling', () => {
    it('should handle emit when server not initialized', () => {
      // Save original server
      const originalServer = getOrderBookServer();

      // Temporarily set to null
      (global as any).io = null;

      // Should not throw
      expect(() => {
        emitOrderBookUpdate('test', { bids: [], asks: [] });
      }).not.toThrow();

      // Restore
      (global as any).io = originalServer;
    });

    it('should handle multiple connections from same user', (done) => {
      const client2 = ioc(`http://localhost:${TEST_PORT}`, {
        path: '/api/socket',
        auth: { userId: 'test-user-123' },
      });

      client2.on('connect', () => {
        expect(client2.connected).toBe(true);
        client2.disconnect();
        done();
      });
    });
  });
});
