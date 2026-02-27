import connectToDB from "@/app/lib/mongoose";
import Admins, { Admin } from "@/app/models/admin.model";
import { AggregatePaginateModel, PaginateModel } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";

export const dynamic = "force-dynamic";

/**
 * Escape special regex characters to prevent NoSQL injection
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(req: NextRequest) {
  // Require admin authorization
  const session = await getServerSession(authOptions);
  if (!session?.user || !["owner", "admin", "moderator"].includes(session.user.role)) {
    return NextResponse.json(
      { message: "Unauthorized. Admin access required." },
      { status: 401 }
    );
  }

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
      // const aggregate = Admins.aggregate([
      //   {
      //     $search: {
      //       index: "adminSearchWildcard",
      //       wildcard: {
      //         query: `*${searchedKeyword}*`,
      //         path: ["first_name", "last_name", "email", "username"],
      //         allowAnalyzedField: true,
      //       },
      //     },
      //   },
      //   {
      //     $project: {
      //       _id: 1,
      //       first_name: 1,
      //       last_name: 1,
      //       email: 1,
      //       username: 1,
      //       role: 1,
      //     },
      //   },
      // ]);
      const escapedKeyword = escapeRegex(searchedKeyword);
      const regex = new RegExp(escapedKeyword, "i"); // Case-insensitive partial match

      const aggregate = Admins.aggregate([
        {
          $match: {
            $or: [
              { first_name: { $regex: regex } },
              { last_name: { $regex: regex } },
              { email: { $regex: regex } },
              { username: { $regex: regex } },
            ],
          },
        },
        {
          $project: {
            _id: 1,
            first_name: 1,
            last_name: 1,
            email: 1,
            username: 1,
            role: 1,
          },
        },
      ]);

      const searchedAdmins = await (
        Admins as AggregatePaginateModel<Admin>
      ).aggregatePaginate(aggregate, {
        ...options,
        sort: { createdAt: -1 },
      });
      return NextResponse.json({
        total: searchedAdmins.totalDocs,
        totalPages: searchedAdmins.totalPages,
        admins: searchedAdmins.docs,
      });
    }
    let query: any = {};

    const filteredAdmins = await (Admins as PaginateModel<Admin>).paginate(
      query,
      {
        ...options,
        sort: { createdAt: -1 },
      }
    );

    return NextResponse.json({
      total: filteredAdmins.totalDocs,
      totalPages: filteredAdmins.totalPages,
      admins: filteredAdmins.docs,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal server error" });
  }
}
