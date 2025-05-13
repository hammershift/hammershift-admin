import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { ObjectId } from "mongodb";
import connectToDB from "@/app/lib/mongoose";
import Users from "@/app/models/user.model";
import { Types } from "mongoose";
import { Role } from "@/app/lib/interfaces";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const agent_id = req.nextUrl.searchParams.get("agent_id");
    const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
    const limit = Number(req.nextUrl.searchParams.get("limit"));

    // api/agents?_id=213123 to get a single agent
    if (agent_id) {
      const admin = await Users.findOne({ _id: new ObjectId(agent_id) });
      return NextResponse.json(admin);
    }
    // api/agents to get all AI agents
    const agents = await Users.find({
      role: Role.AGENT,
    })
      .limit(limit)
      .skip(offset);

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
    const { username, fullName, email, systemInstruction } = await req.json();
    const existingAgent = await Users.findOne({ username: username });

    if (existingAgent) {
      return NextResponse.json({ message: "Agent already exists" });
    } else if (!username || !fullName || !email || !systemInstruction) {
      throw new Error("Please fill out required fields");
    } else {
      const newDate = new Date();

      const defaultInstruction =
        "You are given a description of a vehicle and you must predict its final selling price. You must also provide a reason for your prediction. If you cannot predict the price of the vehicle, please respond with 'I am sorry, but I cannot predict the price of this vehicle.'";
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
        role: Role.AGENT,
        agentProperties: {
          systemInstruction: systemInstruction + ` ${defaultInstruction}`,
        },
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
    const agent_id = req.nextUrl.searchParams.get("agent_id");

    const requestBody = await req.json();
    const editData: { [key: string]: string | boolean | number } = {};

    if (requestBody) {
      Object.keys(requestBody).forEach((key) => {
        editData[key] = requestBody[key] as string | boolean | number;
      });
    }

    if (agent_id) {
      const existingDifferentAgent = await Users.findOne({
        _id: { $ne: agent_id },
        username: editData["username"],
      });

      if (existingDifferentAgent) {
        return NextResponse.json(
          {
            message:
              "Agent already exists with that Full Name (original or variant of it)",
          },
          { status: 409 }
        );
      }

      const agent = await Users.findOneAndUpdate(
        { _id: new ObjectId(agent_id) },
        { $set: editData },
        {
          returnDocument: "after",
        }
      );

      if (agent) {
        return NextResponse.json(agent, { status: 200 });
      } else {
        return NextResponse.json(
          { message: "Cannot find agent" },
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
