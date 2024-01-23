import connectToDB from "@/app/lib/mongoose";
import Users from "@/app/models/user.model";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";

// to edit admin account
export async function PUT(req: NextRequest) {
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

  console.log("User is Authorized!");

  try {
    await connectToDB();
    const admin_id = req.nextUrl.searchParams.get("admin_id");

    const requestBody = await req.json();
    const editData: { [key: string]: string | boolean | number } = {};
    if (requestBody) {
      Object.keys(requestBody).forEach((key) => {
        editData[key] = requestBody[key] as string | boolean | number;
      });
    }

    // api/users/edit?admin_id=657ab7edd422075ea7871f65
    if (admin_id) {
      const admin = await Users.findOneAndUpdate(
        { _id: admin_id },
        editData,
        { new: true }
      ).select("-password");

      if (admin) {
        return NextResponse.json(admin, { status: 200 });
      } else {
        return NextResponse.json(
          { message: "Cannot find Admin" },
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
