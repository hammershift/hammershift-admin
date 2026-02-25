import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import UserEvents from "@/app/models/userEvent.model";
import LeaderboardSnapshots from "@/app/models/leaderboardSnapshot.model";
import Streaks from "@/app/models/streak.model";
import Badges from "@/app/models/badge.model";
import EmailLogs from "@/app/models/emailLog.model";
import Users from "@/app/models/user.model";
import Auctions from "@/app/models/auction.model";
import Tournaments from "@/app/models/tournament.model";
import Predictions from "@/app/models/prediction.model";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe("New Models - UserEvent", () => {
  it("should create a valid user event", async () => {
    const userId = new mongoose.Types.ObjectId();
    const event = await UserEvents.create({
      user_id: userId,
      event_type: "prediction_made",
      event_data: { auction_id: "123", predicted_price: 50000 },
      created_at: new Date(),
    });

    expect(event.user_id).toEqual(userId);
    expect(event.event_type).toBe("prediction_made");
    expect(event.event_data.predicted_price).toBe(50000);
  });

  it("should require user_id and event_type", async () => {
    await expect(
      UserEvents.create({
        event_data: {},
      })
    ).rejects.toThrow();
  });

  it("should have correct indexes", () => {
    const indexes = UserEvents.schema.indexes();
    const indexKeys = indexes.map((idx) => Object.keys(idx[0]));

    expect(indexKeys).toContainEqual(["created_at"]);
    expect(indexKeys).toContainEqual(["user_id", "event_type", "created_at"]);
  });
});

describe("New Models - LeaderboardSnapshot", () => {
  it("should create a valid leaderboard snapshot", async () => {
    const userId = new mongoose.Types.ObjectId();
    const snapshot = await LeaderboardSnapshots.create({
      period: "weekly",
      user_id: userId,
      rank: 1,
      score: 5000,
      accuracy_pct: 85,
      predictions_count: 20,
      snapshot_at: new Date(),
    });

    expect(snapshot.period).toBe("weekly");
    expect(snapshot.rank).toBe(1);
    expect(snapshot.score).toBe(5000);
    expect(snapshot.accuracy_pct).toBe(85);
  });

  it("should validate period enum", async () => {
    const userId = new mongoose.Types.ObjectId();
    await expect(
      LeaderboardSnapshots.create({
        period: "invalid",
        user_id: userId,
        rank: 1,
        score: 5000,
      })
    ).rejects.toThrow();
  });

  it("should enforce accuracy_pct min/max", async () => {
    const userId = new mongoose.Types.ObjectId();

    await expect(
      LeaderboardSnapshots.create({
        period: "weekly",
        user_id: userId,
        rank: 1,
        score: 5000,
        accuracy_pct: 101,
      })
    ).rejects.toThrow();

    await expect(
      LeaderboardSnapshots.create({
        period: "weekly",
        user_id: userId,
        rank: 1,
        score: 5000,
        accuracy_pct: -1,
      })
    ).rejects.toThrow();
  });

  it("should have correct compound indexes", () => {
    const indexes = LeaderboardSnapshots.schema.indexes();
    const indexKeys = indexes.map((idx) => Object.keys(idx[0]));

    expect(indexKeys).toContainEqual(["period", "rank"]);
    expect(indexKeys).toContainEqual(["period", "user_id"]);
    expect(indexKeys).toContainEqual(["period", "snapshot_at"]);
  });
});

describe("New Models - Streak", () => {
  it("should create a valid streak", async () => {
    const userId = new mongoose.Types.ObjectId();
    const streak = await Streaks.create({
      user_id: userId,
      current_streak: 5,
      longest_streak: 10,
      last_prediction_date: new Date(),
      freeze_tokens: 2,
    });

    expect(streak.current_streak).toBe(5);
    expect(streak.longest_streak).toBe(10);
    expect(streak.freeze_tokens).toBe(2);
  });

  it("should have default values", async () => {
    const userId = new mongoose.Types.ObjectId();
    const streak = await Streaks.create({
      user_id: userId,
    });

    expect(streak.current_streak).toBe(0);
    expect(streak.longest_streak).toBe(0);
    expect(streak.freeze_tokens).toBe(0);
  });

  it("should enforce unique user_id", async () => {
    const userId = new mongoose.Types.ObjectId();
    await Streaks.create({ user_id: userId });

    await expect(Streaks.create({ user_id: userId })).rejects.toThrow();
  });

  it("should have timestamps", async () => {
    const userId = new mongoose.Types.ObjectId();
    const streak = await Streaks.create({ user_id: userId });

    expect(streak.createdAt).toBeDefined();
    expect(streak.updatedAt).toBeDefined();
  });
});

