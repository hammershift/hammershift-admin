import { NextRequest } from "next/server";
import { POST as createOrder } from "@/app/api/orders/create/route";
import { DELETE as cancelOrder } from "@/app/api/orders/cancel/route";
import { GET as listOrders } from "@/app/api/orders/list/route";
import { setupTestDb, teardownTestDb, resetTestDb } from "../../helpers/testDb";
import {
  createTestUser,
  createTestPolygonMarket,
  createTestPolygonOrder,
} from "../../helpers/testFixtures";
import PolygonOrderModel from "@/app/models/PolygonOrder.model";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";

// Mock NextAuth
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe("Orders API", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await resetTestDb();
    jest.clearAllMocks();
  });

  describe("POST /api/orders/create", () => {
    it("should create a limit order successfully", async () => {
      const user = await createTestUser();
      const market = await createTestPolygonMarket("auction-123");

      mockGetServerSession.mockResolvedValue({
        user: { id: user._id.toString() },
      } as any);

      const orderData = {
        marketId: market._id.toString(),
        auctionId: "auction-123",
        walletAddress: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
        side: "BUY",
        outcome: "YES",
        price: 0.6,
        size: 100,
        orderType: "LIMIT",
      };

      const req = new NextRequest("http://localhost:3000/api/orders/create", {
        method: "POST",
        body: JSON.stringify(orderData),
      });

      const response = await createOrder(req);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.order.side).toBe("BUY");
      expect(data.order.outcome).toBe("YES");
      expect(data.order.price).toBe(0.6);
      expect(data.order.size).toBe(100);
      expect(data.order.status).toBe("OPEN");

      // Verify order was created in database
      const order = await PolygonOrderModel.findById(data.order.id);
      expect(order).toBeTruthy();
      expect(order!.userId.toString()).toBe(user._id.toString());
    });

    it("should create a market order successfully", async () => {
      const user = await createTestUser();
      const market = await createTestPolygonMarket("auction-123");

      mockGetServerSession.mockResolvedValue({
        user: { id: user._id.toString() },
      } as any);

      const orderData = {
        marketId: market._id.toString(),
        auctionId: "auction-123",
        walletAddress: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
        side: "SELL",
        outcome: "NO",
        price: 0.4,
        size: 50,
        orderType: "MARKET",
      };

      const req = new NextRequest("http://localhost:3000/api/orders/create", {
        method: "POST",
        body: JSON.stringify(orderData),
      });

      const response = await createOrder(req);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.order.orderType).toBe("MARKET");
    });

    it("should reject order with price outside 0-1 range", async () => {
      const user = await createTestUser();
      const market = await createTestPolygonMarket("auction-123");

      mockGetServerSession.mockResolvedValue({
        user: { id: user._id.toString() },
      } as any);

      const orderData = {
        marketId: market._id.toString(),
        auctionId: "auction-123",
        walletAddress: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
        side: "BUY",
        outcome: "YES",
        price: 1.5,
        size: 100,
      };

      const req = new NextRequest("http://localhost:3000/api/orders/create", {
        method: "POST",
        body: JSON.stringify(orderData),
      });

      const response = await createOrder(req);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain("Price must be between 0 and 1");
    });

    it("should reject order with negative price", async () => {
      const user = await createTestUser();
      const market = await createTestPolygonMarket("auction-123");

      mockGetServerSession.mockResolvedValue({
        user: { id: user._id.toString() },
      } as any);

      const orderData = {
        marketId: market._id.toString(),
        auctionId: "auction-123",
        walletAddress: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
        side: "BUY",
        outcome: "YES",
        price: -0.1,
        size: 100,
      };

      const req = new NextRequest("http://localhost:3000/api/orders/create", {
        method: "POST",
        body: JSON.stringify(orderData),
      });

      const response = await createOrder(req);
      expect(response.status).toBe(400);
    });

    it("should reject order with zero or negative size", async () => {
      const user = await createTestUser();
      const market = await createTestPolygonMarket("auction-123");

      mockGetServerSession.mockResolvedValue({
        user: { id: user._id.toString() },
      } as any);

      const orderData = {
        marketId: market._id.toString(),
        auctionId: "auction-123",
        walletAddress: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
        side: "BUY",
        outcome: "YES",
        price: 0.5,
        size: 0,
      };

      const req = new NextRequest("http://localhost:3000/api/orders/create", {
        method: "POST",
        body: JSON.stringify(orderData),
      });

      const response = await createOrder(req);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain("Size must be greater than 0");
    });

    it("should reject order when market does not exist", async () => {
      const user = await createTestUser();

      mockGetServerSession.mockResolvedValue({
        user: { id: user._id.toString() },
      } as any);

      const orderData = {
        marketId: new Types.ObjectId().toString(),
        auctionId: "auction-123",
        walletAddress: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
        side: "BUY",
        outcome: "YES",
        price: 0.5,
        size: 100,
      };

      const req = new NextRequest("http://localhost:3000/api/orders/create", {
        method: "POST",
        body: JSON.stringify(orderData),
      });

      const response = await createOrder(req);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBe("Market not found");
    });

    it("should reject order when market is not ACTIVE", async () => {
      const user = await createTestUser();
      const market = await createTestPolygonMarket("auction-123", {
        status: "RESOLVED",
      });

      mockGetServerSession.mockResolvedValue({
        user: { id: user._id.toString() },
      } as any);

      const orderData = {
        marketId: market._id.toString(),
        auctionId: "auction-123",
        walletAddress: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
        side: "BUY",
        outcome: "YES",
        price: 0.5,
        size: 100,
      };

      const req = new NextRequest("http://localhost:3000/api/orders/create", {
        method: "POST",
        body: JSON.stringify(orderData),
      });

      const response = await createOrder(req);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain("Market is RESOLVED, not ACTIVE");
    });

    it("should reject order with invalid side", async () => {
      const user = await createTestUser();
      const market = await createTestPolygonMarket("auction-123");

      mockGetServerSession.mockResolvedValue({
        user: { id: user._id.toString() },
      } as any);

      const orderData = {
        marketId: market._id.toString(),
        auctionId: "auction-123",
        walletAddress: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
        side: "INVALID",
        outcome: "YES",
        price: 0.5,
        size: 100,
      };

      const req = new NextRequest("http://localhost:3000/api/orders/create", {
        method: "POST",
        body: JSON.stringify(orderData),
      });

      const response = await createOrder(req);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("Side must be BUY or SELL");
    });

    it("should reject order with invalid outcome", async () => {
      const user = await createTestUser();
      const market = await createTestPolygonMarket("auction-123");

      mockGetServerSession.mockResolvedValue({
        user: { id: user._id.toString() },
      } as any);

      const orderData = {
        marketId: market._id.toString(),
        auctionId: "auction-123",
        walletAddress: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
        side: "BUY",
        outcome: "MAYBE",
        price: 0.5,
        size: 100,
      };

      const req = new NextRequest("http://localhost:3000/api/orders/create", {
        method: "POST",
        body: JSON.stringify(orderData),
      });

      const response = await createOrder(req);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("Outcome must be YES or NO");
    });

    it("should reject order when user is not authenticated", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const orderData = {
        marketId: new Types.ObjectId().toString(),
        auctionId: "auction-123",
        walletAddress: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
        side: "BUY",
        outcome: "YES",
        price: 0.5,
        size: 100,
      };

      const req = new NextRequest("http://localhost:3000/api/orders/create", {
        method: "POST",
        body: JSON.stringify(orderData),
      });

      const response = await createOrder(req);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("should reject order with missing required fields", async () => {
      const user = await createTestUser();

      mockGetServerSession.mockResolvedValue({
        user: { id: user._id.toString() },
      } as any);

      const orderData = {
        marketId: new Types.ObjectId().toString(),
        side: "BUY",
        price: 0.5,
        // Missing auctionId, walletAddress, outcome, size
      };

      const req = new NextRequest("http://localhost:3000/api/orders/create", {
        method: "POST",
        body: JSON.stringify(orderData),
      });

      const response = await createOrder(req);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("Missing required fields");
    });
  });

  describe("DELETE /api/orders/cancel", () => {
    it("should cancel an open order successfully", async () => {
      const user = await createTestUser();
      const market = await createTestPolygonMarket("auction-123");
      const order = await createTestPolygonOrder(
        user._id,
        market._id.toString(),
        "auction-123"
      );

      mockGetServerSession.mockResolvedValue({
        user: { id: user._id.toString() },
      } as any);

      const req = new NextRequest("http://localhost:3000/api/orders/cancel", {
        method: "DELETE",
        body: JSON.stringify({ orderId: order._id.toString() }),
      });

      const response = await cancelOrder(req);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.order.status).toBe("CANCELLED");

      // Verify order status in database
      const updatedOrder = await PolygonOrderModel.findById(order._id);
      expect(updatedOrder!.status).toBe("CANCELLED");
    });

    it("should reject cancelling a filled order", async () => {
      const user = await createTestUser();
      const market = await createTestPolygonMarket("auction-123");
      const order = await createTestPolygonOrder(
        user._id,
        market._id.toString(),
        "auction-123",
        { status: "FILLED" }
      );

      mockGetServerSession.mockResolvedValue({
        user: { id: user._id.toString() },
      } as any);

      const req = new NextRequest("http://localhost:3000/api/orders/cancel", {
        method: "DELETE",
        body: JSON.stringify({ orderId: order._id.toString() }),
      });

      const response = await cancelOrder(req);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("Cannot cancel filled order");
    });

    it("should reject cancelling an already cancelled order", async () => {
      const user = await createTestUser();
      const market = await createTestPolygonMarket("auction-123");
      const order = await createTestPolygonOrder(
        user._id,
        market._id.toString(),
        "auction-123",
        { status: "CANCELLED" }
      );

      mockGetServerSession.mockResolvedValue({
        user: { id: user._id.toString() },
      } as any);

      const req = new NextRequest("http://localhost:3000/api/orders/cancel", {
        method: "DELETE",
        body: JSON.stringify({ orderId: order._id.toString() }),
      });

      const response = await cancelOrder(req);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("Order already cancelled");
    });

    it("should reject cancelling another user's order", async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser({ username: "testuser2" });
      const market = await createTestPolygonMarket("auction-123");
      const order = await createTestPolygonOrder(
        user1._id,
        market._id.toString(),
        "auction-123"
      );

      mockGetServerSession.mockResolvedValue({
        user: { id: user2._id.toString() },
      } as any);

      const req = new NextRequest("http://localhost:3000/api/orders/cancel", {
        method: "DELETE",
        body: JSON.stringify({ orderId: order._id.toString() }),
      });

      const response = await cancelOrder(req);
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBe("Unauthorized to cancel this order");
    });

    it("should reject cancelling non-existent order", async () => {
      const user = await createTestUser();

      mockGetServerSession.mockResolvedValue({
        user: { id: user._id.toString() },
      } as any);

      const req = new NextRequest("http://localhost:3000/api/orders/cancel", {
        method: "DELETE",
        body: JSON.stringify({ orderId: new Types.ObjectId().toString() }),
      });

      const response = await cancelOrder(req);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBe("Order not found");
    });

    it("should reject cancel when user is not authenticated", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/orders/cancel", {
        method: "DELETE",
        body: JSON.stringify({ orderId: new Types.ObjectId().toString() }),
      });

      const response = await cancelOrder(req);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("GET /api/orders/list", () => {
    it("should list all orders when no filters applied", async () => {
      const user = await createTestUser();
      const market = await createTestPolygonMarket("auction-123");

      await createTestPolygonOrder(user._id, market._id.toString(), "auction-123");
      await createTestPolygonOrder(user._id, market._id.toString(), "auction-123", {
        side: "SELL",
        outcome: "NO",
      });

      const req = new NextRequest("http://localhost:3000/api/orders/list");
      const response = await listOrders(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.total).toBe(2);
      expect(data.orders).toHaveLength(2);
    });

    it("should filter orders by marketId", async () => {
      const user = await createTestUser();
      const market1 = await createTestPolygonMarket("auction-123");
      const market2 = await createTestPolygonMarket("auction-456");

      await createTestPolygonOrder(user._id, market1._id.toString(), "auction-123");
      await createTestPolygonOrder(user._id, market1._id.toString(), "auction-123");
      await createTestPolygonOrder(user._id, market2._id.toString(), "auction-456");

      const req = new NextRequest(
        `http://localhost:3000/api/orders/list?marketId=${market1._id.toString()}`
      );
      const response = await listOrders(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.total).toBe(2);
      expect(data.orders.every((o: any) => o.marketId === market1._id.toString())).toBe(true);
    });

    it("should filter orders by userId", async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser({ username: "testuser2" });
      const market = await createTestPolygonMarket("auction-123");

      await createTestPolygonOrder(user1._id, market._id.toString(), "auction-123");
      await createTestPolygonOrder(user2._id, market._id.toString(), "auction-123");

      const req = new NextRequest(
        `http://localhost:3000/api/orders/list?userId=${user1._id.toString()}`
      );
      const response = await listOrders(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.total).toBe(1);
      expect(data.orders[0].userId.toString()).toBe(user1._id.toString());
    });

    it("should filter orders by status", async () => {
      const user = await createTestUser();
      const market = await createTestPolygonMarket("auction-123");

      await createTestPolygonOrder(user._id, market._id.toString(), "auction-123");
      await createTestPolygonOrder(user._id, market._id.toString(), "auction-123", {
        status: "FILLED",
      });
      await createTestPolygonOrder(user._id, market._id.toString(), "auction-123", {
        status: "CANCELLED",
      });

      const req = new NextRequest("http://localhost:3000/api/orders/list?status=OPEN");
      const response = await listOrders(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.total).toBe(1);
      expect(data.orders[0].status).toBe("OPEN");
    });

    it("should filter orders by side", async () => {
      const user = await createTestUser();
      const market = await createTestPolygonMarket("auction-123");

      await createTestPolygonOrder(user._id, market._id.toString(), "auction-123", {
        side: "BUY",
      });
      await createTestPolygonOrder(user._id, market._id.toString(), "auction-123", {
        side: "SELL",
      });

      const req = new NextRequest("http://localhost:3000/api/orders/list?side=BUY");
      const response = await listOrders(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.orders.every((o: any) => o.side === "BUY")).toBe(true);
    });

    it("should filter orders by outcome", async () => {
      const user = await createTestUser();
      const market = await createTestPolygonMarket("auction-123");

      await createTestPolygonOrder(user._id, market._id.toString(), "auction-123", {
        outcome: "YES",
      });
      await createTestPolygonOrder(user._id, market._id.toString(), "auction-123", {
        outcome: "NO",
      });

      const req = new NextRequest("http://localhost:3000/api/orders/list?outcome=YES");
      const response = await listOrders(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.orders.every((o: any) => o.outcome === "YES")).toBe(true);
    });

    it("should return order book structure", async () => {
      const user = await createTestUser();
      const market = await createTestPolygonMarket("auction-123");

      await createTestPolygonOrder(user._id, market._id.toString(), "auction-123", {
        side: "BUY",
        outcome: "YES",
      });
      await createTestPolygonOrder(user._id, market._id.toString(), "auction-123", {
        side: "SELL",
        outcome: "NO",
      });

      const req = new NextRequest(
        `http://localhost:3000/api/orders/list?marketId=${market._id.toString()}`
      );
      const response = await listOrders(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.orderBook).toBeDefined();
      expect(data.orderBook.buy).toBeDefined();
      expect(data.orderBook.sell).toBeDefined();
      expect(data.orderBook.buy.YES).toHaveLength(1);
      expect(data.orderBook.sell.NO).toHaveLength(1);
    });

    it("should reject invalid side parameter", async () => {
      const req = new NextRequest("http://localhost:3000/api/orders/list?side=INVALID");
      const response = await listOrders(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid side parameter");
    });

    it("should reject invalid outcome parameter", async () => {
      const req = new NextRequest("http://localhost:3000/api/orders/list?outcome=MAYBE");
      const response = await listOrders(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid outcome parameter");
    });
  });
});
