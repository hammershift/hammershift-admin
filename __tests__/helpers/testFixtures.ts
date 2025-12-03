import { Types } from "mongoose";
import Users from "@/app/models/user.model";
import Auctions from "@/app/models/auction.model";
import Wagers from "@/app/models/wager.model";
import Tournaments from "@/app/models/tournament.model";
import Predictions from "@/app/models/prediction.model";
import Transaction from "@/app/models/transaction.model";
import Admins from "@/app/models/admin.model";
import bcrypt from "bcrypt";

/**
 * Test fixtures for creating test data
 */

export async function createTestAdmin(overrides: any = {}) {
  const admin = new Admins({
    _id: new Types.ObjectId(),
    first_name: "Test",
    last_name: "Admin",
    email: "admin@test.com",
    username: "testadmin",
    password: await bcrypt.hash("password123", 10),
    role: "admin",
    ...overrides,
  });
  return await admin.save();
}

export async function createTestOwner(overrides: any = {}) {
  return createTestAdmin({
    first_name: "Test",
    last_name: "Owner",
    email: "owner@test.com",
    username: "testowner",
    role: "owner",
    ...overrides,
  });
}

export async function createTestUser(overrides: any = {}) {
  const user = new Users({
    _id: new Types.ObjectId(),
    username: "testuser",
    fullName: "Test User",
    email: "user@test.com",
    balance: 1000,
    isActive: true,
    isBanned: false,
    provider: "email",
    about: "Test user",
    role: "USER",
    ...overrides,
  });
  return await user.save();
}

export async function createTestAgent(overrides: any = {}) {
  return createTestUser({
    username: "testagent",
    fullName: "Test Agent",
    email: "agent@test.com",
    role: "AGENT",
    agentProperties: {
      systemInstruction: "You are a test agent for predicting auction prices.",
    },
    ...overrides,
  });
}

export async function createTestAuction(overrides: any = {}) {
  const auction = new Auctions({
    _id: new Types.ObjectId(),
    auction_id: `test-${Date.now()}`,
    title: "Test Auction 2020 Test Car",
    website: "bringatrailer.com",
    image: "https://example.com/image.jpg",
    page_url: "https://bringatrailer.com/listing/test",
    isActive: true,
    ended: false,
    attributes: [
      { _id: new Types.ObjectId(), key: "price", value: 50000 },
      { _id: new Types.ObjectId(), key: "year", value: 2020 },
      { _id: new Types.ObjectId(), key: "make", value: "Test" },
      { _id: new Types.ObjectId(), key: "model", value: "Car" },
      { _id: new Types.ObjectId(), key: "status", value: 1 }, // Active
    ],
    views: 100,
    watchers: 10,
    comments: 5,
    description: ["This is a test auction for a test car."],
    images_list: [],
    listing_details: ["Test detail 1", "Test detail 2"],
    sort: {
      price: 50000,
      bids: 10,
      deadline: new Date(Date.now() + 86400000), // Tomorrow
    },
    statusAndPriceChecked: false,
    pot: 0,
    ...overrides,
  });
  return await auction.save();
}

export async function createTestWager(userId: Types.ObjectId, auctionId: Types.ObjectId, overrides: any = {}) {
  const wager = new Wagers({
    auctionID: auctionId,
    priceGuessed: 45000,
    wagerAmount: 100,
    user: {
      _id: userId,
      fullName: "Test User",
      username: "testuser",
      image: "",
    },
    isActive: true,
    ...overrides,
  });
  return await wager.save();
}

export async function createTestTournament(auctionIds: Types.ObjectId[] = [], overrides: any = {}) {
  const latestTournament = await Tournaments.findOne().sort({ tournament_id: -1 });
  const nextId = (latestTournament?.tournament_id || 0) + 1;

  const tournament = new Tournaments({
    _id: new Types.ObjectId(),
    tournament_id: nextId,
    name: "Test Tournament",
    description: "A test tournament",
    banner: "",
    type: "free_play",
    prizePool: 1000,
    buyInFee: 0,
    isActive: true,
    haveWinners: false,
    startTime: new Date(),
    endTime: new Date(Date.now() + 7 * 86400000), // 7 days from now
    auction_ids: auctionIds,
    users: [],
    maxUsers: 100,
    ...overrides,
  });
  return await tournament.save();
}

export async function createTestPrediction(userId: Types.ObjectId, auctionId: Types.ObjectId, overrides: any = {}) {
  const prediction = new Predictions({
    auction_id: auctionId,
    predictedPrice: 48000,
    reasoning: "Test reasoning",
    predictionType: "free_play",
    wagerAmount: 0,
    user: {
      userId: userId,
      fullName: "Test User",
      username: "testuser",
      role: "USER",
    },
    refunded: false,
    isActive: true,
    prize: 0,
    ...overrides,
  });
  return await prediction.save();
}

export async function createTestTransaction(userId: Types.ObjectId, overrides: any = {}) {
  const transaction = new Transaction({
    userID: userId,
    transactionType: "deposit",
    amount: 1000,
    type: "+",
    status: "success",
    transactionDate: new Date(),
    ...overrides,
  });
  return await transaction.save();
}

/**
 * Mock NextAuth session
 */
export function createMockSession(role: string = "admin") {
  return {
    user: {
      id: new Types.ObjectId().toString(),
      email: `${role}@test.com`,
      username: `test${role}`,
      first_name: "Test",
      last_name: role.charAt(0).toUpperCase() + role.slice(1),
      role: role,
    },
  };
}

/**
 * Mock request with authorization
 */
export function mockAuthRequest(method: string, url: string, body?: any) {
  return {
    method,
    url,
    nextUrl: new URL(url, "http://localhost:3000"),
    json: async () => body || {},
    clone: function() {
      return this;
    },
  } as any;
}