describe("New Models - Badge", () => {
  it("should create a valid badge", async () => {
    const userId = new mongoose.Types.ObjectId();
    const badge = await Badges.create({
      user_id: userId,
      badge_type: "first_prediction",
      earned_at: new Date(),
      metadata: { prediction_id: "123" },
    });

    expect(badge.badge_type).toBe("first_prediction");
    expect(badge.metadata.prediction_id).toBe("123");
  });

  it("should validate badge_type enum", async () => {
    const userId = new mongoose.Types.ObjectId();
    await expect(
      Badges.create({
        user_id: userId,
        badge_type: "invalid_badge",
      })
    ).rejects.toThrow();
  });

  it("should allow all valid badge types", async () => {
    const userId = new mongoose.Types.ObjectId();
    const validTypes = [
      "first_prediction",
      "first_win",
      "hot_start",
      "on_fire",
      "unstoppable",
      "legend",
      "tournament_rookie",
      "tournament_champion",
      "sharpshooter",
      "centurion",
      "top_10",
    ];

    for (const type of validTypes) {
      const badge = await Badges.create({
        user_id: new mongoose.Types.ObjectId(),
        badge_type: type,
      });
      expect(badge.badge_type).toBe(type);
    }
  });

  it("should prevent duplicate badges for same user and type", async () => {
    const userId = new mongoose.Types.ObjectId();
    await Badges.create({
      user_id: userId,
      badge_type: "first_prediction",
    });

    await expect(
      Badges.create({
        user_id: userId,
        badge_type: "first_prediction",
      })
    ).rejects.toThrow();
  });
});

describe("New Models - EmailLog", () => {
  it("should create a valid email log", async () => {
    const userId = new mongoose.Types.ObjectId();
    const log = await EmailLogs.create({
      user_id: userId,
      campaign_id: "campaign_123",
      email_type: "welcome",
      sent_at: new Date(),
      status: "sent",
    });

    expect(log.email_type).toBe("welcome");
    expect(log.status).toBe("sent");
    expect(log.campaign_id).toBe("campaign_123");
  });

  it("should validate email_type enum", async () => {
    const userId = new mongoose.Types.ObjectId();
    await expect(
      EmailLogs.create({
        user_id: userId,
        email_type: "invalid",
        sent_at: new Date(),
      })
    ).rejects.toThrow();
  });

  it("should validate status enum", async () => {
    const userId = new mongoose.Types.ObjectId();
    await expect(
      EmailLogs.create({
        user_id: userId,
        email_type: "welcome",
        sent_at: new Date(),
        status: "invalid",
      })
    ).rejects.toThrow();
  });

  it("should have default status of sent", async () => {
    const userId = new mongoose.Types.ObjectId();
    const log = await EmailLogs.create({
      user_id: userId,
      email_type: "welcome",
      sent_at: new Date(),
    });

    expect(log.status).toBe("sent");
  });

  it("should support optional opened_at and clicked_at", async () => {
    const userId = new mongoose.Types.ObjectId();
    const sentDate = new Date();
    const openedDate = new Date(sentDate.getTime() + 60000);

    const log = await EmailLogs.create({
      user_id: userId,
      email_type: "welcome",
      sent_at: sentDate,
      opened_at: openedDate,
    });

    expect(log.opened_at).toBeDefined();
    expect(log.clicked_at).toBeUndefined();
  });
});

describe("Extended Models - User", () => {
  it("should create user with new gamification fields", async () => {
    const userId = new mongoose.Types.ObjectId();
    const user = await Users.create({
      _id: userId,
      username: "testuser",
      fullName: "Test User",
      email: "test@example.com",
      role: "USER",
      current_streak: 5,
      longest_streak: 10,
      last_prediction_at: new Date(),
      ladder_tier: "pro",
      total_points: 5000,
      email_preferences: {
        marketing: true,
        digests: false,
        tournaments: true,
        results: true,
      },
    });

    expect(user.current_streak).toBe(5);
    expect(user.longest_streak).toBe(10);
    expect(user.ladder_tier).toBe("pro");
    expect(user.total_points).toBe(5000);
    expect(user.email_preferences.digests).toBe(false);
  });

  it("should have default values for new fields", async () => {
    const userId = new mongoose.Types.ObjectId();
    const user = await Users.create({
      _id: userId,
      username: "testuser2",
      fullName: "Test User 2",
      email: "test2@example.com",
      role: "USER",
    });

    expect(user.current_streak).toBe(0);
    expect(user.longest_streak).toBe(0);
    expect(user.ladder_tier).toBe("rookie");
    expect(user.total_points).toBe(0);
    expect(user.email_preferences.marketing).toBe(true);
  });

  it("should validate ladder_tier enum", async () => {
    const userId = new mongoose.Types.ObjectId();
    await expect(
      Users.create({
        _id: userId,
        username: "testuser3",
        fullName: "Test User 3",
        email: "test3@example.com",
        role: "USER",
        ladder_tier: "InvalidTier",
      })
    ).rejects.toThrow();
  });

  it("should have new indexes for leaderboard and inactive detection", () => {
    const indexes = Users.schema.indexes();
    const indexKeys = indexes.map((idx) => Object.keys(idx[0]));

    expect(indexKeys).toContainEqual(["total_points"]);
    expect(indexKeys).toContainEqual(["last_prediction_at"]);
  });
});

