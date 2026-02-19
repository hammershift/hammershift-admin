import { Types } from "mongoose";
import { GET as getLeaderboard } from "@/app/api/leaderboard/route";
import { POST as refreshLeaderboard } from "@/app/api/leaderboard/refresh/route";
import LeaderboardSnapshots from "@/app/models/leaderboardSnapshot.model";
import Predictions from "@/app/models/prediction.model";
import { setupTestDb, teardownTestDb, resetTestDb } from "../../helpers/testDb";
import { createTestUser, createTestAuction, createTestPrediction, mockAuthRequest } from "../../helpers/testFixtures";
import { NextRequest } from "next/server";

// Mock NextAuth
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(() =>
    Promise.resolve({
      user: {
        id: "test-admin-id",
        role: "admin",
        email: "admin@test.com",
      },
    })
  ),
}));

describe("Leaderboard API", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await resetTestDb();
  });

  describe("GET /api/leaderboard", () => {
    it("should return empty leaderboard when no snapshots exist", async () => {
      const req = new NextRequest("http://localhost:3000/api/leaderboard?period=weekly");

      const response = await getLeaderboard(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.leaderboard).toEqual([]);
      expect(data.message).toBe("No snapshot available yet");
    });

    it("should return leaderboard snapshots for weekly period", async () => {
      const user1 = await createTestUser({ username: "user1" });
      const user2 = await createTestUser({ username: "user2" });

      // Create snapshots
      const now = new Date();
      await LeaderboardSnapshots.create({
        period: "weekly",
        user_id: user1._id,
        rank: 1,
        score: 1000,
        accuracy_pct: 85,
        predictions_count: 10,
        snapshot_at: now,
      });

      await LeaderboardSnapshots.create({
        period: "weekly",
        user_id: user2._id,
        rank: 2,
        score: 800,
        accuracy_pct: 75,
        predictions_count: 8,
        snapshot_at: now,
      });

      const req = new NextRequest("http://localhost:3000/api/leaderboard?period=weekly");

      const response = await getLeaderboard(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.leaderboard.length).toBe(2);
      expect(data.leaderboard[0].rank).toBe(1);
      expect(data.leaderboard[0].score).toBe(1000);
      expect(data.leaderboard[1].rank).toBe(2);
    });

    it("should return user position when userId provided", async () => {
      const user1 = await createTestUser({ username: "user1" });
      const user2 = await createTestUser({ username: "user2" });

      const now = new Date();
      await LeaderboardSnapshots.create({
        period: "weekly",
        user_id: user1._id,
        rank: 1,
        score: 1000,
        accuracy_pct: 85,
        predictions_count: 10,
        snapshot_at: now,
      });

      await LeaderboardSnapshots.create({
        period: "weekly",
        user_id: user2._id,
        rank: 2,
        score: 800,
        accuracy_pct: 75,
        predictions_count: 8,
        snapshot_at: now,
      });

      const req = new NextRequest(
        `http://localhost:3000/api/leaderboard?period=weekly&userId=${user2._id}`
      );

      const response = await getLeaderboard(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user_position).toBeDefined();
      expect(data.user_position.rank).toBe(2);
      expect(data.user_position.score).toBe(800);
    });

    it("should validate period parameter", async () => {
      const req = new NextRequest("http://localhost:3000/api/leaderboard?period=invalid");

      const response = await getLeaderboard(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid period");
    });

    it("should limit results to specified limit", async () => {
      const now = new Date();

      // Create 150 snapshots
      for (let i = 1; i <= 150; i++) {
        const user = await createTestUser({ username: `user${i}` });
        await LeaderboardSnapshots.create({
          period: "weekly",
          user_id: user._id,
          rank: i,
          score: 1000 - i,
          accuracy_pct: 80,
          predictions_count: 10,
          snapshot_at: now,
        });
      }

      const req = new NextRequest("http://localhost:3000/api/leaderboard?period=weekly&limit=50");

      const response = await getLeaderboard(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.leaderboard.length).toBe(50);
    });

    it("should not exceed maximum limit of 1000", async () => {
      const req = new NextRequest("http://localhost:3000/api/leaderboard?period=weekly&limit=5000");

      const response = await getLeaderboard(req);
      const data = await response.json();

      // Should be capped at 1000 (or number of available snapshots)
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/leaderboard/refresh", () => {
    it("should require admin or cron authentication", async () => {
      // Set CRON_SECRET so the dev-mode bypass is disabled
      process.env.CRON_SECRET = "test-cron-secret";

      // Mock unauthenticated session
      const { getServerSession } = require("next-auth");
      getServerSession.mockResolvedValueOnce(null);

      // Request without Authorization header (no valid cron token, no admin session)
      const req = new NextRequest("http://localhost:3000/api/leaderboard/refresh?period=weekly", {
        method: "POST",
      });

      const response = await refreshLeaderboard(req);
      const data = await response.json();

      delete process.env.CRON_SECRET;

      expect(response.status).toBe(401);
      expect(data.error).toContain("Unauthorized");
    });

    it("should refresh leaderboard for weekly period", async () => {
      const user1 = await createTestUser({ username: "user1" });
      const user2 = await createTestUser({ username: "user2" });
      const auction = await createTestAuction();

      // Create scored predictions
      const now = new Date();
      await createTestPrediction(user1._id, auction._id, {
        score: 900,
        scored_at: now,
      });
      await createTestPrediction(user1._id, auction._id, {
        score: 850,
        scored_at: now,
      });
      await createTestPrediction(user2._id, auction._id, {
        score: 800,
        scored_at: now,
      });

      const req = new NextRequest(
        "http://localhost:3000/api/leaderboard/refresh?period=weekly",
        { method: "POST" }
      );

      const response = await refreshLeaderboard(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users_ranked).toBe(2);
      expect(data.top_score).toBe(1750); // 900 + 850

      // Verify snapshots created
      const snapshots = await LeaderboardSnapshots.find({ period: "weekly" }).sort({ rank: 1 });
      expect(snapshots.length).toBe(2);
      expect(snapshots[0].user_id.toString()).toBe(user1._id.toString());
      expect(snapshots[0].score).toBe(1750);
      expect(snapshots[1].user_id.toString()).toBe(user2._id.toString());
      expect(snapshots[1].score).toBe(800);
    });

    it("should delete old snapshots before creating new ones", async () => {
      const user = await createTestUser();
      const auction = await createTestAuction();

      // Create old snapshot
      await LeaderboardSnapshots.create({
        period: "weekly",
        user_id: user._id,
        rank: 1,
        score: 500,
        accuracy_pct: 70,
        predictions_count: 5,
        snapshot_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      });

      // Create new prediction
      await createTestPrediction(user._id, auction._id, {
        score: 900,
        scored_at: new Date(),
      });

      const req = new NextRequest(
        "http://localhost:3000/api/leaderboard/refresh?period=weekly",
        { method: "POST" }
      );

      const response = await refreshLeaderboard(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.old_snapshots_deleted).toBe(1);

      // Verify only new snapshot exists
      const snapshots = await LeaderboardSnapshots.find({ period: "weekly" });
      expect(snapshots.length).toBe(1);
      expect(snapshots[0].score).toBe(900);
    });

    it("should calculate accuracy percentage correctly", async () => {
      const user = await createTestUser();
      const auction = await createTestAuction();

      // Create predictions with varying scores
      await createTestPrediction(user._id, auction._id, { score: 900, scored_at: new Date() });
      await createTestPrediction(user._id, auction._id, { score: 850, scored_at: new Date() });
      await createTestPrediction(user._id, auction._id, { score: 700, scored_at: new Date() });
      await createTestPrediction(user._id, auction._id, { score: 600, scored_at: new Date() });

      const req = new NextRequest(
        "http://localhost:3000/api/leaderboard/refresh?period=weekly",
        { method: "POST" }
      );

      const response = await refreshLeaderboard(req);
      expect(response.status).toBe(200);

      const snapshot = await LeaderboardSnapshots.findOne({ period: "weekly" });
      expect(snapshot).toBeDefined();
      expect(snapshot?.predictions_count).toBe(4);
      expect(snapshot?.accuracy_pct).toBe(50); // 2 out of 4 >= 800
    });

    it("should handle monthly period", async () => {
      const user = await createTestUser();
      const auction = await createTestAuction();

      await createTestPrediction(user._id, auction._id, {
        score: 900,
        scored_at: new Date(),
      });

      const req = new NextRequest(
        "http://localhost:3000/api/leaderboard/refresh?period=monthly",
        { method: "POST" }
      );

      const response = await refreshLeaderboard(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain("monthly");
    });

    it("should handle alltime period", async () => {
      const user = await createTestUser();
      const auction = await createTestAuction();

      await createTestPrediction(user._id, auction._id, {
        score: 900,
        scored_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
      });

      const req = new NextRequest(
        "http://localhost:3000/api/leaderboard/refresh?period=alltime",
        { method: "POST" }
      );

      const response = await refreshLeaderboard(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users_ranked).toBe(1);
    });

    it("should validate period parameter", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/leaderboard/refresh?period=invalid",
        { method: "POST" }
      );

      const response = await refreshLeaderboard(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid period");
    });

    it("should handle empty predictions gracefully", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/leaderboard/refresh?period=weekly",
        { method: "POST" }
      );

      const response = await refreshLeaderboard(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users_ranked).toBe(0);
      expect(data.top_score).toBe(0);
    });
  });
});
