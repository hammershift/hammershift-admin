import { withTransaction, toObjectId, isValidObjectId } from "@/app/lib/dbHelpers";
import { setupTestDb, teardownTestDb, resetTestDb } from "../../helpers/testDb";
import { createTestUser } from "../../helpers/testFixtures";
import Users from "@/app/models/user.model";
import mongoose from "mongoose";

describe("Database Helpers", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await resetTestDb();
  });

  describe("toObjectId", () => {
    it("should convert valid string to ObjectId", () => {
      const id = "507f1f77bcf86cd799439011";
      const objectId = toObjectId(id);
      expect(objectId).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(objectId.toString()).toBe(id);
    });

    it("should throw error for invalid string", () => {
      expect(() => toObjectId("invalid-id")).toThrow("Invalid ObjectId");
    });

    it("should throw error for empty string", () => {
      expect(() => toObjectId("")).toThrow("Invalid ObjectId");
    });
  });

  describe("isValidObjectId", () => {
    it("should return true for valid ObjectId string", () => {
      expect(isValidObjectId("507f1f77bcf86cd799439011")).toBe(true);
    });

    it("should return false for invalid string", () => {
      expect(isValidObjectId("invalid-id")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isValidObjectId("")).toBe(false);
    });

    it("should return false for null", () => {
      expect(isValidObjectId(null as any)).toBe(false);
    });
  });

  describe("withTransaction", () => {
    it("should commit transaction on success", async () => {
      const user = await createTestUser({ balance: 1000 });

      const result = await withTransaction(async (session) => {
        await Users.findByIdAndUpdate(
          user._id,
          { $set: { balance: 1500 } },
          { session }
        );
        return "success";
      });

      expect(result).toBe("success");

      // Verify change persisted
      const updatedUser = await Users.findById(user._id);
      expect(updatedUser?.balance).toBe(1500);
    });

    it("should rollback transaction on error", async () => {
      const user = await createTestUser({ balance: 1000 });

      try {
        await withTransaction(async (session) => {
          await Users.findByIdAndUpdate(
            user._id,
            { $set: { balance: 1500 } },
            { session }
          );

          // Throw error to trigger rollback
          throw new Error("Intentional error");
        });
      } catch (error: any) {
        expect(error.message).toBe("Intentional error");
      }

      // Verify change was rolled back
      const unchangedUser = await Users.findById(user._id);
      expect(unchangedUser?.balance).toBe(1000);
    });

    it("should handle multiple operations in transaction", async () => {
      const user1 = await createTestUser({ username: "user1", email: "user1@test.com", balance: 1000 });
      const user2 = await createTestUser({ username: "user2", email: "user2@test.com", balance: 500 });

      await withTransaction(async (session) => {
        // Transfer money from user1 to user2
        await Users.findByIdAndUpdate(
          user1._id,
          { $inc: { balance: -200 } },
          { session }
        );
        await Users.findByIdAndUpdate(
          user2._id,
          { $inc: { balance: 200 } },
          { session }
        );
      });

      const updatedUser1 = await Users.findById(user1._id);
      const updatedUser2 = await Users.findById(user2._id);

      expect(updatedUser1?.balance).toBe(800);
      expect(updatedUser2?.balance).toBe(700);
    });

    it("should rollback all operations on error", async () => {
      const user1 = await createTestUser({ username: "user3", email: "user3@test.com", balance: 1000 });
      const user2 = await createTestUser({ username: "user4", email: "user4@test.com", balance: 500 });

      try {
        await withTransaction(async (session) => {
          await Users.findByIdAndUpdate(
            user1._id,
            { $inc: { balance: -200 } },
            { session }
          );
          await Users.findByIdAndUpdate(
            user2._id,
            { $inc: { balance: 200 } },
            { session }
          );

          // Throw error after both operations
          throw new Error("Transaction failed");
        });
      } catch (error) {
        // Expected
      }

      // Verify both changes were rolled back
      const unchangedUser1 = await Users.findById(user1._id);
      const unchangedUser2 = await Users.findById(user2._id);

      expect(unchangedUser1?.balance).toBe(1000);
      expect(unchangedUser2?.balance).toBe(500);
    });

    it("should return result from callback", async () => {
      const result = await withTransaction(async (session) => {
        const user = await createTestUser({ username: "testuser5", email: "testuser5@test.com" });
        return { userId: user._id.toString(), username: user.username };
      });

      expect(result.username).toBe("testuser5");
      expect(mongoose.Types.ObjectId.isValid(result.userId)).toBe(true);
    });
  });
});
