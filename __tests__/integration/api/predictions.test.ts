import { NextRequest } from "next/server";
import { GET, DELETE } from "@/app/api/predictions/route";
import { setupTestDb, teardownTestDb, resetTestDb } from "../../helpers/testDb";
import {
  createTestUser,
  createTestAgent,
  createTestAuction,
  createTestPrediction,
  createTestTournament,
} from "../../helpers/testFixtures";
import Predictions from "@/app/models/prediction.model";
import { Role } from "@/app/lib/interfaces";
import { Types } from "mongoose";

describe("Predictions API", () => {
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

  describe("GET /api/predictions", () => {
    it("should return all predictions without authentication", async () => {
      const user = await createTestUser();
      const auction = await createTestAuction();
      await createTestPrediction(user._id, auction._id, {
        predictedPrice: 50000,
      });
      await createTestPrediction(user._id, auction._id, {
        predictedPrice: 55000,
      });

      const req = new NextRequest("http://localhost:3000/api/predictions");
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(2);
    });

    it("should return predictions for specific auction", async () => {
      const user = await createTestUser();
      const auction1 = await createTestAuction();
      const auction2 = await createTestAuction({ auction_id: "auction-2" });

      await createTestPrediction(user._id, auction1._id, {
        predictedPrice: 50000,
      });
      await createTestPrediction(user._id, auction1._id, {
        predictedPrice: 55000,
      });
      await createTestPrediction(user._id, auction2._id, {
        predictedPrice: 60000,
      });

      const req = new NextRequest(
        `http://localhost:3000/api/predictions?auction_id=${auction1._id}`
      );
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(2);
      expect(data[0].auction_id.toString()).toBe(auction1._id.toString());
      expect(data[1].auction_id.toString()).toBe(auction1._id.toString());
    });

    it("should exclude tournament predictions when querying by auction_id", async () => {
      const user = await createTestUser();
      const auction = await createTestAuction();

      await createTestPrediction(user._id, auction._id, {
        predictedPrice: 50000,
      });
      const tournamentId = new Types.ObjectId();
      await createTestPrediction(user._id, auction._id, {
        predictedPrice: 55000,
        tournament_id: tournamentId,
      });

      const req = new NextRequest(
        `http://localhost:3000/api/predictions?auction_id=${auction._id}`
      );
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(1);
      expect(data[0].predictedPrice).toBe(50000);
      expect(data[0].tournament_id).toBeUndefined();
    });

    it("should return predictions for specific tournament", async () => {
      const user = await createTestUser();
      const auction1 = await createTestAuction();
      const auction2 = await createTestAuction({ auction_id: "auction-2" });
      const tournament1Id = new Types.ObjectId();
      const tournament2Id = new Types.ObjectId();

      await createTestPrediction(user._id, auction1._id, {
        predictedPrice: 50000,
        tournament_id: tournament1Id,
      });
      await createTestPrediction(user._id, auction2._id, {
        predictedPrice: 55000,
        tournament_id: tournament1Id,
      });
      await createTestPrediction(user._id, auction1._id, {
        predictedPrice: 60000,
        tournament_id: tournament2Id,
      });

      const req = new NextRequest(
        `http://localhost:3000/api/predictions?tournament_id=${tournament1Id}`
      );
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(2);
      expect(data[0].tournament_id.toString()).toBe(tournament1Id.toString());
      expect(data[1].tournament_id.toString()).toBe(tournament1Id.toString());
    });

    it("should sort predictions by newest first", async () => {
      const user = await createTestUser();
      const auction = await createTestAuction();

      const oldPrediction = await createTestPrediction(user._id, auction._id, {
        predictedPrice: 50000,
        createdAt: new Date("2024-01-01"),
      });
      const newPrediction = await createTestPrediction(user._id, auction._id, {
        predictedPrice: 55000,
        createdAt: new Date("2024-12-01"),
      });

      const req = new NextRequest("http://localhost:3000/api/predictions");
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data[0]._id.toString()).toBe(newPrediction._id.toString());
      expect(data[1]._id.toString()).toBe(oldPrediction._id.toString());
    });

    it("should handle empty predictions list", async () => {
      const req = new NextRequest("http://localhost:3000/api/predictions");
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(0);
    });

    it("should return empty array for non-existent auction_id", async () => {
      const user = await createTestUser();
      const auction = await createTestAuction();
      await createTestPrediction(user._id, auction._id);

      const fakeAuctionId = "507f1f77bcf86cd799439011";
      const req = new NextRequest(
        `http://localhost:3000/api/predictions?auction_id=${fakeAuctionId}`
      );
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(0);
    });

    it("should return predictions from multiple users for same auction", async () => {
      const user1 = await createTestUser({ username: "user1", email: "user1@test.com" });
      const user2 = await createTestUser({ username: "user2", email: "user2@test.com" });
      const auction = await createTestAuction();

      await createTestPrediction(user1._id, auction._id, {
        predictedPrice: 50000,
        user: {
          userId: user1._id,
          fullName: user1.fullName,
          username: user1.username,
          role: "USER",
        },
      });
      await createTestPrediction(user2._id, auction._id, {
        predictedPrice: 55000,
        user: {
          userId: user2._id,
          fullName: user2.fullName,
          username: user2.username,
          role: "USER",
        },
      });

      const req = new NextRequest(
        `http://localhost:3000/api/predictions?auction_id=${auction._id}`
      );
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(2);
      expect(data[0].user.username).toBe("user2");
      expect(data[1].user.username).toBe("user1");
    });

    it("should include agent predictions", async () => {
      const agent = await createTestAgent();
      const auction = await createTestAuction();

      await createTestPrediction(agent._id, auction._id, {
        predictedPrice: 50000,
        user: {
          userId: agent._id,
          fullName: agent.fullName,
          username: agent.username,
          role: Role.AGENT,
        },
      });

      const req = new NextRequest(
        `http://localhost:3000/api/predictions?auction_id=${auction._id}`
      );
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(1);
      expect(data[0].user.role).toBe(Role.AGENT);
    });

    it("should include prediction details", async () => {
      const user = await createTestUser();
      const auction = await createTestAuction();

      await createTestPrediction(user._id, auction._id, {
        predictedPrice: 50000,
        reasoning: "Based on market analysis",
        predictionType: "paid",
        wagerAmount: 100,
        prize: 500,
        refunded: false,
        isActive: true,
      });

      const req = new NextRequest(
        `http://localhost:3000/api/predictions?auction_id=${auction._id}`
      );
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data[0].predictedPrice).toBe(50000);
      expect(data[0].reasoning).toBe("Based on market analysis");
      expect(data[0].predictionType).toBe("paid");
      expect(data[0].wagerAmount).toBe(100);
      expect(data[0].prize).toBe(500);
      expect(data[0].refunded).toBe(false);
      expect(data[0].isActive).toBe(true);
    });

    it("should handle predictions with refunded status", async () => {
      const user = await createTestUser();
      const auction = await createTestAuction();

      await createTestPrediction(user._id, auction._id, {
        predictedPrice: 50000,
        refunded: true,
      });

      const req = new NextRequest(
        `http://localhost:3000/api/predictions?auction_id=${auction._id}`
      );
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data[0].refunded).toBe(true);
    });
  });

  describe("DELETE /api/predictions", () => {
    it("should delete prediction by ID without authentication", async () => {
      const user = await createTestUser();
      const auction = await createTestAuction();
      const prediction = await createTestPrediction(user._id, auction._id);

      const req = new NextRequest(
        `http://localhost:3000/api/predictions?prediction_id=${prediction._id}`,
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe(`Successfully deleted prediction ${prediction._id}`);

      // Verify prediction was deleted
      const deletedPrediction = await Predictions.findById(prediction._id);
      expect(deletedPrediction).toBeNull();
    });

    it("should return error when prediction_id is missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/predictions", {
        method: "DELETE",
      });

      const response = await DELETE(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("Missing prediction_id");
    });

    it("should handle non-existent prediction_id gracefully", async () => {
      const fakeId = "507f1f77bcf86cd799439011";
      const req = new NextRequest(
        `http://localhost:3000/api/predictions?prediction_id=${fakeId}`,
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe(`Successfully deleted prediction ${fakeId}`);
    });

    it("should delete only the specified prediction", async () => {
      const user = await createTestUser();
      const auction = await createTestAuction();
      const prediction1 = await createTestPrediction(user._id, auction._id, {
        predictedPrice: 50000,
      });
      const prediction2 = await createTestPrediction(user._id, auction._id, {
        predictedPrice: 55000,
      });

      const req = new NextRequest(
        `http://localhost:3000/api/predictions?prediction_id=${prediction1._id}`,
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(req);

      expect(response.status).toBe(200);

      // Verify only prediction1 was deleted
      const deletedPrediction = await Predictions.findById(prediction1._id);
      const remainingPrediction = await Predictions.findById(prediction2._id);

      expect(deletedPrediction).toBeNull();
      expect(remainingPrediction).not.toBeNull();
    });

    it("should delete agent prediction", async () => {
      const agent = await createTestAgent();
      const auction = await createTestAuction();
      const prediction = await createTestPrediction(agent._id, auction._id, {
        user: {
          userId: agent._id,
          fullName: agent.fullName,
          username: agent.username,
          role: Role.AGENT,
        },
      });

      const req = new NextRequest(
        `http://localhost:3000/api/predictions?prediction_id=${prediction._id}`,
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(req);

      expect(response.status).toBe(200);

      const deletedPrediction = await Predictions.findById(prediction._id);
      expect(deletedPrediction).toBeNull();
    });

    it("should delete tournament prediction", async () => {
      const user = await createTestUser();
      const auction = await createTestAuction();
      const tournamentId = new Types.ObjectId();
      const prediction = await createTestPrediction(user._id, auction._id, {
        tournament_id: tournamentId,
      });

      const req = new NextRequest(
        `http://localhost:3000/api/predictions?prediction_id=${prediction._id}`,
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(req);

      expect(response.status).toBe(200);

      const deletedPrediction = await Predictions.findById(prediction._id);
      expect(deletedPrediction).toBeNull();
    });

    it("should delete prediction with wager amount", async () => {
      const user = await createTestUser();
      const auction = await createTestAuction();
      const prediction = await createTestPrediction(user._id, auction._id, {
        predictionType: "paid",
        wagerAmount: 100,
      });

      const req = new NextRequest(
        `http://localhost:3000/api/predictions?prediction_id=${prediction._id}`,
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(req);

      expect(response.status).toBe(200);

      const deletedPrediction = await Predictions.findById(prediction._id);
      expect(deletedPrediction).toBeNull();
    });

    it("should delete refunded prediction", async () => {
      const user = await createTestUser();
      const auction = await createTestAuction();
      const prediction = await createTestPrediction(user._id, auction._id, {
        refunded: true,
      });

      const req = new NextRequest(
        `http://localhost:3000/api/predictions?prediction_id=${prediction._id}`,
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(req);

      expect(response.status).toBe(200);

      const deletedPrediction = await Predictions.findById(prediction._id);
      expect(deletedPrediction).toBeNull();
    });

    it("should delete inactive prediction", async () => {
      const user = await createTestUser();
      const auction = await createTestAuction();
      const prediction = await createTestPrediction(user._id, auction._id, {
        isActive: false,
      });

      const req = new NextRequest(
        `http://localhost:3000/api/predictions?prediction_id=${prediction._id}`,
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(req);

      expect(response.status).toBe(200);

      const deletedPrediction = await Predictions.findById(prediction._id);
      expect(deletedPrediction).toBeNull();
    });

    it("should handle invalid ObjectId format", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/predictions?prediction_id=invalid-id",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(req);

      // The API throws an error for invalid ObjectId format
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("Internal server error");
    });

    it("should delete prediction with prize", async () => {
      const user = await createTestUser();
      const auction = await createTestAuction();
      const prediction = await createTestPrediction(user._id, auction._id, {
        prize: 500,
      });

      const req = new NextRequest(
        `http://localhost:3000/api/predictions?prediction_id=${prediction._id}`,
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(req);

      expect(response.status).toBe(200);

      const deletedPrediction = await Predictions.findById(prediction._id);
      expect(deletedPrediction).toBeNull();
    });

    it("should handle multiple delete requests for same prediction", async () => {
      const user = await createTestUser();
      const auction = await createTestAuction();
      const prediction = await createTestPrediction(user._id, auction._id);

      const req1 = new NextRequest(
        `http://localhost:3000/api/predictions?prediction_id=${prediction._id}`,
        {
          method: "DELETE",
        }
      );

      const response1 = await DELETE(req1);
      expect(response1.status).toBe(200);

      // Try to delete again
      const req2 = new NextRequest(
        `http://localhost:3000/api/predictions?prediction_id=${prediction._id}`,
        {
          method: "DELETE",
        }
      );

      const response2 = await DELETE(req2);
      expect(response2.status).toBe(200);
      // API doesn't check if prediction exists before responding
    });

    it("should delete free play prediction", async () => {
      const user = await createTestUser();
      const auction = await createTestAuction();
      const prediction = await createTestPrediction(user._id, auction._id, {
        predictionType: "free_play",
        wagerAmount: 0,
      });

      const req = new NextRequest(
        `http://localhost:3000/api/predictions?prediction_id=${prediction._id}`,
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(req);

      expect(response.status).toBe(200);

      const deletedPrediction = await Predictions.findById(prediction._id);
      expect(deletedPrediction).toBeNull();
    });

    it("should delete prediction with reasoning", async () => {
      const user = await createTestUser();
      const auction = await createTestAuction();
      const prediction = await createTestPrediction(user._id, auction._id, {
        reasoning: "Detailed reasoning about the prediction",
      });

      const req = new NextRequest(
        `http://localhost:3000/api/predictions?prediction_id=${prediction._id}`,
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(req);

      expect(response.status).toBe(200);

      const deletedPrediction = await Predictions.findById(prediction._id);
      expect(deletedPrediction).toBeNull();
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle predictions with missing optional fields", async () => {
      const user = await createTestUser();
      const auction = await createTestAuction();

      // Create prediction with minimal required fields
      await createTestPrediction(user._id, auction._id, {
        predictedPrice: 50000,
        reasoning: undefined,
        wagerAmount: 0,
        prize: 0,
      });

      const req = new NextRequest(
        `http://localhost:3000/api/predictions?auction_id=${auction._id}`
      );
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(1);
    });

    it("should handle concurrent predictions for same auction", async () => {
      const user1 = await createTestUser({ username: "user1", email: "user1@test.com" });
      const user2 = await createTestUser({ username: "user2", email: "user2@test.com" });
      const user3 = await createTestUser({ username: "user3", email: "user3@test.com" });
      const auction = await createTestAuction();

      await createTestPrediction(user1._id, auction._id, { predictedPrice: 50000 });
      await createTestPrediction(user2._id, auction._id, { predictedPrice: 55000 });
      await createTestPrediction(user3._id, auction._id, { predictedPrice: 60000 });

      const req = new NextRequest(
        `http://localhost:3000/api/predictions?auction_id=${auction._id}`
      );
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(3);
    });

    it("should handle predictions across multiple tournaments", async () => {
      const user = await createTestUser();
      const auction = await createTestAuction();
      const tournament1Id = new Types.ObjectId();
      const tournament2Id = new Types.ObjectId();

      await createTestPrediction(user._id, auction._id, {
        tournament_id: tournament1Id,
        predictedPrice: 50000,
      });
      await createTestPrediction(user._id, auction._id, {
        tournament_id: tournament2Id,
        predictedPrice: 55000,
      });
      await createTestPrediction(user._id, auction._id, {
        predictedPrice: 60000,
      });

      // Tournament 1
      let req = new NextRequest(
        `http://localhost:3000/api/predictions?tournament_id=${tournament1Id}`
      );
      let response = await GET(req);
      let data = await response.json();
      expect(data).toHaveLength(1);
      expect(data[0].tournament_id.toString()).toBe(tournament1Id.toString());

      // Tournament 2
      req = new NextRequest(`http://localhost:3000/api/predictions?tournament_id=${tournament2Id}`);
      response = await GET(req);
      data = await response.json();
      expect(data).toHaveLength(1);
      expect(data[0].tournament_id.toString()).toBe(tournament2Id.toString());

      // Non-tournament predictions
      req = new NextRequest(`http://localhost:3000/api/predictions?auction_id=${auction._id}`);
      response = await GET(req);
      data = await response.json();
      expect(data).toHaveLength(1);
      expect(data[0].tournament_id).toBeUndefined();
    });
  });
});
