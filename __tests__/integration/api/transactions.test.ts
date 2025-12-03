import { NextRequest } from "next/server";
import { GET } from "@/app/api/transactions/route";
import { setupTestDb, teardownTestDb, resetTestDb } from "../../helpers/testDb";
import { createTestAdmin, createTestUser, createTestTransaction, createMockSession } from "../../helpers/testFixtures";
import { getServerSession } from "next-auth";

// Mock next-auth
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe("Transactions API", () => {
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

  describe("GET /api/transactions", () => {
    it("should require authentication", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/transactions");
      const response = await GET(req);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.message).toContain("Unauthorized");
    });

    it("should require admin role", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("user") as any);

      const req = new NextRequest("http://localhost:3000/api/transactions");
      const response = await GET(req);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.message).toContain("Required roles");
    });

    it("should return all withdraw transactions for admins", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const user = await createTestUser();
      await createTestTransaction(user._id, {
        transactionType: "withdraw",
        amount: 500,
        type: "-",
        status: "processing",
      });
      await createTestTransaction(user._id, {
        transactionType: "withdraw",
        amount: 300,
        type: "-",
        status: "success",
      });
      await createTestTransaction(user._id, {
        transactionType: "deposit",
        amount: 1000,
        type: "+",
      });

      const req = new NextRequest("http://localhost:3000/api/transactions");
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.transactions).toHaveLength(2); // Only withdrawals
      expect(data.total).toBe(2);
    });

    it("should return single transaction by ID", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const user = await createTestUser();
      const transaction = await createTestTransaction(user._id, {
        transactionType: "withdraw",
        amount: 500,
        type: "-",
      });

      const req = new NextRequest(`http://localhost:3000/api/transactions?transaction_id=${transaction._id}`);
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data._id.toString()).toBe(transaction._id.toString());
      expect(data.amount).toBe(500);
    });

    it("should return 404 for non-existent transaction", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const fakeId = "507f1f77bcf86cd799439011";
      const req = new NextRequest(`http://localhost:3000/api/transactions?transaction_id=${fakeId}`);
      const response = await GET(req);

      expect(response.status).toBe(404);
    });

    it("should return 400 for invalid transaction ID format", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const req = new NextRequest("http://localhost:3000/api/transactions?transaction_id=invalid");
      const response = await GET(req);

      expect(response.status).toBe(400);
    });

    it("should support pagination", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const user = await createTestUser();
      for (let i = 0; i < 10; i++) {
        await createTestTransaction(user._id, {
          transactionType: "withdraw",
          amount: 100 * i,
          type: "-",
        });
      }

      const req = new NextRequest("http://localhost:3000/api/transactions?offset=0&limit=5");
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.transactions).toHaveLength(5);
      expect(data.total).toBe(10);
      expect(data.offset).toBe(0);
      expect(data.limit).toBe(5);
    });
  });
});
