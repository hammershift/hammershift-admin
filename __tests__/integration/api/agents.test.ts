import { NextRequest } from "next/server";
import { GET, POST, PUT, DELETE } from "@/app/api/agents/route";
import { setupTestDb, teardownTestDb, resetTestDb } from "../../helpers/testDb";
import {
  createTestAgent,
  createTestUser,
  createTestAuction,
  createTestPrediction,
  createMockSession,
} from "../../helpers/testFixtures";
import { getServerSession } from "next-auth";
import Users from "@/app/models/user.model";
import { Role } from "@/app/lib/interfaces";
import { Types } from "mongoose";

// Mock next-auth
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe("Agents API", () => {
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

  describe("GET /api/agents", () => {
    it("should return all agents without authentication", async () => {
      const agent1 = await createTestAgent({ username: "agent1" });
      const agent2 = await createTestAgent({ username: "agent2", email: "agent2@test.com" });
      await createTestUser(); // Regular user, should not be included

      const req = new NextRequest("http://localhost:3000/api/agents");
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.agents).toHaveLength(2);
      expect(data.total).toBe(2);
      expect(data.agents[0]._id.toString()).toBe(agent1._id.toString());
      expect(data.agents[1]._id.toString()).toBe(agent2._id.toString());
    });

    it("should return single agent by ID", async () => {
      const agent = await createTestAgent({ username: "testagent1" });

      const req = new NextRequest(`http://localhost:3000/api/agents?agent_id=${agent._id}`);
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data._id.toString()).toBe(agent._id.toString());
      expect(data.username).toBe("testagent1");
      expect(data.role).toBe(Role.AGENT);
    });

    it("should support pagination", async () => {
      for (let i = 0; i < 10; i++) {
        await createTestAgent({
          username: `agent${i}`,
          email: `agent${i}@test.com`,
        });
      }

      const req = new NextRequest("http://localhost:3000/api/agents?offset=0&limit=5");
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.agents).toHaveLength(5);
      expect(data.total).toBe(5);
    });

    it("should return agents who have not predicted for a specific auction", async () => {
      const agent1 = await createTestAgent({ username: "agent1" });
      const agent2 = await createTestAgent({ username: "agent2", email: "agent2@test.com" });
      const agent3 = await createTestAgent({ username: "agent3", email: "agent3@test.com" });
      const auction = await createTestAuction();

      // Agent1 has made a prediction
      await createTestPrediction(agent1._id, auction._id, {
        user: {
          userId: agent1._id,
          fullName: agent1.fullName,
          username: agent1.username,
          role: Role.AGENT,
        },
      });

      const req = new NextRequest(
        `http://localhost:3000/api/agents?auction_id=${auction._id}`
      );
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.agents).toHaveLength(2);

      const agentIds = data.agents.map((a: any) => a._id.toString());
      expect(agentIds).not.toContain(agent1._id.toString());
      expect(agentIds).toContain(agent2._id.toString());
      expect(agentIds).toContain(agent3._id.toString());
    });

    it("should filter agents by tournament predictions", async () => {
      const agent1 = await createTestAgent({ username: "agent1" });
      const agent2 = await createTestAgent({ username: "agent2", email: "agent2@test.com" });
      const auction = await createTestAuction();
      const tournamentId = new Types.ObjectId();

      // Agent1 made prediction with tournament_id
      await createTestPrediction(agent1._id, auction._id, {
        tournament_id: tournamentId,
        user: {
          userId: agent1._id,
          fullName: agent1.fullName,
          username: agent1.username,
          role: Role.AGENT,
        },
      });

      const req = new NextRequest(
        `http://localhost:3000/api/agents?auction_id=${auction._id}&tournament_id=${tournamentId}`
      );
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.agents).toHaveLength(1);
      expect(data.agents[0]._id.toString()).toBe(agent2._id.toString());
    });

    it("should handle empty agent list", async () => {
      const req = new NextRequest("http://localhost:3000/api/agents");
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.agents).toHaveLength(0);
      expect(data.total).toBe(0);
    });
  });

  describe("POST /api/agents", () => {
    it("should require authentication", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/agents", {
        method: "POST",
        body: JSON.stringify({
          username: "newagent",
          fullName: "New Agent",
          email: "newagent@test.com",
          agentProperties: {
            systemInstruction: "Test instruction",
          },
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain("Unauthorized");
    });

    it("should require admin or owner role", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("moderator") as any);

      const req = new NextRequest("http://localhost:3000/api/agents", {
        method: "POST",
        body: JSON.stringify({
          username: "newagent",
          fullName: "New Agent",
          email: "newagent@test.com",
          agentProperties: {
            systemInstruction: "Test instruction",
          },
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain("Unauthorized");
    });

    it("should create new agent with admin role", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const req = new NextRequest("http://localhost:3000/api/agents", {
        method: "POST",
        body: JSON.stringify({
          username: "newagent",
          fullName: "New Agent",
          email: "newagent@test.com",
          agentProperties: {
            systemInstruction: "Test instruction",
          },
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("Agent account created");

      // Verify agent was created
      const agent = await Users.findOne({ username: "newagent" });
      expect(agent).not.toBeNull();
      expect(agent?.fullName).toBe("New Agent");
      expect(agent?.email).toBe("newagent@test.com");
      expect(agent?.role).toBe(Role.AGENT);
      expect(agent?.agentProperties?.systemInstruction).toContain("Test instruction");
      expect(agent?.agentProperties?.systemInstruction).toContain("You are given a description");
    });

    it("should create new agent with owner role", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("owner") as any);

      const req = new NextRequest("http://localhost:3000/api/agents", {
        method: "POST",
        body: JSON.stringify({
          username: "owneragent",
          fullName: "Owner Agent",
          email: "owneragent@test.com",
          agentProperties: {
            systemInstruction: "Owner instruction",
          },
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("Agent account created");

      const agent = await Users.findOne({ username: "owneragent" });
      expect(agent).not.toBeNull();
      expect(agent?.role).toBe(Role.AGENT);
    });

    it("should reject duplicate username", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      await createTestAgent({ username: "existingagent" });

      const req = new NextRequest("http://localhost:3000/api/agents", {
        method: "POST",
        body: JSON.stringify({
          username: "existingagent",
          fullName: "Another Agent",
          email: "another@test.com",
          agentProperties: {
            systemInstruction: "Test instruction",
          },
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toBe("Agent name already exists");
    });

    it("should set default values correctly", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const req = new NextRequest("http://localhost:3000/api/agents", {
        method: "POST",
        body: JSON.stringify({
          username: "defaultagent",
          fullName: "Default Agent",
          email: "default@test.com",
          agentProperties: {
            systemInstruction: "Custom instruction",
          },
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(200);

      const agent = await Users.findOne({ username: "defaultagent" });
      expect(agent?.balance).toBe(0);
      expect(agent?.isActive).toBe(true);
      expect(agent?.isBanned).toBe(false);
      expect(agent?.provider).toBe("email");
      expect(agent?.role).toBe(Role.AGENT);
    });
  });

  describe("PUT /api/agents", () => {
    it("should require authentication", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/agents", {
        method: "PUT",
        body: JSON.stringify({
          _id: "507f1f77bcf86cd799439011",
          username: "updated",
        }),
      });

      const response = await PUT(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain("Unauthorized");
    });

    it("should require admin or owner role", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("moderator") as any);

      const agent = await createTestAgent();

      const req = new NextRequest("http://localhost:3000/api/agents", {
        method: "PUT",
        body: JSON.stringify({
          _id: agent._id.toString(),
          username: "updated",
        }),
      });

      const response = await PUT(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain("Unauthorized");
    });

    it("should update agent successfully", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const agent = await createTestAgent({ username: "oldname" });

      const req = new NextRequest("http://localhost:3000/api/agents", {
        method: "PUT",
        body: JSON.stringify({
          _id: agent._id.toString(),
          username: "newname",
          fullName: "Updated Agent",
          email: "updated@test.com",
          agentProperties: {
            systemInstruction: "Updated instruction",
          },
        }),
      });

      const response = await PUT(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.username).toBe("newname");
      expect(data.fullName).toBe("Updated Agent");

      // Verify database was updated
      const updatedAgent = await Users.findById(agent._id);
      expect(updatedAgent?.username).toBe("newname");
      expect(updatedAgent?.fullName).toBe("Updated Agent");
      expect(updatedAgent?.email).toBe("updated@test.com");
    });

    it("should reject duplicate username when updating", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      await createTestAgent({ username: "existingagent", email: "existing@test.com" });
      const agent = await createTestAgent({ username: "otheragent", email: "other@test.com" });

      const req = new NextRequest("http://localhost:3000/api/agents", {
        method: "PUT",
        body: JSON.stringify({
          _id: agent._id.toString(),
          username: "existingagent",
          fullName: "Test",
          email: "test@test.com",
          agentProperties: {},
        }),
      });

      const response = await PUT(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toBe("Another agent already exists with that name");
    });

    it("should return 404 for non-existent agent", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const fakeId = "507f1f77bcf86cd799439011";
      const req = new NextRequest("http://localhost:3000/api/agents", {
        method: "PUT",
        body: JSON.stringify({
          _id: fakeId,
          username: "updated",
          fullName: "Updated",
          email: "updated@test.com",
          agentProperties: {},
        }),
      });

      const response = await PUT(req);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.message).toBe("Cannot find agent");
    });

    it("should return 400 when ID is not provided", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const req = new NextRequest("http://localhost:3000/api/agents", {
        method: "PUT",
        body: JSON.stringify({
          username: "updated",
          fullName: "Updated",
          email: "updated@test.com",
        }),
      });

      const response = await PUT(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toBe("No ID has been provided");
    });

    it("should append default instruction to system instruction", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const agent = await createTestAgent();

      const req = new NextRequest("http://localhost:3000/api/agents", {
        method: "PUT",
        body: JSON.stringify({
          _id: agent._id.toString(),
          username: agent.username,
          fullName: agent.fullName,
          email: agent.email,
          agentProperties: {
            systemInstruction: "Custom part",
          },
        }),
      });

      const response = await PUT(req);

      expect(response.status).toBe(200);

      const updatedAgent = await Users.findById(agent._id);
      expect(updatedAgent?.agentProperties?.systemInstruction).toContain("Custom part");
      expect(updatedAgent?.agentProperties?.systemInstruction).toContain("You are given a description");
    });
  });

  describe("DELETE /api/agents", () => {
    it("should require authentication", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/agents", {
        method: "DELETE",
        body: JSON.stringify({ _id: "507f1f77bcf86cd799439011" }),
      });

      const response = await DELETE(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain("Unauthorized");
    });

    it("should require admin or owner role", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("moderator") as any);

      const agent = await createTestAgent();

      const req = new NextRequest("http://localhost:3000/api/agents", {
        method: "DELETE",
        body: JSON.stringify({ _id: agent._id.toString() }),
      });

      const response = await DELETE(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain("Unauthorized");
    });

    it("should delete agent successfully", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const agent = await createTestAgent();

      const req = new NextRequest("http://localhost:3000/api/agents", {
        method: "DELETE",
        body: JSON.stringify({ _id: agent._id.toString() }),
      });

      const response = await DELETE(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("Agent account deleted");

      // Verify agent was deleted
      const deletedAgent = await Users.findById(agent._id);
      expect(deletedAgent).toBeNull();
    });

    it("should return 400 when ID is not provided", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const req = new NextRequest("http://localhost:3000/api/agents", {
        method: "DELETE",
        body: JSON.stringify({}),
      });

      const response = await DELETE(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toBe("Agent ID is required");
    });

    it("should return 404 for non-existent agent", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const fakeId = "507f1f77bcf86cd799439011";
      const req = new NextRequest("http://localhost:3000/api/agents", {
        method: "DELETE",
        body: JSON.stringify({ _id: fakeId }),
      });

      const response = await DELETE(req);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.message).toBe("Agent not found");
    });

    it("should allow owner to delete agent", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("owner") as any);

      const agent = await createTestAgent();

      const req = new NextRequest("http://localhost:3000/api/agents", {
        method: "DELETE",
        body: JSON.stringify({ _id: agent._id.toString() }),
      });

      const response = await DELETE(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("Agent account deleted");

      const deletedAgent = await Users.findById(agent._id);
      expect(deletedAgent).toBeNull();
    });
  });
});
