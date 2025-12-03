import { NextRequest } from "next/server";
import { POST, PUT } from "@/app/api/withdrawRequest/approve/route";
import { setupTestDb, teardownTestDb, resetTestDb } from "../../helpers/testDb";
import { createTestUser, createTestTransaction, createMockSession } from "../../helpers/testFixtures";
import Users from "@/app/models/user.model";
import Transaction from "@/app/models/transaction.model";
import { getServerSession } from "next-auth";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe("Withdraw Request API", () => {
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

  describe("POST /api/withdrawRequest/approve", () => {
    it("should require authentication", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/withdrawRequest/approve", {
        method: "POST",
        body: JSON.stringify({ transactionId: "507f1f77bcf86cd799439011" }),
      });

      const response = await POST(req);

      expect(response.status).toBe(401);
    });

    it("should require owner or admin role", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("moderator") as any);

      const req = new NextRequest("http://localhost:3000/api/withdrawRequest/approve", {
        method: "POST",
        body: JSON.stringify({ transactionId: "507f1f77bcf86cd799439011" }),
      });

      const response = await POST(req);

      expect(response.status).toBe(403);
    });

    it("should validate transaction ID format", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const req = new NextRequest("http://localhost:3000/api/withdrawRequest/approve", {
        method: "POST",
        body: JSON.stringify({ transactionId: "invalid-id" }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
    });

    it("should successfully approve withdrawal", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const user = await createTestUser({ balance: 1000 });
      const transaction = await createTestTransaction(user._id, {
        transactionType: "withdraw",
        amount: 500,
        type: "-",
        status: "processing",
      });

      const req = new NextRequest("http://localhost:3000/api/withdrawRequest/approve", {
        method: "POST",
        body: JSON.stringify({ transactionId: transaction._id.toString() }),
      });

      const response = await POST(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain("Withdrawal approved successfully");

      // Verify balance updated
      const updatedUser = await Users.findById(user._id);
      expect(updatedUser?.balance).toBe(500); // 1000 - 500

      // Verify transaction status updated
      const updatedTransaction = await Transaction.findById(transaction._id);
      expect(updatedTransaction?.status).toBe("success");
    });

    it("should reject if insufficient balance", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const user = await createTestUser({ balance: 100 });
      const transaction = await createTestTransaction(user._id, {
        transactionType: "withdraw",
        amount: 500,
        type: "-",
        status: "processing",
      });

      const req = new NextRequest("http://localhost:3000/api/withdrawRequest/approve", {
        method: "POST",
        body: JSON.stringify({ transactionId: transaction._id.toString() }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain("Insufficient balance");

      // Verify balance NOT changed
      const unchangedUser = await Users.findById(user._id);
      expect(unchangedUser?.balance).toBe(100);

      // Verify transaction status NOT changed
      const unchangedTransaction = await Transaction.findById(transaction._id);
      expect(unchangedTransaction?.status).toBe("processing");
    });

    it("should reject if transaction already approved", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const user = await createTestUser({ balance: 1000 });
      const transaction = await createTestTransaction(user._id, {
        transactionType: "withdraw",
        amount: 500,
        type: "-",
        status: "success",
      });

      const req = new NextRequest("http://localhost:3000/api/withdrawRequest/approve", {
        method: "POST",
        body: JSON.stringify({ transactionId: transaction._id.toString() }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain("already been approved");
    });

    it("should reject if transaction is not a withdrawal", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const user = await createTestUser({ balance: 1000 });
      const transaction = await createTestTransaction(user._id, {
        transactionType: "deposit",
        amount: 500,
        type: "+",
      });

      const req = new NextRequest("http://localhost:3000/api/withdrawRequest/approve", {
        method: "POST",
        body: JSON.stringify({ transactionId: transaction._id.toString() }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain("not a withdrawal request");
    });

    it("should rollback on error", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const user = await createTestUser({ balance: 1000 });
      const transaction = await createTestTransaction(user._id, {
        transactionType: "withdraw",
        amount: 500,
        type: "-",
        status: "processing",
      });

      // Delete user to cause error after balance check
      await Users.findByIdAndDelete(user._id);

      const req = new NextRequest("http://localhost:3000/api/withdrawRequest/approve", {
        method: "POST",
        body: JSON.stringify({ transactionId: transaction._id.toString() }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);

      // Verify transaction status NOT changed
      const unchangedTransaction = await Transaction.findById(transaction._id);
      expect(unchangedTransaction?.status).toBe("processing");
    });
  });

  describe("PUT /api/withdrawRequest/approve", () => {
    it("should require authentication", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/withdrawRequest/approve", {
        method: "PUT",
        body: JSON.stringify({
          transactionId: "507f1f77bcf86cd799439011",
          transactionNote: "Test note",
        }),
      });

      const response = await PUT(req);

      expect(response.status).toBe(401);
    });

    it("should update transaction with note", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const user = await createTestUser();
      const transaction = await createTestTransaction(user._id, {
        transactionType: "withdraw",
        status: "processing",
      });

      const req = new NextRequest("http://localhost:3000/api/withdrawRequest/approve", {
        method: "PUT",
        body: JSON.stringify({
          transactionId: transaction._id.toString(),
          transactionNote: "Approved by admin",
        }),
      });

      const response = await PUT(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify transaction updated
      const updatedTransaction = await Transaction.findById(transaction._id);
      expect(updatedTransaction?.status).toBe("success");
      expect((updatedTransaction as any).note).toBe("Approved by admin");
    });
  });
});
