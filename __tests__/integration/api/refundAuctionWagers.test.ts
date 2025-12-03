import { NextRequest } from "next/server";
import { POST } from "@/app/api/refundAuctionWagers/route";
import { setupTestDb, teardownTestDb, resetTestDb } from "../../helpers/testDb";
import { createTestUser, createTestAuction, createTestWager, createMockSession } from "../../helpers/testFixtures";
import Users from "@/app/models/user.model";
import Transaction from "@/app/models/transaction.model";
import Wagers from "@/app/models/wager.model";
import { getServerSession } from "next-auth";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe("Refund Auction Wagers API", () => {
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

  describe("POST /api/refundAuctionWagers", () => {
    it("should require authentication", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/refundAuctionWagers", {
        method: "POST",
        body: JSON.stringify({ wager_id: "507f1f77bcf86cd799439011" }),
      });

      const response = await POST(req);

      expect(response.status).toBe(401);
    });

    it("should require admin role", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("user") as any);

      const req = new NextRequest("http://localhost:3000/api/refundAuctionWagers", {
        method: "POST",
        body: JSON.stringify({ wager_id: "507f1f77bcf86cd799439011" }),
      });

      const response = await POST(req);

      expect(response.status).toBe(403);
    });

    it("should validate wager_id format", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const req = new NextRequest("http://localhost:3000/api/refundAuctionWagers", {
        method: "POST",
        body: JSON.stringify({ wager_id: "invalid-id" }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain("Invalid ObjectId");
    });

    it("should successfully refund a wager", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const user = await createTestUser({ balance: 500 });
      const auction = await createTestAuction();
      const wager = await createTestWager(user._id, auction._id, {
        wagerAmount: 200,
        isActive: true,
      });

      const req = new NextRequest("http://localhost:3000/api/refundAuctionWagers", {
        method: "POST",
        body: JSON.stringify({ wager_id: wager._id.toString() }),
      });

      const response = await POST(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toContain("Refund processed successfully");

      // Verify wager updated
      const updatedWager = await Wagers.findById(wager._id);
      expect(updatedWager?.refunded).toBe(true);
      expect(updatedWager?.deleteReason).toBe("Admin Refund");

      // Verify balance updated
      const updatedUser = await Users.findById(user._id);
      expect(updatedUser?.balance).toBe(700); // 500 + 200

      // Verify transaction created
      const transaction = await Transaction.findOne({ wagerID: wager._id });
      expect(transaction).not.toBeNull();
      expect(transaction?.transactionType).toBe("refund");
      expect(transaction?.amount).toBe(200);
      expect(transaction?.type).toBe("+");
      expect(transaction?.status).toBe("success");
    });

    it("should return error if wager not found", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const fakeId = "507f1f77bcf86cd799439011";
      const req = new NextRequest("http://localhost:3000/api/refundAuctionWagers", {
        method: "POST",
        body: JSON.stringify({ wager_id: fakeId }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain("Wager not found");
    });

    it("should rollback on error", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const user = await createTestUser({ balance: 500 });
      const auction = await createTestAuction();
      const wager = await createTestWager(user._id, auction._id, {
        wagerAmount: 200,
      });

      // Delete user to cause error
      await Users.findByIdAndDelete(user._id);

      const req = new NextRequest("http://localhost:3000/api/refundAuctionWagers", {
        method: "POST",
        body: JSON.stringify({ wager_id: wager._id.toString() }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);

      // Verify wager NOT updated (transaction rolled back)
      const unchangedWager = await Wagers.findById(wager._id);
      expect(unchangedWager?.refunded).not.toBe(true);

      // Verify no transaction created
      const transaction = await Transaction.findOne({ wagerID: wager._id });
      expect(transaction).toBeNull();
    });
  });
});
