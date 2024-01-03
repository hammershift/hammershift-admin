import connectToDB from "@/app/lib/mongoose";
import Users from "@/app/models/user.model";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// http://localhost:3000/api/users/filters?search=john
// can also work with filter and sort
// space are replaced with %20
export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const offset = Number(req.nextUrl.searchParams.get('offset')) || 0;
    const limit = Number(req.nextUrl.searchParams.get('limit'));
    const searchedKeyword = req.nextUrl.searchParams.get('search');


 if (searchedKeyword) {
      const searchedUsers = await Users.find({
        $and: [
          { "isActive": true },
          {
            $or: [
              { "fullName": { $regex: searchedKeyword, $options: "i" }},
              //{ "_id": { $regex: searchedKeyword, $options: "i" }},
              { "username": { $regex: searchedKeyword, $options: "i" }},
              { "email": { $regex: searchedKeyword, $options: "i" }},
              { "country": { $regex: searchedKeyword, $options: "i" }},
              { "state": { $regex: searchedKeyword, $options: "i" }},
            ]
          }
        ]
      })
        .limit(limit)
        .skip(offset)
      if (searchedUsers) {
        return NextResponse.json({ total: searchedUsers.length, users: searchedUsers }, {status: 200});
      } else {
        return NextResponse.json({message: "no search result" }, {status: 404});
      }
    }
  

  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: 'Internal server error' })
  }
}