describe("Extended Models - Auction", () => {
  it("should create auction with new prediction tracking fields", async () => {
    const auctionId = new mongoose.Types.ObjectId();
    const auction = await Auctions.create({
      _id: auctionId,
      auction_id: "test-auction-123",
      title: "Test Auction",
      website: "bat",
      image: "https://example.com/image.jpg",
      page_url: "https://example.com/auction",
      prediction_count: 25,
      avg_predicted_price: 50000,
      source_badge: "bat",
      status_display: "active",
      attributes: [],
      images_list: [],
    });

    expect(auction.prediction_count).toBe(25);
    expect(auction.avg_predicted_price).toBe(50000);
    expect(auction.source_badge).toBe("bat");
    expect(auction.status_display).toBe("active");
  });

  it("should have default prediction_count of 0", async () => {
    const auctionId = new mongoose.Types.ObjectId();
    const auction = await Auctions.create({
      _id: auctionId,
      auction_id: "test-auction-124",
      title: "Test Auction 2",
      website: "cab",
      image: "https://example.com/image.jpg",
      page_url: "https://example.com/auction",
      attributes: [],
      images_list: [],
    });

    expect(auction.prediction_count).toBe(0);
    expect(auction.source_badge).toBe("bat");
  });

  it("should validate source_badge enum", async () => {
    const auctionId = new mongoose.Types.ObjectId();
    await expect(
      Auctions.create({
        _id: auctionId,
        auction_id: "test-auction-125",
        title: "Test Auction 3",
        website: "bat",
        image: "https://example.com/image.jpg",
        page_url: "https://example.com/auction",
        source_badge: "invalid",
        attributes: [],
        images_list: [],
      })
    ).rejects.toThrow();
  });

  it("should have new indexes for prediction tracking", () => {
    const indexes = Auctions.schema.indexes();
    const indexKeys = indexes.map((idx) => Object.keys(idx[0]));

    expect(indexKeys).toContainEqual(["prediction_count"]);
    expect(indexKeys).toContainEqual(["status_display", "sort.deadline"]);
  });
});

