import {
  calculateBaseScore,
  checkBonusConditions,
  applyBonuses,
  BonusModifiers,
} from "@/app/lib/scoringEngine";
import Streaks from "@/app/models/streak.model";
import { Types } from "mongoose";

// Mock dependencies
jest.mock("@/app/models/streak.model");
jest.mock("@/app/lib/eventTracking");
jest.mock("@/app/lib/badgeChecker");

describe("Scoring Engine v2", () => {
  describe("calculateBaseScore", () => {
    it("should return 1000 for exact predictions", () => {
      const score = calculateBaseScore(50000, 50000);
      expect(score).toBe(1000);
    });

    it("should return 950 for 5% off", () => {
      const score = calculateBaseScore(47500, 50000);
      expect(score).toBe(950);
    });

    it("should return 900 for 10% off", () => {
      const score = calculateBaseScore(45000, 50000);
      expect(score).toBe(900);
    });

    it("should return 500 for 50% off", () => {
      const score = calculateBaseScore(25000, 50000);
      expect(score).toBe(500);
    });

    it("should return 0 for 100%+ off", () => {
      const score = calculateBaseScore(100000, 50000);
      expect(score).toBe(0);
    });

    it("should return 0 for actualPrice of 0", () => {
      const score = calculateBaseScore(50000, 0);
      expect(score).toBe(0);
    });

    it("should return 0 for negative actualPrice", () => {
      const score = calculateBaseScore(50000, -10000);
      expect(score).toBe(0);
    });

    it("should handle over-predictions (predicted > actual)", () => {
      const score = calculateBaseScore(55000, 50000);
      expect(score).toBe(900); // 10% off
    });

    it("should handle under-predictions (predicted < actual)", () => {
      const score = calculateBaseScore(45000, 50000);
      expect(score).toBe(900); // 10% off
    });
  });

  describe("checkBonusConditions", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should detect early_bird when prediction is > 48h before auction end", async () => {
      const prediction = {
        createdAt: new Date("2024-01-01T00:00:00Z"),
        user: { userId: new Types.ObjectId() },
        tournament_id: null,
      };

      const auction = {
        end_time: new Date("2024-01-05T00:00:00Z"), // 4 days later
      };

      (Streaks.findOne as jest.Mock).mockResolvedValue({
        current_streak: 0,
      });

      const modifiers = await checkBonusConditions(
        prediction,
        auction,
        50000
      );

      expect(modifiers.early_bird).toBe(true);
    });

    it("should not detect early_bird when prediction is < 48h before auction end", async () => {
      const prediction = {
        createdAt: new Date("2024-01-01T00:00:00Z"),
        user: { userId: new Types.ObjectId() },
        tournament_id: null,
      };

      const auction = {
        end_time: new Date("2024-01-02T00:00:00Z"), // 1 day later
      };

      (Streaks.findOne as jest.Mock).mockResolvedValue({
        current_streak: 0,
      });

      const modifiers = await checkBonusConditions(
        prediction,
        auction,
        50000
      );

      expect(modifiers.early_bird).toBe(false);
    });

    it("should detect streak_bonus when user has streak >= 5", async () => {
      const prediction = {
        createdAt: new Date("2024-01-01T00:00:00Z"),
        user: { userId: new Types.ObjectId() },
        tournament_id: null,
      };

      const auction = {
        end_time: new Date("2024-01-02T00:00:00Z"),
      };

      (Streaks.findOne as jest.Mock).mockResolvedValue({
        current_streak: 7,
      });

      const modifiers = await checkBonusConditions(
        prediction,
        auction,
        50000
      );

      expect(modifiers.streak_bonus).toBe(true);
    });

    it("should detect bullseye when prediction is within 1%", async () => {
      const prediction = {
        createdAt: new Date("2024-01-01T00:00:00Z"),
        user: { userId: new Types.ObjectId() },
        predictedPrice: 50250, // 0.5% off
        tournament_id: null,
      };

      const auction = {
        end_time: new Date("2024-01-02T00:00:00Z"),
      };

      (Streaks.findOne as jest.Mock).mockResolvedValue({
        current_streak: 0,
      });

      const modifiers = await checkBonusConditions(
        prediction,
        auction,
        50000
      );

      expect(modifiers.bullseye).toBe(true);
    });

    it("should detect tournament_multiplier when prediction has tournament_id", async () => {
      const prediction = {
        createdAt: new Date("2024-01-01T00:00:00Z"),
        user: { userId: new Types.ObjectId() },
        tournament_id: new Types.ObjectId(),
      };

      const auction = {
        end_time: new Date("2024-01-02T00:00:00Z"),
      };

      (Streaks.findOne as jest.Mock).mockResolvedValue({
        current_streak: 0,
      });

      const modifiers = await checkBonusConditions(
        prediction,
        auction,
        50000
      );

      expect(modifiers.tournament_multiplier).toBe(true);
    });
  });

  describe("applyBonuses", () => {
    it("should add 50 points for early_bird", () => {
      const modifiers: BonusModifiers = {
        early_bird: true,
        streak_bonus: false,
        bullseye: false,
        tournament_multiplier: false,
      };

      const score = applyBonuses(900, modifiers);
      expect(score).toBe(950); // 900 + 50
    });

    it("should add 25 points for streak_bonus", () => {
      const modifiers: BonusModifiers = {
        early_bird: false,
        streak_bonus: true,
        bullseye: false,
        tournament_multiplier: false,
      };

      const score = applyBonuses(900, modifiers);
      expect(score).toBe(925); // 900 + 25
    });

    it("should add 200 points for bullseye", () => {
      const modifiers: BonusModifiers = {
        early_bird: false,
        streak_bonus: false,
        bullseye: true,
        tournament_multiplier: false,
      };

      const score = applyBonuses(900, modifiers);
      expect(score).toBe(1100); // 900 + 200
    });

    it("should multiply by 1.5 for tournament_multiplier", () => {
      const modifiers: BonusModifiers = {
        early_bird: false,
        streak_bonus: false,
        bullseye: false,
        tournament_multiplier: true,
      };

      const score = applyBonuses(900, modifiers);
      expect(score).toBe(1350); // 900 * 1.5
    });

    it("should apply all bonuses correctly", () => {
      const modifiers: BonusModifiers = {
        early_bird: true,
        streak_bonus: true,
        bullseye: true,
        tournament_multiplier: true,
      };

      const score = applyBonuses(900, modifiers);
      // 900 * 1.5 = 1350 (tournament multiplier applied first)
      // 1350 + 50 + 25 + 200 = 1625
      expect(score).toBe(1625);
    });

    it("should return base score when no bonuses apply", () => {
      const modifiers: BonusModifiers = {
        early_bird: false,
        streak_bonus: false,
        bullseye: false,
        tournament_multiplier: false,
      };

      const score = applyBonuses(900, modifiers);
      expect(score).toBe(900);
    });
  });
});
