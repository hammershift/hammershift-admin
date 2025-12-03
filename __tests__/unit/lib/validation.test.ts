import {
  objectIdSchema,
  createWagerSchema,
  updateWagerSchema,
  createTournamentSchema,
  updateAuctionSchema,
  validateRequestBody,
} from "@/app/lib/validation";
import { z } from "zod";

describe("Validation Schemas", () => {
  describe("objectIdSchema", () => {
    it("should accept valid ObjectId", () => {
      const result = objectIdSchema.safeParse("507f1f77bcf86cd799439011");
      expect(result.success).toBe(true);
    });

    it("should reject invalid ObjectId", () => {
      const result = objectIdSchema.safeParse("invalid-id");
      expect(result.success).toBe(false);
    });

    it("should reject too short string", () => {
      const result = objectIdSchema.safeParse("123");
      expect(result.success).toBe(false);
    });
  });

  describe("createWagerSchema", () => {
    const validWager = {
      auctionID: "507f1f77bcf86cd799439011",
      priceGuessed: 50000,
      wagerAmount: 100,
      user: {
        fullName: "Test User",
        username: "testuser",
        image: "https://example.com/image.jpg",
      },
    };

    it("should accept valid wager", () => {
      const result = createWagerSchema.safeParse(validWager);
      expect(result.success).toBe(true);
    });

    it("should reject wager with negative price", () => {
      const result = createWagerSchema.safeParse({
        ...validWager,
        priceGuessed: -100,
      });
      expect(result.success).toBe(false);
    });

    it("should reject wager amount below minimum", () => {
      const result = createWagerSchema.safeParse({
        ...validWager,
        wagerAmount: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should reject wager amount above maximum", () => {
      const result = createWagerSchema.safeParse({
        ...validWager,
        wagerAmount: 200000,
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid auction ID", () => {
      const result = createWagerSchema.safeParse({
        ...validWager,
        auctionID: "invalid",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateWagerSchema", () => {
    it("should accept valid partial update", () => {
      const result = updateWagerSchema.safeParse({
        priceGuessed: 55000,
      });
      expect(result.success).toBe(true);
    });

    it("should accept isActive update", () => {
      const result = updateWagerSchema.safeParse({
        isActive: false,
      });
      expect(result.success).toBe(true);
    });

    it("should accept empty object (no updates)", () => {
      const result = updateWagerSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("createTournamentSchema", () => {
    const validTournament = {
      name: "Test Tournament",
      description: "A test tournament",
      banner: "https://example.com/banner.jpg",
      type: "free_play",
      prizePool: 1000,
      buyInFee: 0,
      startTime: "2025-01-01T00:00:00Z",
      endTime: "2025-01-08T00:00:00Z",
      auction_ids: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
      maxUsers: 100,
    };

    it("should accept valid tournament", () => {
      const result = createTournamentSchema.safeParse(validTournament);
      expect(result.success).toBe(true);
    });

    it("should reject tournament with no auctions", () => {
      const result = createTournamentSchema.safeParse({
        ...validTournament,
        auction_ids: [],
      });
      expect(result.success).toBe(false);
    });

    it("should reject tournament with invalid auction IDs", () => {
      const result = createTournamentSchema.safeParse({
        ...validTournament,
        auction_ids: ["invalid-id"],
      });
      expect(result.success).toBe(false);
    });

    it("should reject tournament with negative prize pool", () => {
      const result = createTournamentSchema.safeParse({
        ...validTournament,
        prizePool: -100,
      });
      expect(result.success).toBe(false);
    });

    it("should reject tournament with too few max users", () => {
      const result = createTournamentSchema.safeParse({
        ...validTournament,
        maxUsers: 1,
      });
      expect(result.success).toBe(false);
    });

    it("should accept empty banner", () => {
      const result = createTournamentSchema.safeParse({
        ...validTournament,
        banner: "",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateAuctionSchema", () => {
    it("should accept valid updates", () => {
      const result = updateAuctionSchema.safeParse({
        title: "Updated Title",
        isActive: false,
        pot: 1000,
      });
      expect(result.success).toBe(true);
    });

    it("should reject negative pot", () => {
      const result = updateAuctionSchema.safeParse({
        pot: -100,
      });
      expect(result.success).toBe(false);
    });

    it("should accept sort object", () => {
      const result = updateAuctionSchema.safeParse({
        sort: {
          price: 50000,
          bids: 10,
          deadline: "2025-01-01T00:00:00Z",
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe("validateRequestBody", () => {
    it("should validate and return data on success", async () => {
      const mockReq = {
        json: async () => ({ priceGuessed: 50000 }),
      } as Request;

      const result = await validateRequestBody(mockReq, updateWagerSchema);

      expect("data" in result).toBe(true);
      if ("data" in result) {
        expect(result.data.priceGuessed).toBe(50000);
      }
    });

    it("should return error message on validation failure", async () => {
      const mockReq = {
        json: async () => ({ priceGuessed: -100 }),
      } as Request;

      const result = await validateRequestBody(mockReq, updateWagerSchema);

      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toContain("Must be positive");
      }
    });

    it("should handle malformed JSON", async () => {
      const mockReq = {
        json: async () => {
          throw new Error("Invalid JSON");
        },
      } as Request;

      const result = await validateRequestBody(mockReq, updateWagerSchema);

      expect("error" in result).toBe(true);
    });
  });
});
