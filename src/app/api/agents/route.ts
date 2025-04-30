import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { ObjectId } from "mongodb";
import connectToDB from "@/app/lib/mongoose";
import Users from "@/app/models/user.model";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const agent_id = req.nextUrl.searchParams.get("_id");
    const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
    const limit = Number(req.nextUrl.searchParams.get("limit"));

    // api/agents?_id=213123 to get a single agent
    if (agent_id) {
      const admin = await Users.findOne({ _id: new ObjectId(agent_id) });
      return NextResponse.json(admin);
    }
    // api/agents to get all AI agents
    const agents = await Users.find({ isAI: true }).limit(limit).skip(offset);

    return NextResponse.json({ total: agents.length, agents: agents });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Internal server error" });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "owner" && session?.user.role !== "admin") {
    console.log("error");
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
    const { username, fullName, email } = await req.json();
    console.log("here");
    console.log(username, fullName, email);
    const existingAgent = await Users.findOne({ username: username });

    if (existingAgent) {
      return NextResponse.json({ message: "Agent already exists" });
    } else if (!username || !fullName || !email) {
      throw new Error("Please fill out required fields");
    } else {
      const newDate = new Date();

      const newAgentData = {
        _id: new Types.ObjectId(),
        username: username,
        fullName: fullName,
        email: email,
        balance: 0,
        isActive: true,
        isBanned: false,
        provider: "email",
        createdAt: newDate,
        updatedAt: newDate,
        isAI: true,
      };

      const newAgent = new Users(newAgentData);
      await newAgent.save();
      console.log("Created newAgent:", newAgent);
      return NextResponse.json({ message: "Agent account created" });
    }
  } catch (error) {
    return NextResponse.json({
      message: "Internal server error",
      error: error,
    });
  }
}
