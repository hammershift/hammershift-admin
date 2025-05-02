import clientPromise from "@/app/lib/mongoDB";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../auth/[...nextauth]/options";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import connectToDB from "@/app/lib/mongoose";
import Users from "@/app/models/user.model";

export const dynamic = "force-dynamic";

// to get users
export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const user_id = req.nextUrl.searchParams.get("user_id");
    const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
    const limit = Number(req.nextUrl.searchParams.get("limit"));

    // api/users?user_id=<insert id> to get a specific user
    if (user_id) {
      const user = Users.findOne(
        { _id: new ObjectId(user_id) },
        { projection: { password: 0 } }
      );
      if (user) {
        return NextResponse.json(user, { status: 200 });
      } else {
        return NextResponse.json(
          { message: "Cannot find User" },
          { status: 404 }
        );
      }
    }

    // api/users to get all users that are active and are not AI
    const users = await Users.find({ isActive: true, isAI: false })
      .limit(limit)
      .skip(offset);

    if (users) {
      return NextResponse.json(
        { total: users.length, users: users },
        { status: 200 }
      );
    } else {
      return NextResponse.json({ message: "No users found" }, { status: 404 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal server error" });
  }
}

// FIXME: to create user URL: /api/users (NOT WORKING YET)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "owner" && session?.user.role !== "admin") {
    return NextResponse.json(
      {
        message:
          "Unauthorized! Your role does not have access to this function",
      },
      { status: 400 }
    );
  }
  try {
    await connectToDB();
    const requestBody = await req.json();
    const createData: { [key: string]: any } = {};
    if (requestBody) {
      Object.keys(requestBody).forEach((key) => {
        createData[key] = requestBody[key] as string | boolean | number;
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createData.password, salt);
    const user = new Users({ ...createData, password: hashedPassword });
    user.save();

    if (user) {
      return NextResponse.json(
        { message: "user has been created" },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { message: "Cannot create user" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal server error" });
  }
}

// to edit user URL: /api/users/edit?user_id=657ab7edd422075ea7871f65
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "owner" && session?.user.role !== "admin") {
    console.log("User is Authorized!");
    return NextResponse.json(
      {
        message:
          "Unauthorized! Your role does not have access to this function",
      },
      { status: 400 }
    );
  }

  try {
    await connectToDB();
    const user_id = req.nextUrl.searchParams.get("user_id");

    const requestBody = await req.json();
    const editData: { [key: string]: string | boolean | number } = {};
    if (requestBody) {
      Object.keys(requestBody).forEach((key) => {
        editData[key] = requestBody[key] as string | boolean | number;
      });
    }

    if (user_id) {
      const user = await Users.findOneAndUpdate(
        { _id: new ObjectId(user_id) },
        { $set: editData },
        {
          returnDocument: "after",
          projection: { password: 0 },
        }
      );

      if (user) {
        return NextResponse.json(user, { status: 200 });
      } else {
        return NextResponse.json(
          { message: "Cannot find User" },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { message: "No ID has been provided" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal server error" });
  }
}
