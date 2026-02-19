import { Types } from "mongoose";
import { updateStreak, getStreak } from "@/app/lib/streakManager";
import Streaks from "@/app/models/streak.model";
import Users from "@/app/models/user.model";
import { setupTestDb, teardownTestDb, resetTestDb } from "../../helpers/testDb";
import { createTestUser } from "../../helpers/testFixtures";

describe("Streak Manager", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await resetTestDb();
  });

  describe("updateStreak", () => {
    it("should initialize streak for first prediction", async () => {
      const user = await createTestUser();

      const result = await updateStreak(user._id);

      expect(result.streak).toBe(1);
      expect(result.updated).toBe(true);
      expect(result.milestone_reached).toBe(false);

      const streak = await Streaks.findOne({ user_id: user._id });
      expect(streak?.current_streak).toBe(1);
      expect(streak?.longest_streak).toBe(1);
    });

    it("should not update streak if prediction already made today", async () => {
      const user = await createTestUser();

      await updateStreak(user._id);
      const result = await updateStreak(user._id);

      expect(result.updated).toBe(false);
      expect(result.streak).toBe(1);
    });

    it("should increment streak on consecutive days", async () => {
      const user = await createTestUser();

      // Day 1
      await updateStreak(user._id);

      // Simulate Day 2
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await Streaks.updateOne(
        { user_id: user._id },
        { last_prediction_date: yesterday }
      );

      const result = await updateStreak(user._id);

      expect(result.streak).toBe(2);
      expect(result.updated).toBe(true);
    });

    it("should break streak if gap is more than 1 day without freeze tokens", async () => {
      const user = await createTestUser();

      // Day 1
      await updateStreak(user._id);

      // Simulate 3 days ago
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      await Streaks.updateOne(
        { user_id: user._id },
        { last_prediction_date: threeDaysAgo }
      );

      const result = await updateStreak(user._id);

      expect(result.streak).toBe(1); // Reset to 1
      expect(result.updated).toBe(true);
    });

    it("should preserve streak with freeze token", async () => {
      const user = await createTestUser();

      // Build a streak and add freeze token
      await Streaks.create({
        user_id: user._id,
        current_streak: 7,
        longest_streak: 7,
        last_prediction_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        freeze_tokens: 1,
      });

      const result = await updateStreak(user._id);

      expect(result.streak).toBe(7); // Preserved
      expect(result.updated).toBe(true);

      const streak = await Streaks.findOne({ user_id: user._id });
      expect(streak?.freeze_tokens).toBe(0); // Used
    });

    it("should award freeze token at 7-day milestone", async () => {
      const user = await createTestUser();

      // Simulate 6-day streak
      await Streaks.create({
        user_id: user._id,
        current_streak: 6,
        longest_streak: 6,
        last_prediction_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        freeze_tokens: 0,
      });

      const result = await updateStreak(user._id);

      expect(result.streak).toBe(7);
      expect(result.milestone_reached).toBe(true);

      const streak = await Streaks.findOne({ user_id: user._id });
      expect(streak?.freeze_tokens).toBe(1);
    });

    it("should award 3 freeze tokens at 30-day milestone", async () => {
      const user = await createTestUser();

      // Simulate 29-day streak
      await Streaks.create({
        user_id: user._id,
        current_streak: 29,
        longest_streak: 29,
        last_prediction_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        freeze_tokens: 1,
      });

      const result = await updateStreak(user._id);

      expect(result.streak).toBe(30);
      expect(result.milestone_reached).toBe(true);

      const streak = await Streaks.findOne({ user_id: user._id });
      expect(streak?.freeze_tokens).toBe(4); // 1 existing + 3 new
    });

    it("should update user model with streak information", async () => {
      const user = await createTestUser();

      await updateStreak(user._id);

      const updatedUser = await Users.findById(user._id);
      expect(updatedUser?.current_streak).toBe(1);
      expect(updatedUser?.longest_streak).toBe(1);
      expect(updatedUser?.last_prediction_at).toBeDefined();
    });
  });

  describe("getStreak", () => {
    it("should return default values for user without streak", async () => {
      const userId = new Types.ObjectId();

      const status = await getStreak(userId);

      expect(status.current_streak).toBe(0);
      expect(status.longest_streak).toBe(0);
      expect(status.freeze_tokens).toBe(0);
      expect(status.at_risk).toBe(false);
    });

    it("should return streak status for user with active streak", async () => {
      const user = await createTestUser();

      await Streaks.create({
        user_id: user._id,
        current_streak: 5,
        longest_streak: 10,
        last_prediction_date: new Date(),
        freeze_tokens: 1,
      });

      const status = await getStreak(user._id);

      expect(status.current_streak).toBe(5);
      expect(status.longest_streak).toBe(10);
      expect(status.freeze_tokens).toBe(1);
      expect(status.at_risk).toBe(false); // Predicted today
    });

    it("should indicate streak is at risk", async () => {
      const user = await createTestUser();

      // Simulate last prediction was yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await Streaks.create({
        user_id: user._id,
        current_streak: 5,
        longest_streak: 10,
        last_prediction_date: yesterday,
        freeze_tokens: 1,
      });

      const status = await getStreak(user._id);

      expect(status.at_risk).toBe(true);
    });
  });
});
