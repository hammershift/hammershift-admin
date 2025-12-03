import { NextRequest } from "next/server";
import { GET, DELETE } from "@/app/api/comments/route";
import { setupTestDb, teardownTestDb, resetTestDb } from "../../helpers/testDb";
import { createTestComment, createMockSession } from "../../helpers/testFixtures";
import { getServerSession } from "next-auth";
import Comments from "@/app/models/comment.model";
import { Types } from "mongoose";

// Mock next-auth
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe("Comments API", () => {
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

  describe("GET /api/comments", () => {
    it("should return all comments without authentication", async () => {
      await createTestComment({ comment: "First comment" });
      await createTestComment({ comment: "Second comment" });

      const req = new NextRequest("http://localhost:3000/api/comments");
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.comments).toHaveLength(2);
    });

    it("should return single comment by ID", async () => {
      const comment = await createTestComment({ comment: "Test comment" });

      const req = new NextRequest(`http://localhost:3000/api/comments?id=${comment._id}`);
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.comment._id.toString()).toBe(comment._id.toString());
      expect(data.comment.comment).toBe("Test comment");
    });

    it("should return comments by parent_id", async () => {
      const parentId = new Types.ObjectId();
      await createTestComment({ comment: "Parent comment", _id: parentId });
      await createTestComment({
        comment: "Reply 1",
        parentID: parentId,
      });
      await createTestComment({
        comment: "Reply 2",
        parentID: parentId,
      });
      await createTestComment({ comment: "Other comment" });

      const req = new NextRequest(`http://localhost:3000/api/comments?parent_id=${parentId}`);
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.comment).toHaveLength(2);
      expect(data.comment[0].comment).toBe("Reply 1");
      expect(data.comment[1].comment).toBe("Reply 2");
    });

    it("should exclude soft-deleted comments", async () => {
      await createTestComment({ comment: "Active comment" });
      await createTestComment({
        comment: "Deleted comment",
        isDeleted: true,
        deletedAt: new Date(),
      });

      const req = new NextRequest("http://localhost:3000/api/comments");
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.comments).toHaveLength(1);
      expect(data.comments[0].comment).toBe("Active comment");
    });

    it("should support pagination", async () => {
      for (let i = 0; i < 10; i++) {
        await createTestComment({ comment: `Comment ${i}` });
      }

      const req = new NextRequest("http://localhost:3000/api/comments?offset=0&limit=5");
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.comments).toHaveLength(5);
    });

    it("should sort by newest", async () => {
      const comment1 = await createTestComment({
        comment: "Old comment",
        createdAt: new Date("2024-01-01"),
      });
      const comment2 = await createTestComment({
        comment: "New comment",
        createdAt: new Date("2024-12-01"),
      });
      const comment3 = await createTestComment({
        comment: "Middle comment",
        createdAt: new Date("2024-06-01"),
      });

      const req = new NextRequest("http://localhost:3000/api/comments?sort=newest");
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.comments).toHaveLength(3);
      expect(data.comments[0].comment).toBe("New comment");
      expect(data.comments[1].comment).toBe("Middle comment");
      expect(data.comments[2].comment).toBe("Old comment");
    });

    it("should sort by oldest", async () => {
      await createTestComment({
        comment: "Old comment",
        createdAt: new Date("2024-01-01"),
      });
      await createTestComment({
        comment: "New comment",
        createdAt: new Date("2024-12-01"),
      });
      await createTestComment({
        comment: "Middle comment",
        createdAt: new Date("2024-06-01"),
      });

      const req = new NextRequest("http://localhost:3000/api/comments?sort=oldest");
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.comments).toHaveLength(3);
      expect(data.comments[0].comment).toBe("Old comment");
      expect(data.comments[1].comment).toBe("Middle comment");
      expect(data.comments[2].comment).toBe("New comment");
    });

    it("should sort by likes count", async () => {
      await createTestComment({
        comment: "Low likes",
        likes: [
          { userId: "user1", username: "user1" },
        ] as any,
      });
      await createTestComment({
        comment: "High likes",
        likes: [
          { userId: "user1", username: "user1" },
          { userId: "user2", username: "user2" },
          { userId: "user3", username: "user3" },
        ] as any,
      });
      await createTestComment({
        comment: "Medium likes",
        likes: [
          { userId: "user1", username: "user1" },
          { userId: "user2", username: "user2" },
        ] as any,
      });

      const req = new NextRequest("http://localhost:3000/api/comments?sort=likes&limit=10");
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.comments).toHaveLength(3);
      expect(data.comments[0].comment).toBe("High likes");
      expect(data.comments[1].comment).toBe("Medium likes");
      expect(data.comments[2].comment).toBe("Low likes");
    });

    it("should sort by dislikes count", async () => {
      await createTestComment({
        comment: "Low dislikes",
        dislikes: [
          { userId: "user1", username: "user1" },
        ] as any,
      });
      await createTestComment({
        comment: "High dislikes",
        dislikes: [
          { userId: "user1", username: "user1" },
          { userId: "user2", username: "user2" },
          { userId: "user3", username: "user3" },
        ] as any,
      });
      await createTestComment({
        comment: "Medium dislikes",
        dislikes: [
          { userId: "user1", username: "user1" },
          { userId: "user2", username: "user2" },
        ] as any,
      });

      const req = new NextRequest("http://localhost:3000/api/comments?sort=dislikes&limit=10");
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.comments).toHaveLength(3);
      expect(data.comments[0].comment).toBe("High dislikes");
      expect(data.comments[1].comment).toBe("Medium dislikes");
      expect(data.comments[2].comment).toBe("Low dislikes");
    });

    it("should apply sort with pagination", async () => {
      for (let i = 0; i < 10; i++) {
        await createTestComment({
          comment: `Comment ${i}`,
          createdAt: new Date(2024, 0, i + 1),
        });
      }

      const req = new NextRequest(
        "http://localhost:3000/api/comments?sort=oldest&offset=2&limit=3"
      );
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.comments).toHaveLength(3);
      expect(data.comments[0].comment).toBe("Comment 2");
    });

    it("should return empty array for non-existent parent_id", async () => {
      const fakeParentId = new Types.ObjectId();

      const req = new NextRequest(`http://localhost:3000/api/comments?parent_id=${fakeParentId}`);
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.comment).toHaveLength(0);
    });

    it("should handle comments with no likes or dislikes", async () => {
      await createTestComment({
        comment: "No reactions",
        likes: [],
        dislikes: [],
      });

      const req = new NextRequest("http://localhost:3000/api/comments");
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.comments).toHaveLength(1);
      expect(data.comments[0].likes).toEqual([]);
      expect(data.comments[0].dislikes).toEqual([]);
    });

    it("should default sort by newest when no sort parameter", async () => {
      const oldComment = await createTestComment({
        comment: "Old",
        createdAt: new Date("2024-01-01"),
      });
      const newComment = await createTestComment({
        comment: "New",
        createdAt: new Date("2024-12-01"),
      });

      const req = new NextRequest("http://localhost:3000/api/comments");
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.comments[0].comment).toBe("New");
      expect(data.comments[1].comment).toBe("Old");
    });
  });

  describe("DELETE /api/comments", () => {
    it("should require authentication", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const comment = await createTestComment();

      const req = new NextRequest("http://localhost:3000/api/comments", {
        method: "DELETE",
        body: JSON.stringify({ ids: [comment._id.toString()] }),
      });

      const response = await DELETE(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toBe("Unauthorized");
    });

    it("should soft-delete single comment", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const comment = await createTestComment({ comment: "To be deleted" });

      const req = new NextRequest("http://localhost:3000/api/comments", {
        method: "DELETE",
        body: JSON.stringify({ ids: [comment._id.toString()] }),
      });

      const response = await DELETE(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("Comments soft-deleted");

      // Verify comment was soft-deleted
      const deletedComment = await Comments.findById(comment._id);
      expect(deletedComment?.isDeleted).toBe(true);
      expect(deletedComment?.deletedAt).toBeDefined();
    });

    it("should soft-delete multiple comments", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const comment1 = await createTestComment({ comment: "Comment 1" });
      const comment2 = await createTestComment({ comment: "Comment 2" });
      const comment3 = await createTestComment({ comment: "Comment 3" });

      const req = new NextRequest("http://localhost:3000/api/comments", {
        method: "DELETE",
        body: JSON.stringify({
          ids: [comment1._id.toString(), comment2._id.toString()],
        }),
      });

      const response = await DELETE(req);

      expect(response.status).toBe(200);

      // Verify comments were soft-deleted
      const deletedComment1 = await Comments.findById(comment1._id);
      const deletedComment2 = await Comments.findById(comment2._id);
      const remainingComment = await Comments.findById(comment3._id);

      expect(deletedComment1?.isDeleted).toBe(true);
      expect(deletedComment2?.isDeleted).toBe(true);
      expect(remainingComment?.isDeleted).toBeUndefined();
    });

    it("should return 400 if ids is not an array", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const req = new NextRequest("http://localhost:3000/api/comments", {
        method: "DELETE",
        body: JSON.stringify({ ids: "not-an-array" }),
      });

      const response = await DELETE(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toBe("Error parsing JSON from request body");
    });

    it("should return 400 if ids is missing", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const req = new NextRequest("http://localhost:3000/api/comments", {
        method: "DELETE",
        body: JSON.stringify({}),
      });

      const response = await DELETE(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toBe("Error parsing JSON from request body");
    });

    it("should handle empty ids array", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const req = new NextRequest("http://localhost:3000/api/comments", {
        method: "DELETE",
        body: JSON.stringify({ ids: [] }),
      });

      const response = await DELETE(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("Comments soft-deleted");
    });

    it("should handle non-existent comment IDs gracefully", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const fakeId1 = "507f1f77bcf86cd799439011";
      const fakeId2 = "507f1f77bcf86cd799439012";

      const req = new NextRequest("http://localhost:3000/api/comments", {
        method: "DELETE",
        body: JSON.stringify({ ids: [fakeId1, fakeId2] }),
      });

      const response = await DELETE(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe("Comments soft-deleted");
    });

    it("should set deletedAt timestamp when soft-deleting", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const comment = await createTestComment();
      const beforeDelete = new Date();

      const req = new NextRequest("http://localhost:3000/api/comments", {
        method: "DELETE",
        body: JSON.stringify({ ids: [comment._id.toString()] }),
      });

      await DELETE(req);

      const afterDelete = new Date();
      const deletedComment = await Comments.findById(comment._id);

      expect(deletedComment?.deletedAt).toBeDefined();
      expect(deletedComment?.deletedAt.getTime()).toBeGreaterThanOrEqual(beforeDelete.getTime());
      expect(deletedComment?.deletedAt.getTime()).toBeLessThanOrEqual(afterDelete.getTime());
    });

    it("should not affect already soft-deleted comments", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const originalDeletedAt = new Date("2024-01-01");
      const comment = await createTestComment({
        isDeleted: true,
        deletedAt: originalDeletedAt,
      });

      const req = new NextRequest("http://localhost:3000/api/comments", {
        method: "DELETE",
        body: JSON.stringify({ ids: [comment._id.toString()] }),
      });

      await DELETE(req);

      const deletedComment = await Comments.findById(comment._id);
      expect(deletedComment?.isDeleted).toBe(true);
      // DeletedAt should be updated to new timestamp
      expect(deletedComment?.deletedAt.getTime()).toBeGreaterThan(originalDeletedAt.getTime());
    });

    it("should allow moderator to delete comments", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("moderator") as any);

      const comment = await createTestComment();

      const req = new NextRequest("http://localhost:3000/api/comments", {
        method: "DELETE",
        body: JSON.stringify({ ids: [comment._id.toString()] }),
      });

      const response = await DELETE(req);

      expect(response.status).toBe(200);

      const deletedComment = await Comments.findById(comment._id);
      expect(deletedComment?.isDeleted).toBe(true);
    });

    it("should handle mix of valid and invalid IDs", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const comment = await createTestComment();
      const fakeId = "507f1f77bcf86cd799439011";

      const req = new NextRequest("http://localhost:3000/api/comments", {
        method: "DELETE",
        body: JSON.stringify({ ids: [comment._id.toString(), fakeId] }),
      });

      const response = await DELETE(req);

      expect(response.status).toBe(200);

      const deletedComment = await Comments.findById(comment._id);
      expect(deletedComment?.isDeleted).toBe(true);
    });

    it("should preserve comment data after soft-delete", async () => {
      mockGetServerSession.mockResolvedValue(createMockSession("admin") as any);

      const comment = await createTestComment({
        comment: "Original comment text",
        likes: [{ userId: "user1", username: "user1" }] as any,
      });

      const req = new NextRequest("http://localhost:3000/api/comments", {
        method: "DELETE",
        body: JSON.stringify({ ids: [comment._id.toString()] }),
      });

      await DELETE(req);

      const deletedComment = await Comments.findById(comment._id);
      expect(deletedComment?.comment).toBe("Original comment text");
      expect(deletedComment?.likes).toHaveLength(1);
    });
  });
});
