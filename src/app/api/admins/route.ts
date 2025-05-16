// import connectToDB from "@/lib/mongoose";
import Admins from "@/app/models/admin.model";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { ObjectId } from "mongodb";
import connectToDB from "@/app/lib/mongoose";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const admin_id = req.nextUrl.searchParams.get("_id");
    const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
    const limit = Number(req.nextUrl.searchParams.get("limit"));

    // api/admins?auction_id=213123 to get a single admin
    if (admin_id) {
      const admin = await Admins.findOne({ _id: new ObjectId(admin_id) });
      return NextResponse.json(admin);
    }
    // api/admins to get all admins
    const admins = await Admins.find().limit(limit).skip(offset);

    return NextResponse.json({ total: admins.length, admins: admins });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal server error" });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "owner") {
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
    const { first_name, last_name, email, username, password, role } =
      await req.json();

    const existingEmail = await Admins.findOne({ email });
    if (existingEmail) {
      return NextResponse.json(
        { message: "Email is already in use" },
        { status: 400 }
      );
    }

    const existingUsername = await Admins.findOne({ username });
    if (existingUsername) {
      return NextResponse.json(
        { message: "Username is already taken" },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(password, 10);
    const newAdminData = {
      _id: new Types.ObjectId(),
      first_name,
      last_name,
      email,
      username,
      password: hash,
      role,
      createdAt: new Date(),
    };

    const newAdmin = new Admins(newAdminData);
    await newAdmin.save();

    console.log("Received email:", email);
    console.log("Received username:", username);
    console.log("Received role:", role);
    console.log("Created Admin:", newAdmin);
    return NextResponse.json({ message: "Admin account created" });
  } catch (error) {
    return NextResponse.json({
      message: "Internal server error",
      error: error,
    });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (session?.user.role !== "owner") {
    return NextResponse.json(
      {
        message:
          "Unauthorized! Your role does not have access to this function",
      },
      { status: 400 }
    );
  }

  console.log("User is Authorized to update admin!");

  try {
    await connectToDB();
    const { _id, first_name, last_name, email, username, password, role } =
      await req.json();

    if (!_id) {
      return NextResponse.json(
        { message: "Admin ID is required" },
        { status: 400 }
      );
    }

    const existingAdmin = await Admins.findById(_id);
    if (!existingAdmin) {
      return NextResponse.json({ message: "Admin not found" }, { status: 404 });
    }

    const emailConflict = await Admins.findOne({ email, _id: { $ne: _id } });
    if (emailConflict) {
      return NextResponse.json(
        { message: "Email is already in use" },
        { status: 400 }
      );
    }

    const usernameConflict = await Admins.findOne({
      username,
      _id: { $ne: _id },
    });
    if (usernameConflict) {
      return NextResponse.json(
        { message: "Username is already taken" },
        { status: 400 }
      );
    }

    const updateData: any = {
      first_name,
      last_name,
      email,
      username,
      role,
    };

    if (password || password != "") {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await Admins.updateOne({ _id }, { $set: updateData });

    console.log("Updated Admin ID:", _id);
    return NextResponse.json({ message: "Admin account updated" });
  } catch (error) {
    console.error("Error updating admin:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (session?.user.role !== "owner") {
    return NextResponse.json(
      { message: "Unauthorized. Only owners can delete admins." },
      { status: 400 }
    );
  }

  try {
    await connectToDB();

    const { _id } = await req.json();

    if (!_id) {
      return NextResponse.json(
        { message: "Admin ID is required" },
        { status: 400 }
      );
    }

    const existingAdmin = await Admins.findById(_id);

    if (!existingAdmin) {
      return NextResponse.json({ message: "Admin not found" }, { status: 404 });
    }

    if (session.user._id === _id) {
      return NextResponse.json(
        { message: "You cannot delete your own account." },
        { status: 403 }
      );
    }

    await Admins.deleteOne({ _id });

    return NextResponse.json(
      { message: "Admin account deleted" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting admin:", error);
    return NextResponse.json(
      { message: "Internal server error", error },
      { status: 500 }
    );
  }
}
