import { GET as getBadges } from "@/app/api/users/[userId]/badges/route";
import { GET as getStreak } from "@/app/api/users/[userId]/streak/route";
import { GET as getStats } from "@/app/api/users/[userId]/stats/route";
import Badges from "@/app/models/badge.model";
import Streaks from "@/app/models/streak.model";
import LeaderboardSnapshots from "@/app/models/leaderboardSnapshot.model";
import { setupTestDb, teardownTestDb, resetTestDb } from "../../helpers/testDb";
import { createTestUser, createTestAuction, createTestPrediction } from "../../helpers/testFixtures";
import { NextRequest } from "next/server";

describe("User Stats API", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await resetTestDb();
  });

  describe("GET /api/users/[userId]/badges", () => {
    it("should return all badges for a user", async () => {
      const user = await createTestUser();

      await Badges.create({
        user_id: user._id,
        badge_type: "first_prediction",
        earned_at: new Date(),
      });

      await Badges.create({
        user_id: user._id,
        badge_type: "hot_start",
        earned_at: new Date(),
      });

      const req = new NextRequest(
        `http://localhost:3000/api/users/${user._id}/badges`
      );

      const response = await getBadges(req, { params: { userId: user._id.toString() } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.badges.length).toBe(2);
      expect(data.total_badges).toBe(2);
    });

    it("should return empty array for user with no badges", async () => {
      const user = await createTestUser();

      const req = new NextRequest(
        `http://localhost:3000/api/users/${user._id}/badges`
      );

      const response = await getBadges(req, { params: { userId: user._id.toString() } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.badges.length).toBe(0);
      expect(data.total_badges).toBe(0);
    });

    it("should validate userId format", async () => {
      const req = new NextRequest("http://localhost:3000/api/users/invalid-id/badges");

      const response = await getBadges(req, { params: { userId: "invalid-id" } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid user ID");
    });
  });

  describe("GET /api/users/[userId]/streak", () => {
    it("should return streak status for a user", async () => {
      const user = await createTestUser();

      await Streaks.create({
        user_id: user._id,
        current_streak: 5,
        longest_streak: 10,
        last_prediction_date: new Date(),
        freeze_tokens: 2,
      });

      const req = new NextRequest(
        `http://localhost:3000/api/users/${user._id}/streak`
      );

      const response = await getStreak(req, { params: { userId: user._id.toString() } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.current_streak).toBe(5);
      expect(data.longest_streak).toBe(10);
      expect(data.freeze_tokens).toBe(2);
      expect(data.at_risk).toBe(false);
    });

    it("should return default values for user with no streak", async () => {
      const user = await createTestUser();

      const req = new NextRequest(
        `http://localhost:3000/api/users/${user._id}/streak`
      );

      const response = await getStreak(req, { params: { userId: user._id.toString() } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.current_streak).toBe(0);
      expect(data.longest_streak).toBe(0);
      expect(data.freeze_tokens).toBe(0);
      expect(data.at_risk).toBe(false);
    });

    it("should indicate at_risk status", async () => {
      const user = await createTestUser();

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await Streaks.create({
        user_id: user._id,
        current_streak: 5,
        longest_streak: 10,
        last_prediction_date: yesterday,
        freeze_tokens: 0,
      });

      const req = new NextRequest(
        `http://localhost:3000/api/users/${user._id}/streak`
      );

      const response = await getStreak(req, { params: { userId: user._id.toString() } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.at_risk).toBe(true);
    });

    it("should validate userId format", async () => {
      const req = new NextRequest("http://localhost:3000/api/users/invalid-id/streak");

      const response = await getStreak(req, { params: { userId: "invalid-id" } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid user ID");
    });
  });

  describe("GET /api/users/[userId]/stats", () => {
    it("should return comprehensive user statistics", async () => {
      const user = await createTestUser({
        total_points: 500,
        rank_title: "Expert",
      });
      const auction = await createTestAuction();

      // Create predictions
      await createTestPrediction(user._id, auction._id, { score: 900, scored_at: new Date() });
      await createTestPrediction(user._id, auction._id, { score: 850, scored_at: new Date() });
      await createTestPrediction(user._id, auction._id, { score: 700, scored_at: new Date() });

      // Create streak
      await Streaks.create({
        user_id: user._id,
        current_streak: 5,
        longest_streak: 10,
        last_prediction_date: new Date(),
        freeze_tokens: 1,
      });

      // Create badges
      await Badges.create({
        user_id: user._id,
        badge_type: "first_prediction",
        earned_at: new Date(),
      });

      // Create leaderboard snapshot
      await LeaderboardSnapshots.create({
        period: "weekly",
        user_id: user._id,
        rank: 3,
        score: 2450,
        accuracy_pct: 75,
        predictions_count: 3,
        snapshot_at: new Date(),
      });

      const req = new NextRequest(
        `http://localhost:3000/api/users/${user._id}/stats`
      );

      const response = await getStats(req, { params: { userId: user._id.toString() } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.username).toBe(user.username);
      expect(data.total_points).toBe(500);
      expect(data.rank_title).toBe("Expert");
      expect(data.predictions.total).toBe(3);
      expect(data.predictions.scored).toBe(3);
      expect(data.predictions.accuracy_pct).toBeGreaterThan(0);
      expect(data.leaderboard.weekly_rank).toBe(3);
      expect(data.leaderboard.weekly_score).toBe(2450);
      expect(data.streak.current_streak).toBe(5);
      expect(data.badges.total).toBe(1);
    });

    it("should handle user with no predictions", async () => {
      const user = await createTestUser();

      const req = new NextRequest(
        `http://localhost:3000/api/users/${user._id}/stats`
      );

      const response = await getStats(req, { params: { userId: user._id.toString() } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.predictions.total).toBe(0);
      expect(data.predictions.scored).toBe(0);
      expect(data.predictions.avg_score).toBe(0);
      expect(data.predictions.accuracy_pct).toBe(0);
    });

    it("should handle user with no leaderboard rank", async () => {
      const user = await createTestUser();

      const req = new NextRequest(
        `http://localhost:3000/api/users/${user._id}/stats`
      );

      const response = await getStats(req, { params: { userId: user._id.toString() } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.leaderboard.weekly_rank).toBeNull();
      expect(data.leaderboard.weekly_score).toBe(0);
    });

    it("should return 404 for non-existent user", async () => {
      const fakeUserId = "507f1f77bcf86cd799439011";

      const req = new NextRequest(
        `http://localhost:3000/api/users/${fakeUserId}/stats`
      );

      const response = await getStats(req, { params: { userId: fakeUserId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("User not found");
    });

    it("should validate userId format", async () => {
      const req = new NextRequest("http://localhost:3000/api/users/invalid-id/stats");

      const response = await getStats(req, { params: { userId: "invalid-id" } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid user ID");
    });

    it("should limit recent badges to 5", async () => {
      const user = await createTestUser();

      // Create 10 badges
      const badgeTypes = [
        "first_prediction",
        "first_win",
        "hot_start",
        "on_fire",
        "unstoppable",
        "legend",
        "sharpshooter",
        "centurion",
        "tournament_rookie",
        "tournament_champion",
      ];

      for (const badgeType of badgeTypes) {
        await Badges.create({
          user_id: user._id,
          badge_type: badgeType,
          earned_at: new Date(),
        });
      }

      const req = new NextRequest(
        `http://localhost:3000/api/users/${user._id}/stats`
      );

      const response = await getStats(req, { params: { userId: user._id.toString() } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.badges.total).toBe(10);
      expect(data.badges.recent.length).toBe(5);
    });
  });
});
