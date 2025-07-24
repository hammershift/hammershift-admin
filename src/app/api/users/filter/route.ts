import connectToDB from "@/app/lib/mongoose";
import Users, { User } from "@/app/models/user.model";
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
      // const aggregate = Users.aggregate([
      //   {
      //     $search: {
      //       index: "userSearchWildcard",
      //       wildcard: {
      //         query: `*${searchedKeyword}*`,
      //         path: ["username", "fullName", "email"],
      //         allowAnalyzedField: true,
      //       },
      //     },
      //   },
      //   {
      //     $project: {
      //       _id: 1,
      //       username: 1,
      //       fullName: 1,
      //       email: 1,
      //       balance: 1,
      //       isActive: 1,
      //       isBanned: 1,
      //       provider: 1,
      //       about: 1,
      //       createdAt: 1,
      //       updatedAt: 1,
      //       role: 1,
      //       agentProperties: 1,
      //     },
      //   },
      // ]);
      const aggregate = Users.aggregate([
        {
          $match: {
            $or: [
              { username: { $regex: searchedKeyword, $options: "i" } },
              { fullName: { $regex: searchedKeyword, $options: "i" } },
              { email: { $regex: searchedKeyword, $options: "i" } },
            ],
          },
        },
        {
          $project: {
            _id: 1,
            username: 1,
            fullName: 1,
            email: 1,
            balance: 1,
            isActive: 1,
            isBanned: 1,
            provider: 1,
            about: 1,
            createdAt: 1,
            updatedAt: 1,
            role: 1,
            agentProperties: 1,
          },
        },
      ]);

      const searchedUsers = await (
        Users as AggregatePaginateModel<User>
      ).aggregatePaginate(aggregate, {
        ...options,
        sort: { createdAt: -1 },
      });
      return NextResponse.json({
        total: searchedUsers.totalDocs,
        totalPages: searchedUsers.totalPages,
        users: searchedUsers.docs,
      });
    }
    let query: any = {};

    const filteredUsers = await (Users as PaginateModel<User>).paginate(query, {
      ...options,
      sort: { createdAt: -1 },
    });

    return NextResponse.json({
      total: filteredUsers.totalDocs,
      totalPages: filteredUsers.totalPages,
      users: filteredUsers.docs,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal server error" });
  }
}
