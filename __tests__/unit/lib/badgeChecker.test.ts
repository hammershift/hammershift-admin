import { Types } from "mongoose";
import { checkAndAwardBadges, getUserBadges } from "@/app/lib/badgeChecker";
import Badges from "@/app/models/badge.model";
import Predictions from "@/app/models/prediction.model";
import Streaks from "@/app/models/streak.model";
import Users from "@/app/models/user.model";
import { setupTestDb, teardownTestDb, resetTestDb } from "../../helpers/testDb";
import { createTestUser, createTestPrediction, createTestAuction } from "../../helpers/testFixtures";

describe("Badge Checker", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await resetTestDb();
  });

  describe("checkAndAwardBadges", () => {
    it("should award first_prediction badge", async () => {
      const user = await createTestUser();
      const auction = await createTestAuction();
      await createTestPrediction(user._id, auction._id);

      const badges = await checkAndAwardBadges(user._id);

      expect(badges.length).toBe(1);
      expect(badges[0].badge_type).toBe("first_prediction");

      const userBadge = await Badges.findOne({
        user_id: user._id,
        badge_type: "first_prediction",
      });
      expect(userBadge).toBeDefined();

      // Check points bonus awarded
      const updatedUser = await Users.findById(user._id);
      expect(updatedUser?.total_points).toBe(50);
    });

    it("should not award duplicate badges", async () => {
      const user = await createTestUser();
      const auction = await createTestAuction();
      await createTestPrediction(user._id, auction._id);

      // Award first time
      await checkAndAwardBadges(user._id);

      // Try to award again
      const badges = await checkAndAwardBadges(user._id);

      expect(badges.length).toBe(0); // No new badges
    });

    it("should award first_win badge", async () => {
      const user = await createTestUser();
      const auction = await createTestAuction();
      await createTestPrediction(user._id, auction._id, { score: 920 });

      const badges = await checkAndAwardBadges(user._id);

      expect(badges.some((b: any) => b.badge_type === "first_win")).toBe(true);

      // Check points bonus
      const updatedUser = await Users.findById(user._id);
      expect(updatedUser?.total_points).toBeGreaterThanOrEqual(100);
    });

    it("should award hot_start badge at 3-day streak", async () => {
      const user = await createTestUser();

      await Streaks.create({
        user_id: user._id,
        current_streak: 3,
        longest_streak: 3,
        last_prediction_date: new Date(),
        freeze_tokens: 0,
      });

      const badges = await checkAndAwardBadges(user._id, {
        event_type: "streak_milestone",
        data: { streak: 3 },
      });

      expect(badges.some((b: any) => b.badge_type === "hot_start")).toBe(true);
    });

    it("should award on_fire badge at 7-day streak", async () => {
      const user = await createTestUser();

      await Streaks.create({
        user_id: user._id,
        current_streak: 7,
        longest_streak: 7,
        last_prediction_date: new Date(),
        freeze_tokens: 0,
      });

      const badges = await checkAndAwardBadges(user._id, {
        event_type: "streak_milestone",
        data: { streak: 7 },
      });

      expect(badges.some((b: any) => b.badge_type === "on_fire")).toBe(true);
      expect(badges[0].metadata.freeze_tokens_awarded).toBe(1);
    });

    it("should award sharpshooter badge after 5 high scores", async () => {
      const user = await createTestUser();
      const auction = await createTestAuction();

      // Create 5 predictions with high scores
      for (let i = 0; i < 5; i++) {
        await createTestPrediction(user._id, auction._id, { score: 900 + i });
      }

      const badges = await checkAndAwardBadges(user._id);

      expect(badges.some((b: any) => b.badge_type === "sharpshooter")).toBe(true);
    });

    it("should award centurion badge after 100 predictions", async () => {
      const user = await createTestUser();
      const auction = await createTestAuction();

      // Create 100 predictions
      for (let i = 0; i < 100; i++) {
        await Predictions.create({
          auction_id: auction._id,
          predictedPrice: 50000 + i,
          predictionType: "free_play",
          user: {
            userId: user._id,
            fullName: "Test User",
            username: "testuser",
            role: "USER",
          },
          isActive: true,
        });
      }

      const badges = await checkAndAwardBadges(user._id);

      expect(badges.some((b: any) => b.badge_type === "centurion")).toBe(true);

      // Check points bonus
      const updatedUser = await Users.findById(user._id);
      expect(updatedUser?.total_points).toBeGreaterThanOrEqual(300);
    });

    it("should award tournament_champion badge", async () => {
      const user = await createTestUser();

      const badges = await checkAndAwardBadges(user._id, {
        event_type: "tournament_complete",
        data: {
          tournament_rank: 1,
          tournament_id: "test-tournament-123",
          tournament_name: "Test Tournament",
        },
      });

      expect(badges.some((b: any) => b.badge_type === "tournament_champion")).toBe(true);
      expect(badges[0].metadata.tournament_id).toBe("test-tournament-123");
    });
  });

  describe("getUserBadges", () => {
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

      const badges = await getUserBadges(user._id);

      expect(badges.length).toBe(2);
      expect(badges.some((b: any) => b.badge_type === "first_prediction")).toBe(true);
      expect(badges.some((b: any) => b.badge_type === "hot_start")).toBe(true);
    });

    it("should return empty array for user with no badges", async () => {
      const userId = new Types.ObjectId();

      const badges = await getUserBadges(userId);

      expect(badges.length).toBe(0);
    });

    it("should sort badges by earned_at descending", async () => {
      const user = await createTestUser();

      const badge1 = await Badges.create({
        user_id: user._id,
        badge_type: "first_prediction",
        earned_at: new Date(Date.now() - 1000),
      });

      const badge2 = await Badges.create({
        user_id: user._id,
        badge_type: "hot_start",
        earned_at: new Date(),
      });

      const badges = await getUserBadges(user._id);

      expect(badges[0]._id.toString()).toBe(badge2._id.toString());
      expect(badges[1]._id.toString()).toBe(badge1._id.toString());
    });
  });
});
