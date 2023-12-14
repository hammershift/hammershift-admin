import connectToDB from "@/app/lib/mongoose";
import Users from "@/app/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const user_id = req.nextUrl.searchParams.get('user_id');
    const offset = Number(req.nextUrl.searchParams.get('offset')) || 0;
    const limit = Number(req.nextUrl.searchParams.get('limit'));

    // api/users?user_id=213123 to get a specific user
    if (user_id) {
      const user = await Users.findOne({ _id: user_id }).select("-password");
      return NextResponse.json(user);
    }
    // api/users to get all users
    const users = await Users.find().limit(limit).skip(offset);
    return NextResponse.json({ total: users.length, users: users  });
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: "Internal server error" });
  }
}