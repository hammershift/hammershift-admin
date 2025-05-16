import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import clientPromise from "@/app/lib/mongoDB";
import { ObjectId } from "mongodb";
import connectToDB from "@/app/lib/mongoose";
import Comments from "@/app/models/comment.model";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const id = req.nextUrl.searchParams.get("id");
    const parent_id = req.nextUrl.searchParams.get("parent_id");
    const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
    const limit = Number(req.nextUrl.searchParams.get("limit")) || 0;
    const sort = req.nextUrl.searchParams.get("sort");
    const filter = {
      $or: [{ isDeleted: { $exists: false } }, { isDeleted: { $ne: true } }],
    };

    switch (sort) {
      case "newest": {
        const newestComments = await Comments.find(filter)
          .limit(limit)
          .skip(offset)
          .sort({ createdAt: -1 });
        return NextResponse.json({ comments: newestComments }, { status: 200 });
      }

      case "oldest": {
        const oldestComments = await Comments.find(filter)
          .limit(limit)
          .skip(offset)
          .sort({ createdAt: 1 });
        return NextResponse.json({ comments: oldestComments }, { status: 200 });
      }

      case "likes": {
        const commentsByLikes = await Comments.aggregate([
          { $match: filter },
          {
            $addFields: {
              likesCount: { $size: "$likes" },
            },
          },
          { $sort: { likesCount: -1 } },
          { $limit: limit },
          { $skip: offset },
        ]);

        return NextResponse.json(
          { comments: commentsByLikes },
          { status: 200 }
        );
      }

      case "dislikes": {
        const commentsByDislikes = await Comments.aggregate([
          { $match: filter },
          {
            $addFields: {
              dislikesCount: { $size: "$dislikes" },
            },
          },
          { $sort: { dislikesCount: -1 } },
          { $limit: limit },
          { $skip: offset },
        ]);

        return NextResponse.json(
          { comments: commentsByDislikes },
          { status: 200 }
        );
      }

      default:
        break;
    }
    if (id) {
      const comment = await Comments.findOne({
        _id: new ObjectId(id),
        ...filter,
      });

      return NextResponse.json({ comment: comment }, { status: 200 });
    }

    if (parent_id) {
      const comment = await Comments.find({
        parentID: new ObjectId(parent_id),
        ...filter,
      });

      return NextResponse.json({ comment: comment }, { status: 200 });
    }
    const comments = await Comments.find(filter)
      .limit(limit)
      .skip(offset)
      .sort({ createdAt: -1 });
    return NextResponse.json({ comments: comments }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal server error" });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const { ids } = await req.json();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 400 });
  }

  if (!ids || !Array.isArray(ids)) {
    return NextResponse.json(
      { message: "Error parsing JSON from request body" },
      { status: 400 }
    );
  }

  try {
    await connectToDB();

    const objectIDs = ids.map((id: string) => new ObjectId(id));
    const now = new Date();

    // Soft-delete main comments
    await Comments.updateMany(
      { _id: { $in: objectIDs } },
      {
        $set: {
          isDeleted: true,
          deletedAt: now,
        },
      }
    );

    // Soft-delete replies
    // await Comments.updateMany(
    //   { parentID: { $in: objectIDs } },
    //   {
    //     $set: {
    //       isDeleted: true,
    //       deletedAt: now,
    //     },
    //   }
    // );

    return NextResponse.json(
      { message: "Comments soft-deleted" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in soft-deleting comments", error);
    return NextResponse.json(
      { message: "Server error in deleting comment" },
      { status: 500 }
    );
  }
}
