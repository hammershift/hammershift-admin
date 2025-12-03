import { NextRequest } from "next/server";
import {
  createAuditLog,
  logSuccess,
  logFailure,
  queryAuditLogs,
  getAuditStats,
  cleanupOldAuditLogs,
  AuditActions,
  AuditResources,
} from "@/app/lib/auditLogger";
import AuditLog from "@/app/models/auditLog.model";
import { setupTestDb, teardownTestDb, resetTestDb } from "../../helpers/testDb";
import { createTestUser } from "../../helpers/testFixtures";
import { Types } from "mongoose";

describe("Audit Logger", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await resetTestDb();
  });

  describe("createAuditLog", () => {
    it("should create an audit log entry", async () => {
      const user = await createTestUser();

      await createAuditLog({
        userId: user._id,
        username: user.username,
        userRole: "admin",
        action: AuditActions.USER_UPDATE,
        resource: AuditResources.USER,
        resourceId: user._id,
        method: "PUT",
        endpoint: "/api/users",
        status: "success",
      });

      const logs = await AuditLog.find({});
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe(AuditActions.USER_UPDATE);
      expect(logs[0].status).toBe("success");
    });

    it("should sanitize sensitive data", async () => {
      const user = await createTestUser();

      await createAuditLog({
        userId: user._id,
        username: user.username,
        userRole: "admin",
        action: AuditActions.USER_UPDATE,
        resource: AuditResources.USER,
        method: "PUT",
        endpoint: "/api/users",
        changes: {
          before: { email: "old@test.com", password: "secret123" },
          after: { email: "new@test.com", password: "newsecret456" },
        },
        status: "success",
      });

      const logs = await AuditLog.find({});
      expect(logs[0].changes?.before?.password).toBe("[REDACTED]");
      expect(logs[0].changes?.after?.password).toBe("[REDACTED]");
      expect(logs[0].changes?.before?.email).toBe("old@test.com");
    });

    it("should extract IP and user agent from request", async () => {
      const user = await createTestUser();

      const req = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          "x-forwarded-for": "192.168.1.1",
          "user-agent": "Mozilla/5.0",
        },
      });

      await createAuditLog({
        userId: user._id,
        username: user.username,
        userRole: "admin",
        action: AuditActions.USER_UPDATE,
        resource: AuditResources.USER,
        method: "PUT",
        endpoint: "/api/users",
        status: "success",
        req,
      });

      const logs = await AuditLog.find({});
      expect(logs[0].ipAddress).toBe("192.168.1.1");
      expect(logs[0].userAgent).toBe("Mozilla/5.0");
    });

    it("should not throw on error", async () => {
      // Pass invalid data to cause an error
      await expect(
        createAuditLog({
          userId: "invalid",
          username: "test",
          userRole: "admin",
          action: "test",
          resource: "Test",
          method: "GET",
          endpoint: "/test",
          status: "success",
        })
      ).resolves.not.toThrow();
    });
  });

  describe("logSuccess", () => {
    it("should create a success audit log", async () => {
      const user = await createTestUser();

      await logSuccess({
        userId: user._id,
        username: user.username,
        userRole: "admin",
        action: AuditActions.WAGER_CREATE,
        resource: AuditResources.WAGER,
        method: "POST",
        endpoint: "/api/wagers",
      });

      const logs = await AuditLog.find({});
      expect(logs[0].status).toBe("success");
      expect(logs[0].action).toBe(AuditActions.WAGER_CREATE);
    });
  });

  describe("logFailure", () => {
    it("should create a failure audit log with error message", async () => {
      const user = await createTestUser();

      await logFailure({
        userId: user._id,
        username: user.username,
        userRole: "admin",
        action: AuditActions.WAGER_CREATE,
        resource: AuditResources.WAGER,
        method: "POST",
        endpoint: "/api/wagers",
        errorMessage: "Insufficient balance",
      });

      const logs = await AuditLog.find({});
      expect(logs[0].status).toBe("failure");
      expect(logs[0].errorMessage).toBe("Insufficient balance");
    });
  });

  describe("queryAuditLogs", () => {
    beforeEach(async () => {
      const user1 = await createTestUser({ username: "user1", email: "user1@test.com" });
      const user2 = await createTestUser({ username: "user2", email: "user2@test.com" });

      // Create multiple audit logs
      await logSuccess({
        userId: user1._id,
        username: user1.username,
        userRole: "admin",
        action: AuditActions.USER_UPDATE,
        resource: AuditResources.USER,
        method: "PUT",
        endpoint: "/api/users",
      });

      await logSuccess({
        userId: user2._id,
        username: user2.username,
        userRole: "moderator",
        action: AuditActions.WAGER_CREATE,
        resource: AuditResources.WAGER,
        method: "POST",
        endpoint: "/api/wagers",
      });

      await logFailure({
        userId: user1._id,
        username: user1.username,
        userRole: "admin",
        action: AuditActions.TRANSACTION_APPROVE,
        resource: AuditResources.TRANSACTION,
        method: "POST",
        endpoint: "/api/transactions",
        errorMessage: "Insufficient funds",
      });
    });

    it("should query all logs", async () => {
      const result = await queryAuditLogs({});
      expect(result.logs).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it("should filter by userId", async () => {
      // Query using the existing user1's ID from beforeEach
      const allLogs = await AuditLog.find({ username: "user1" });
      const user1Id = allLogs[0].userId;

      const result = await queryAuditLogs({ userId: user1Id });
      expect(result.logs.length).toBeGreaterThan(0);
      expect(result.logs.every((log: any) => log.userId.toString() === user1Id.toString())).toBe(true);
    });

    it("should filter by action", async () => {
      const result = await queryAuditLogs({ action: AuditActions.USER_UPDATE });
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].action).toBe(AuditActions.USER_UPDATE);
    });

    it("should filter by resource", async () => {
      const result = await queryAuditLogs({ resource: AuditResources.WAGER });
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].resource).toBe(AuditResources.WAGER);
    });

    it("should filter by status", async () => {
      const result = await queryAuditLogs({ status: "failure" });
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].status).toBe("failure");
    });

    it("should support pagination", async () => {
      const result1 = await queryAuditLogs({ limit: 2, offset: 0 });
      expect(result1.logs).toHaveLength(2);
      expect(result1.hasMore).toBe(true);

      const result2 = await queryAuditLogs({ limit: 2, offset: 2 });
      expect(result2.logs).toHaveLength(1);
      expect(result2.hasMore).toBe(false);
    });

    it("should filter by date range", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = await queryAuditLogs({
        startDate: yesterday,
        endDate: tomorrow,
      });

      expect(result.logs.length).toBeGreaterThan(0);
    });
  });

  describe("getAuditStats", () => {
    beforeEach(async () => {
      const user1 = await createTestUser({ username: "statsuser1", email: "statsuser1@test.com" });
      const user2 = await createTestUser({ username: "statsuser2", email: "statsuser2@test.com" });

      // Create various audit logs
      for (let i = 0; i < 5; i++) {
        await logSuccess({
          userId: user1._id,
          username: user1.username,
          userRole: "admin",
          action: AuditActions.USER_UPDATE,
          resource: AuditResources.USER,
          method: "PUT",
          endpoint: "/api/users",
        });
      }

      for (let i = 0; i < 3; i++) {
        await logSuccess({
          userId: user2._id,
          username: user2.username,
          userRole: "moderator",
          action: AuditActions.WAGER_CREATE,
          resource: AuditResources.WAGER,
          method: "POST",
          endpoint: "/api/wagers",
        });
      }

      for (let i = 0; i < 2; i++) {
        await logFailure({
          userId: user1._id,
          username: user1.username,
          userRole: "admin",
          action: AuditActions.TRANSACTION_APPROVE,
          resource: AuditResources.TRANSACTION,
          method: "POST",
          endpoint: "/api/transactions",
          errorMessage: "Error",
        });
      }
    });

    it("should return correct statistics", async () => {
      const stats = await getAuditStats();

      expect(stats.totalLogs).toBe(10);
      expect(stats.successCount).toBe(8);
      expect(stats.failureCount).toBe(2);
      expect(stats.successRate).toBe("80.00");
    });

    it("should return top actions", async () => {
      const stats = await getAuditStats();

      expect(stats.topActions).toHaveLength(3);
      expect(stats.topActions[0]._id).toBe(AuditActions.USER_UPDATE);
      expect(stats.topActions[0].count).toBe(5);
    });

    it("should return top resources", async () => {
      const stats = await getAuditStats();

      expect(stats.topResources.length).toBeGreaterThan(0);
      expect(stats.topResources[0]._id).toBe(AuditResources.USER);
    });

    it("should return top users", async () => {
      const stats = await getAuditStats();

      expect(stats.topUsers.length).toBeGreaterThan(0);
      expect(stats.topUsers[0].count).toBeGreaterThanOrEqual(5);
    });

    it("should filter stats by date range", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const stats = await getAuditStats(yesterday, tomorrow);

      expect(stats.totalLogs).toBeGreaterThan(0);
    });
  });

  describe("cleanupOldAuditLogs", () => {
    it("should delete logs older than specified days", async () => {
      const user = await createTestUser();

      // Create a recent log
      await logSuccess({
        userId: user._id,
        username: user.username,
        userRole: "admin",
        action: AuditActions.USER_UPDATE,
        resource: AuditResources.USER,
        method: "PUT",
        endpoint: "/api/users",
      });

      // Create an old log
      const oldLog = new AuditLog({
        timestamp: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
        userId: user._id,
        username: user.username,
        userRole: "admin",
        action: AuditActions.USER_UPDATE,
        resource: AuditResources.USER,
        method: "PUT",
        endpoint: "/api/users",
        ipAddress: "127.0.0.1",
        userAgent: "test",
        status: "success",
      });
      await oldLog.save();

      // Cleanup logs older than 90 days
      const result = await cleanupOldAuditLogs(90);

      expect(result.deleted).toBe(1);

      const remainingLogs = await AuditLog.find({});
      expect(remainingLogs).toHaveLength(1);
    });
  });

  describe("AuditActions and AuditResources", () => {
    it("should have predefined action constants", () => {
      expect(AuditActions.USER_CREATE).toBe("user.create");
      expect(AuditActions.WAGER_REFUND).toBe("wager.refund");
      expect(AuditActions.TRANSACTION_APPROVE).toBe("transaction.approve");
    });

    it("should have predefined resource constants", () => {
      expect(AuditResources.USER).toBe("User");
      expect(AuditResources.WAGER).toBe("Wager");
      expect(AuditResources.TRANSACTION).toBe("Transaction");
    });
  });
});
