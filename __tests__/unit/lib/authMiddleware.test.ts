import { hasRole, requireAuth } from "@/app/lib/authMiddleware";
import { getServerSession } from "next-auth";
import { createMockSession } from "../../helpers/testFixtures";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe("Auth Middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("hasRole", () => {
    it("should return true if user has required role", () => {
      const session = createMockSession("admin") as any;
      expect(hasRole(session, ["admin"])).toBe(true);
    });

    it("should return true if user has one of required roles", () => {
      const session = createMockSession("admin") as any;
      expect(hasRole(session, ["owner", "admin", "moderator"])).toBe(true);
    });

    it("should return false if user does not have required role", () => {
      const session = createMockSession("moderator") as any;
      expect(hasRole(session, ["owner", "admin"])).toBe(false);
    });

    it("should return false if session is null", () => {
      expect(hasRole(null, ["admin"])).toBe(false);
    });

    it("should return false if session has no role", () => {
      const session = { user: { id: "123", email: "test@test.com" } } as any;
      expect(hasRole(session, ["admin"])).toBe(false);
    });
  });

  describe("requireAuth", () => {
    it("should return session if authenticated", async () => {
      const mockSession = createMockSession("admin");
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireAuth();

      expect("session" in result).toBe(true);
      if ("session" in result) {
        expect(result.session.user.role).toBe("admin");
      }
    });

    it("should return error if not authenticated", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const result = await requireAuth();

      expect("error" in result).toBe(true);
      if ("error" in result) {
        const response = await result.error.json();
        expect(response.message).toContain("Unauthorized");
        expect(result.error.status).toBe(401);
      }
    });

    it("should return session if user has required role", async () => {
      const mockSession = createMockSession("admin");
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireAuth(["admin", "owner"]);

      expect("session" in result).toBe(true);
    });

    it("should return error if user lacks required role", async () => {
      const mockSession = createMockSession("moderator");
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireAuth(["admin", "owner"]);

      expect("error" in result).toBe(true);
      if ("error" in result) {
        const response = await result.error.json();
        expect(response.message).toContain("Required roles");
        expect(result.error.status).toBe(403);
      }
    });

    it("should accept owner role", async () => {
      const mockSession = createMockSession("owner");
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireAuth(["owner", "admin"]);

      expect("session" in result).toBe(true);
    });

    it("should accept moderator role when specified", async () => {
      const mockSession = createMockSession("moderator");
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireAuth(["owner", "admin", "moderator"]);

      expect("session" in result).toBe(true);
    });

    it("should work without role restrictions", async () => {
      const mockSession = createMockSession("user");
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const result = await requireAuth();

      expect("session" in result).toBe(true);
    });
  });
});
