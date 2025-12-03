import { NextRequest } from "next/server";
import { GET, POST, PUT, DELETE } from "@/app/api/admins/route";
import { setupTestDb, teardownTestDb, resetTestDb } from "../../helpers/testDb";
import {
  createTestAdmin,
  createTestOwner,
  createMockSession,
} from "../../helpers/testFixtures";
import { getServerSession } from "next-auth";
import Admins from "@/app/models/admin.model";
import bcrypt from "bcrypt";

// Mock next-auth
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe("Admins API", () => {
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

  describe("GET /api/admins", () => {
    it("should return all admins without authentication", async () => {
      const admin1 = await createTestAdmin({ username: "admin1" });
      const admin2 = await createTestAdmin({
        username: "admin2",
        email: "admin2@test.com",
      });

      const req = new NextRequest("http://localhost:3000/api/admins");
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.admins).toHaveLength(2);
      expect(data.total).toBe(2);
      expect(data.admins[0]._id.toString()).toBe(admin1._id.toString());
      expect(data.admins[1]._id.toString()).toBe(admin2._id.toString());
    });

    it("should return single admin by ID", async () => {
      const admin = await createTestAdmin({ username: "testadmin" });

      const req = new NextRequest(`http://localhost:3000/api/admins?_id=${admin._id}`);
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data._id.toString()).toBe(admin._id.toString());
      expect(data.username).toBe("testadmin");
      expect(data.role).toBe("admin");
    });

    it("should support pagination", async () => {
      for (let i = 0; i < 10; i++) {
        await createTestAdmin({
          username: `admin${i}`,
          email: `admin${i}@test.com`,
        });
      }

      const req = new NextRequest("http://localhost:3000/api/admins?offset=0&limit=5");
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.admins).toHaveLength(5);
      expect(data.total).toBe(5);
    });

    it("should handle empty admin list", async () => {
      const req = new NextRequest("http://localhost:3000/api/admins");
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.admins).toHaveLength(0);
      expect(data.total).toBe(0);
    });

    it("should skip admins with offset", async () => {
      for (let i = 0; i < 5; i++) {
        await createTestAdmin({
          username: `admin${i}`,
          email: `admin${i}@test.com`,
        });
      }

      const req = new NextRequest("http://localhost:3000/api/admins?offset=3&limit=10");
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.admins).toHaveLength(2);
      expect(data.total).toBe(2);
    });
  });

  describe("POST /api/admins", () => {
    it("should require authentication", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/admins", {
        method: "POST",
        body: JSON.stringify({
          first_name: "New",
          last_name: "Admin",
          email: "newadmin@test.com",
          username: "newadmin",
          password: "password123",
          role: "admin",
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain("Unauthorized");
    });

    it("should require owner role", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const req = new NextRequest("http://localhost:3000/api/admins", {
        method: "POST",
        body: JSON.stringify({
          first_name: "New",
          last_name: "Admin",
          email: "newadmin@test.com",
          username: "newadmin",
          password: "password123",
          role: "admin",
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain("Unauthorized");
    });

    it("should create new admin with owner role", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("owner") as any);

      const req = new NextRequest("http://localhost:3000/api/admins", {
        method: "POST",
        body: JSON.stringify({
          first_name: "New",
          last_name: "Admin",
          email: "newadmin@test.com",
          username: "newadmin",
          password: "password123",
          role: "admin",
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("Admin account created");

      // Verify admin was created
      const admin = await Admins.findOne({ username: "newadmin" });
      expect(admin).not.toBeNull();
      expect(admin?.first_name).toBe("New");
      expect(admin?.last_name).toBe("Admin");
      expect(admin?.email).toBe("newadmin@test.com");
      expect(admin?.role).toBe("admin");

      // Verify password is hashed
      expect(admin?.password).not.toBe("password123");
      const passwordMatch = await bcrypt.compare("password123", admin?.password || "");
      expect(passwordMatch).toBe(true);
    });

    it("should reject duplicate email", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("owner") as any);

      await createTestAdmin({ email: "existing@test.com" });

      const req = new NextRequest("http://localhost:3000/api/admins", {
        method: "POST",
        body: JSON.stringify({
          first_name: "Another",
          last_name: "Admin",
          email: "existing@test.com",
          username: "anotheradmin",
          password: "password123",
          role: "admin",
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toBe("Email is already in use");
    });

    it("should reject duplicate username", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("owner") as any);

      await createTestAdmin({ username: "existinguser" });

      const req = new NextRequest("http://localhost:3000/api/admins", {
        method: "POST",
        body: JSON.stringify({
          first_name: "Another",
          last_name: "Admin",
          email: "another@test.com",
          username: "existinguser",
          password: "password123",
          role: "admin",
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toBe("Username is already taken");
    });

    it("should create admin with moderator role", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("owner") as any);

      const req = new NextRequest("http://localhost:3000/api/admins", {
        method: "POST",
        body: JSON.stringify({
          first_name: "Moderator",
          last_name: "User",
          email: "moderator@test.com",
          username: "moderator",
          password: "password123",
          role: "moderator",
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(200);

      const admin = await Admins.findOne({ username: "moderator" });
      expect(admin?.role).toBe("moderator");
    });

    it("should set createdAt timestamp", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("owner") as any);

      const beforeTime = new Date();

      const req = new NextRequest("http://localhost:3000/api/admins", {
        method: "POST",
        body: JSON.stringify({
          first_name: "Time",
          last_name: "Test",
          email: "time@test.com",
          username: "timetest",
          password: "password123",
          role: "admin",
        }),
      });

      await POST(req);

      const afterTime = new Date();
      const admin = await Admins.findOne({ username: "timetest" });

      expect(admin?.createdAt).toBeDefined();
      expect(admin?.createdAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(admin?.createdAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe("PUT /api/admins", () => {
    it("should require authentication", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/admins", {
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

    it("should require owner role", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const admin = await createTestAdmin();

      const req = new NextRequest("http://localhost:3000/api/admins", {
        method: "PUT",
        body: JSON.stringify({
          _id: admin._id.toString(),
          username: "updated",
        }),
      });

      const response = await PUT(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain("Unauthorized");
    });

    it("should update admin successfully", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("owner") as any);

      const admin = await createTestAdmin({ username: "oldname" });

      const req = new NextRequest("http://localhost:3000/api/admins", {
        method: "PUT",
        body: JSON.stringify({
          _id: admin._id.toString(),
          first_name: "Updated",
          last_name: "Name",
          username: "newname",
          email: "updated@test.com",
          role: "moderator",
          password: "",
        }),
      });

      const response = await PUT(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("Admin account updated");

      // Verify database was updated
      const updatedAdmin = await Admins.findById(admin._id);
      expect(updatedAdmin?.username).toBe("newname");
      expect(updatedAdmin?.first_name).toBe("Updated");
      expect(updatedAdmin?.last_name).toBe("Name");
      expect(updatedAdmin?.email).toBe("updated@test.com");
      expect(updatedAdmin?.role).toBe("moderator");
    });

    it("should update password when provided", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("owner") as any);

      const admin = await createTestAdmin();
      const oldPassword = admin.password;

      const req = new NextRequest("http://localhost:3000/api/admins", {
        method: "PUT",
        body: JSON.stringify({
          _id: admin._id.toString(),
          first_name: admin.first_name,
          last_name: admin.last_name,
          username: admin.username,
          email: admin.email,
          role: admin.role,
          password: "newpassword123",
        }),
      });

      const response = await PUT(req);

      expect(response.status).toBe(200);

      const updatedAdmin = await Admins.findById(admin._id);
      expect(updatedAdmin?.password).not.toBe(oldPassword);

      const passwordMatch = await bcrypt.compare("newpassword123", updatedAdmin?.password || "");
      expect(passwordMatch).toBe(true);
    });

    it("should not update password when empty string", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("owner") as any);

      const admin = await createTestAdmin();
      const oldPassword = admin.password;

      const req = new NextRequest("http://localhost:3000/api/admins", {
        method: "PUT",
        body: JSON.stringify({
          _id: admin._id.toString(),
          first_name: admin.first_name,
          last_name: admin.last_name,
          username: admin.username,
          email: admin.email,
          role: admin.role,
          password: "",
        }),
      });

      const response = await PUT(req);

      expect(response.status).toBe(200);

      const updatedAdmin = await Admins.findById(admin._id);
      expect(updatedAdmin?.password).toBe(oldPassword);
    });

    it("should reject duplicate email when updating", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("owner") as any);

      await createTestAdmin({ email: "existing@test.com", username: "existing" });
      const admin = await createTestAdmin({ email: "other@test.com", username: "other" });

      const req = new NextRequest("http://localhost:3000/api/admins", {
        method: "PUT",
        body: JSON.stringify({
          _id: admin._id.toString(),
          first_name: "Test",
          last_name: "Test",
          username: "other",
          email: "existing@test.com",
          role: "admin",
          password: "",
        }),
      });

      const response = await PUT(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toBe("Email is already in use");
    });

    it("should reject duplicate username when updating", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("owner") as any);

      await createTestAdmin({ username: "existinguser", email: "existing@test.com" });
      const admin = await createTestAdmin({ username: "otheruser", email: "other@test.com" });

      const req = new NextRequest("http://localhost:3000/api/admins", {
        method: "PUT",
        body: JSON.stringify({
          _id: admin._id.toString(),
          first_name: "Test",
          last_name: "Test",
          username: "existinguser",
          email: "other@test.com",
          role: "admin",
          password: "",
        }),
      });

      const response = await PUT(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toBe("Username is already taken");
    });

    it("should return 400 when ID is not provided", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("owner") as any);

      const req = new NextRequest("http://localhost:3000/api/admins", {
        method: "PUT",
        body: JSON.stringify({
          username: "updated",
        }),
      });

      const response = await PUT(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toBe("Admin ID is required");
    });

    it("should return 404 for non-existent admin", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("owner") as any);

      const fakeId = "507f1f77bcf86cd799439011";
      const req = new NextRequest("http://localhost:3000/api/admins", {
        method: "PUT",
        body: JSON.stringify({
          _id: fakeId,
          first_name: "Test",
          last_name: "Test",
          username: "updated",
          email: "updated@test.com",
          role: "admin",
          password: "",
        }),
      });

      const response = await PUT(req);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.message).toBe("Admin not found");
    });

    it("should allow updating own email to same value", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("owner") as any);

      const admin = await createTestAdmin({ email: "same@test.com" });

      const req = new NextRequest("http://localhost:3000/api/admins", {
        method: "PUT",
        body: JSON.stringify({
          _id: admin._id.toString(),
          first_name: admin.first_name,
          last_name: admin.last_name,
          username: admin.username,
          email: "same@test.com",
          role: admin.role,
          password: "",
        }),
      });

      const response = await PUT(req);

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/admins", () => {
    it("should require authentication", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/admins", {
        method: "DELETE",
        body: JSON.stringify({ _id: "507f1f77bcf86cd799439011" }),
      });

      const response = await DELETE(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain("Unauthorized");
    });

    it("should require owner role", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const admin = await createTestAdmin();

      const req = new NextRequest("http://localhost:3000/api/admins", {
        method: "DELETE",
        body: JSON.stringify({ _id: admin._id.toString() }),
      });

      const response = await DELETE(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toContain("Unauthorized");
    });

    it("should delete admin successfully", async () => {
      const mockSession = createMockSession("owner") as any;
      mockGetServerSession.mockResolvedValue(mockSession);

      const admin = await createTestAdmin();

      const req = new NextRequest("http://localhost:3000/api/admins", {
        method: "DELETE",
        body: JSON.stringify({ _id: admin._id.toString() }),
      });

      const response = await DELETE(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("Admin account deleted");

      // Verify admin was deleted
      const deletedAdmin = await Admins.findById(admin._id);
      expect(deletedAdmin).toBeNull();
    });

    it("should prevent deleting own account", async () => {
      const owner = await createTestOwner();
      const mockSession = {
        user: {
          _id: owner._id.toString(),
          email: owner.email,
          username: owner.username,
          first_name: owner.first_name,
          last_name: owner.last_name,
          role: "owner",
        },
      };
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const req = new NextRequest("http://localhost:3000/api/admins", {
        method: "DELETE",
        body: JSON.stringify({ _id: owner._id.toString() }),
      });

      const response = await DELETE(req);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.message).toBe("You cannot delete your own account.");

      // Verify admin still exists
      const existingAdmin = await Admins.findById(owner._id);
      expect(existingAdmin).not.toBeNull();
    });

    it("should return 400 when ID is not provided", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("owner") as any);

      const req = new NextRequest("http://localhost:3000/api/admins", {
        method: "DELETE",
        body: JSON.stringify({}),
      });

      const response = await DELETE(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toBe("Admin ID is required");
    });

    it("should return 404 for non-existent admin", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("owner") as any);

      const fakeId = "507f1f77bcf86cd799439011";
      const req = new NextRequest("http://localhost:3000/api/admins", {
        method: "DELETE",
        body: JSON.stringify({ _id: fakeId }),
      });

      const response = await DELETE(req);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.message).toBe("Admin not found");
    });

    it("should allow owner to delete other admins", async () => {
      const mockSession = createMockSession("owner") as any;
      mockGetServerSession.mockResolvedValue(mockSession);

      const admin1 = await createTestAdmin({ username: "admin1", email: "admin1@test.com" });
      const admin2 = await createTestAdmin({ username: "admin2", email: "admin2@test.com" });

      const req = new NextRequest("http://localhost:3000/api/admins", {
        method: "DELETE",
        body: JSON.stringify({ _id: admin1._id.toString() }),
      });

      const response = await DELETE(req);

      expect(response.status).toBe(200);

      const deletedAdmin = await Admins.findById(admin1._id);
      expect(deletedAdmin).toBeNull();

      const remainingAdmin = await Admins.findById(admin2._id);
      expect(remainingAdmin).not.toBeNull();
    });
  });
});
