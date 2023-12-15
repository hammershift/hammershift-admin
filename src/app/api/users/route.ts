import connectToDB from "@/app/lib/mongoose";
import Users from "@/app/models/user.model";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic'

// to get users
export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const user_id = req.nextUrl.searchParams.get('user_id');
    const offset = Number(req.nextUrl.searchParams.get('offset')) || 0;
    const limit = Number(req.nextUrl.searchParams.get('limit'));

    // api/users?user_id=213123 to get a specific user
    if (user_id) {
      const user = await Users.findOne({$and:[{ _id: user_id }, {isActive: true}]}).select("-password");
      if (user) {
        return NextResponse.json(user, {status: 200});
      } else {
        return NextResponse.json({message: "Cannot find User"}, {status: 404});
      }
    } 

    // api/users to get all users that are active
    const users = await Users.find({isActive: true}).limit(limit).skip(offset);

    if(users){
      return NextResponse.json({ total: users.length, users: users  }, {status: 200});
    }else{
      return NextResponse.json({ message: "No users found"  }, {status: 404});
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: "Internal server error" });
  }
}

