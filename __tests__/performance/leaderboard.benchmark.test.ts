import { POST as refreshLeaderboard } from "@/app/api/leaderboard/refresh/route";
import { setupTestDb, teardownTestDb, resetTestDb } from "../helpers/testDb";
import { createTestUser, createTestAuction, createTestPrediction } from "../helpers/testFixtures";
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

describe("Leaderboard Performance Benchmarks", () => {
  beforeAll(async () => {
    await setupTestDb();
  }, 60000); // 60 second timeout

  afterAll(async () => {
    await teardownTestDb();
  }, 60000);

  beforeEach(async () => {
    await resetTestDb();
  }, 30000);

  it("should refresh leaderboard with 100 users in under 10 seconds", async () => {
    // Create 100 users with predictions
    const auction = await createTestAuction();
    const users = [];

    for (let i = 0; i < 100; i++) {
      const user = await createTestUser({ username: `user${i}` });
      users.push(user);

      // Each user makes 5 predictions
      for (let j = 0; j < 5; j++) {
        await createTestPrediction(user._id, auction._id, {
          score: Math.floor(Math.random() * 1000),
          scored_at: new Date(),
        });
      }
    }

    const req = new NextRequest(
      "http://localhost:3000/api/leaderboard/refresh?period=weekly",
      { method: "POST" }
    );

    const startTime = Date.now();
    const response = await refreshLeaderboard(req);
    const duration = Date.now() - startTime;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(10000); // Less than 10 seconds

    const data = await response.json();
    expect(data.users_ranked).toBe(100);

    console.log(`\n✓ Leaderboard refresh completed in ${duration}ms for 100 users`);
  }, 30000); // 30 second timeout

  it("should refresh leaderboard with 1000 predictions in under 15 seconds", async () => {
    const auction = await createTestAuction();

    // Create 50 users, each with 20 predictions
    for (let i = 0; i < 50; i++) {
      const user = await createTestUser({ username: `user${i}` });

      for (let j = 0; j < 20; j++) {
        await createTestPrediction(user._id, auction._id, {
          score: Math.floor(Math.random() * 1000),
          scored_at: new Date(),
        });
      }
    }

    const req = new NextRequest(
      "http://localhost:3000/api/leaderboard/refresh?period=weekly",
      { method: "POST" }
    );

    const startTime = Date.now();
    const response = await refreshLeaderboard(req);
    const duration = Date.now() - startTime;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(15000); // Less than 15 seconds

    const data = await response.json();
    expect(data.users_ranked).toBe(50);

    console.log(`\n✓ Leaderboard refresh completed in ${duration}ms for 1000 predictions`);
  }, 45000); // 45 second timeout

  it("should handle aggregation with complex queries efficiently", async () => {
    const auction = await createTestAuction();

    // Create users with varying prediction patterns
    for (let i = 0; i < 20; i++) {
      const user = await createTestUser({ username: `user${i}` });

      // Mix of high and low scores
      const predictionCount = Math.floor(Math.random() * 30) + 5;
      for (let j = 0; j < predictionCount; j++) {
        const score = Math.random() > 0.5
          ? Math.floor(Math.random() * 200) + 800 // High score
          : Math.floor(Math.random() * 600) + 100; // Low score

        await createTestPrediction(user._id, auction._id, {
          score,
          scored_at: new Date(),
        });
      }
    }

    const req = new NextRequest(
      "http://localhost:3000/api/leaderboard/refresh?period=weekly",
      { method: "POST" }
    );

    const startTime = Date.now();
    const response = await refreshLeaderboard(req);
    const duration = Date.now() - startTime;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(8000); // Less than 8 seconds

    const data = await response.json();
    expect(data.users_ranked).toBe(20);

    console.log(`\n✓ Complex aggregation completed in ${duration}ms`);
  }, 30000);

  it("should handle alltime period with historical data efficiently", async () => {
    const auction = await createTestAuction();

    // Create predictions spanning different time periods
    const now = Date.now();
    for (let i = 0; i < 30; i++) {
      const user = await createTestUser({ username: `user${i}` });

      // Predictions from different months
      const monthsAgo = [0, 1, 2, 6, 12];
      for (const months of monthsAgo) {
        const scoredDate = new Date(now - months * 30 * 24 * 60 * 60 * 1000);
        await createTestPrediction(user._id, auction._id, {
          score: Math.floor(Math.random() * 1000),
          scored_at: scoredDate,
        });
      }
    }

    const req = new NextRequest(
      "http://localhost:3000/api/leaderboard/refresh?period=alltime",
      { method: "POST" }
    );

    const startTime = Date.now();
    const response = await refreshLeaderboard(req);
    const duration = Date.now() - startTime;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(12000); // Less than 12 seconds

    const data = await response.json();
    expect(data.users_ranked).toBe(30);

    console.log(`\n✓ Alltime leaderboard refresh completed in ${duration}ms`);
  }, 45000);
});