describe("Extended Models - Tournament", () => {
  it("should create tournament with scoring_version field", async () => {
    const tournament = await Tournaments.create({
      tournament_id: 1,
      name: "Test Tournament",
      description: "A test tournament",
      type: "free_play",
      prizePool: 1000,
      buyInFee: 0,
      startTime: new Date(),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      auction_ids: [new mongoose.Types.ObjectId()],
      maxUsers: 100,
      scoring_version: "v2",
    });

    expect(tournament.scoring_version).toBe("v2");
  });

  it("should default to v2 scoring", async () => {
    const tournament = await Tournaments.create({
      tournament_id: 2,
      name: "Test Tournament 2",
      description: "Another test tournament",
      type: "free_play",
      prizePool: 1000,
      buyInFee: 0,
      startTime: new Date(),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      auction_ids: [new mongoose.Types.ObjectId()],
      maxUsers: 100,
    });

    expect(tournament.scoring_version).toBe("v2");
  });

  it("should validate scoring_version enum", async () => {
    await expect(
      Tournaments.create({
        tournament_id: 3,
        name: "Test Tournament 3",
        description: "Yet another test tournament",
        type: "free_play",
        prizePool: 1000,
        buyInFee: 0,
        startTime: new Date(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        auction_ids: [new mongoose.Types.ObjectId()],
        maxUsers: 100,
        scoring_version: "v3",
      })
    ).rejects.toThrow();
  });

  it("should support v1 scoring", async () => {
    const tournament = await Tournaments.create({
      tournament_id: 4,
      name: "Test Tournament 4",
      description: "Legacy tournament",
      type: "free_play",
      prizePool: 1000,
      buyInFee: 0,
      startTime: new Date(),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      auction_ids: [new mongoose.Types.ObjectId()],
      maxUsers: 100,
      scoring_version: "v1",
    });

    expect(tournament.scoring_version).toBe("v1");
  });
});

describe("Extended Models - Prediction", () => {
  it("should create prediction with scoring v2 fields", async () => {
    const userId = new mongoose.Types.ObjectId();
    const auctionId = new mongoose.Types.ObjectId();

    const prediction = await Predictions.create({
      auction_id: auctionId,
      predictedPrice: 50000,
      predictionType: "standard",
      user: {
        userId,
        fullName: "Test User",
        username: "testuser",
        role: "USER",
      },
      score: 850,
      rank: 5,
      delta_from_actual: 2500,
      scored_at: new Date(),
      bonus_modifiers: {
        early_bird: true,
        streak_bonus: false,
        bullseye: false,
        tournament_multiplier: true,
      },
    });

    expect(prediction.score).toBe(850);
    expect(prediction.rank).toBe(5);
    expect(prediction.delta_from_actual).toBe(2500);
    expect(prediction.bonus_modifiers.early_bird).toBe(true);
    expect(prediction.bonus_modifiers.tournament_multiplier).toBe(true);
  });

  it("should have default bonus_modifiers values", async () => {
    const userId = new mongoose.Types.ObjectId();
    const auctionId = new mongoose.Types.ObjectId();

    const prediction = await Predictions.create({
      auction_id: auctionId,
      predictedPrice: 50000,
      predictionType: "standard",
      user: {
        userId,
        fullName: "Test User",
        username: "testuser",
        role: "USER",
      },
    });

    expect(prediction.bonus_modifiers.early_bird).toBe(false);
    expect(prediction.bonus_modifiers.streak_bonus).toBe(false);
    expect(prediction.bonus_modifiers.bullseye).toBe(false);
    expect(prediction.bonus_modifiers.tournament_multiplier).toBe(false);
  });

  it("should support predictions without scores (not yet scored)", async () => {
    const userId = new mongoose.Types.ObjectId();
    const auctionId = new mongoose.Types.ObjectId();

    const prediction = await Predictions.create({
      auction_id: auctionId,
      predictedPrice: 50000,
      predictionType: "standard",
      user: {
        userId,
        fullName: "Test User",
        username: "testuser",
        role: "USER",
      },
    });

    expect(prediction.score).toBeUndefined();
    expect(prediction.rank).toBeUndefined();
    expect(prediction.delta_from_actual).toBeUndefined();
    expect(prediction.scored_at).toBeUndefined();
  });

  it("should have new indexes for scoring queries", () => {
    const indexes = Predictions.schema.indexes();
    const indexKeys = indexes.map((idx) => Object.keys(idx[0]));

    expect(indexKeys).toContainEqual(["score"]);
    expect(indexKeys).toContainEqual(["scored_at"]);
  });
});

describe("Backward Compatibility", () => {
  it("should allow existing user documents without new fields", async () => {
    const userId = new mongoose.Types.ObjectId();
    const user = await Users.create({
      _id: userId,
      username: "legacyuser",
      fullName: "Legacy User",
      email: "legacy@example.com",
      role: "USER",
    });

    expect(user).toBeDefined();
    expect(user.current_streak).toBe(0);
    expect(user.total_points).toBe(0);
  });

  it("should allow existing auction documents without new fields", async () => {
    const auctionId = new mongoose.Types.ObjectId();
    const auction = await Auctions.create({
      _id: auctionId,
      auction_id: "legacy-auction",
      title: "Legacy Auction",
      website: "bat",
      image: "https://example.com/image.jpg",
      page_url: "https://example.com/auction",
      attributes: [],
      images_list: [],
    });

    expect(auction).toBeDefined();
    expect(auction.prediction_count).toBe(0);
  });

  it("should allow existing tournament documents without scoring_version", async () => {
    const tournament = await Tournaments.create({
      tournament_id: 100,
      name: "Legacy Tournament",
      description: "Legacy tournament",
      type: "free_play",
      prizePool: 1000,
      buyInFee: 0,
      startTime: new Date(),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      auction_ids: [new mongoose.Types.ObjectId()],
      maxUsers: 100,
    });

    expect(tournament).toBeDefined();
    expect(tournament.scoring_version).toBe("v2");
  });

  it("should allow existing predictions without scoring fields", async () => {
    const userId = new mongoose.Types.ObjectId();
    const auctionId = new mongoose.Types.ObjectId();

    const prediction = await Predictions.create({
      auction_id: auctionId,
      predictedPrice: 50000,
      predictionType: "standard",
      user: {
        userId,
        fullName: "Test User",
        username: "testuser",
        role: "USER",
      },
    });

    expect(prediction).toBeDefined();
    expect(prediction.score).toBeUndefined();
  });
});
