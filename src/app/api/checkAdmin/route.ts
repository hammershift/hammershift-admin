import connectToDB from "@/app/lib/mongoose";
import Admins from "@/app/models/admin.model";
import { requireAuth } from "@/app/lib/authMiddleware";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(["owner", "admin", "moderator"]);
  if ("error" in authResult) return authResult.error;

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
