import connectToDB from "@/app/lib/mongoose";
import Comments, { Comment } from "@/app/models/comment.model";
import { AggregatePaginateModel, PaginateModel } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
    const limit = Number(req.nextUrl.searchParams.get("limit")) || 5;
    const searchedKeyword = req.nextUrl.searchParams.get("search");

    const options = {
      offset: offset,
      limit: limit,
    };
    if (searchedKeyword) {
      // const aggregate = Comments.aggregate([
      //   {
      //     $search: {
      //       index: "commentSearchWildcard",
      //       wildcard: {
      //         query: `*${searchedKeyword}*`,
      //         path: ["user.username", "comment"],
      //         allowAnalyzedField: true,
      //       },
      //     },
      //   },
      //   {
      //     $project: {
      //       _id: 1,
      //       comment: 1,
      //       pageID: 1,
      //       pageType: 1,
      //       parentID: 1,
      //       user: 1,
      //       likes: 1,
      //       dislikes: 1,
      //       createdAt: 1,
      //       isDeleted: 1,
      //       deletedAt: 1,
      //     },
      //   },
      // ]);
      const aggregate = Comments.aggregate([
        {
          $match: {
            $or: [
              { "user.username": { $regex: searchedKeyword, $options: "i" } },
              { comment: { $regex: searchedKeyword, $options: "i" } },
            ],
          },
        },
        {
          $project: {
            _id: 1,
            comment: 1,
            pageID: 1,
            pageType: 1,
            parentID: 1,
            user: 1,
            likes: 1,
            dislikes: 1,
            createdAt: 1,
            isDeleted: 1,
            deletedAt: 1,
          },
        },
      ]);

      const searchedComments = await (
        Comments as AggregatePaginateModel<Comment>
      ).aggregatePaginate(aggregate, {
        ...options,
        sort: { createdAt: -1 },
      });
      console.log(searchedComments);
      return NextResponse.json({
        total: searchedComments.totalDocs,
        totalPages: searchedComments.totalPages,
        comments: searchedComments.docs,
      });
    }
    let query: any = {};

    const filteredComments = await (
      Comments as PaginateModel<Comment>
    ).paginate(query, {
      ...options,
      sort: { createdAt: -1 },
    });

    return NextResponse.json({
      total: filteredComments.totalDocs,
      totalPages: filteredComments.totalPages,
      comments: filteredComments.docs,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal server error" });
  }
}
