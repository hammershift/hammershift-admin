import clientPromise from "@/app/lib/mongoDB";
import connectToDB from "@/app/lib/mongoose";
import Admins from "@/app/models/admin.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { username } = await req.json();

  try {
    await connectToDB();

    const response = {
      usernameExists: false,
    };

    if (username) {
      const usernameCheck = await Admins.findOne({ username });
      if (usernameCheck) {
        response.usernameExists = true;
      }
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error during user existence check", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
