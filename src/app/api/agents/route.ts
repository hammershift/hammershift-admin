import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { ObjectId } from "mongodb";
import connectToDB from "@/app/lib/mongoose";
import Users from "@/app/models/user.model";
import Predictions from "@/app/models/prediction.model";
import { Types } from "mongoose";
import { Role } from "@/app/lib/interfaces";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const agent_id = req.nextUrl.searchParams.get("agent_id");
    const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
    const limit = Number(req.nextUrl.searchParams.get("limit"));
    const auction_id = req.nextUrl.searchParams.get("auction_id");
    const tournament_id = req.nextUrl.searchParams.get("tournament_id");

    // api/agents?_id=213123 to get a single agent
    if (agent_id) {
      const agent = await Users.findOne({ _id: new ObjectId(agent_id) });
      return NextResponse.json(agent, { status: 200 });
    }

    if (auction_id) {
      //get agents who haven't bid to this auction
      const agents = await Users.find({
        role: Role.AGENT,
      });

      const predictions = await Predictions.find({
        auction_id: auction_id,
        tournament_id: tournament_id ? tournament_id : { $exists: false },
        "user.role": Role.AGENT,
      });

      const repromptAgents = agents.filter((agent) => {
        return !predictions.some((prediction) => {
          return prediction.user.userId.toString() === agent._id.toString();
        });
      });
      return NextResponse.json({ agents: repromptAgents }, { status: 200 });
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
    const { username, fullName, email, agentProperties } = await req.json();
    const existingAgent = await Users.findOne({ username: username });

    if (existingAgent) {
      return NextResponse.json(
        {
          message: "Agent name already exists",
        },
        { status: 400 }
      );
    } else {
      const newDate = new Date();

      const defaultInstruction =
        "You are given a description of a vehicle to help with data crunching and you must predict its final selling price. You must also provide a reason for your prediction, and you must place the final selling price inside brackets ([]) without any spaces inside for parsing. As much as possible, use Google Search to supplement your research on the final price. If you cannot predict the price of the vehicle, please respond with 'I am sorry, but I cannot predict the price of this vehicle.'";
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
          systemInstruction:
            agentProperties.systemInstruction + ` ${defaultInstruction}`,
        },
      };

      const newAgent = new Users(newAgentData);
      await newAgent.save();
      console.log("Created newAgent:", newAgent);
      return NextResponse.json(
        { message: "Agent account created" },
        { status: 200 }
      );
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
    let { _id, username, fullName, email, agentProperties } = await req.json();

    if (_id) {
      const existingDifferentAgent = await Users.findOne({
        _id: { $ne: _id },
        username: username,
      });

      if (existingDifferentAgent) {
        return NextResponse.json(
          { message: "Another agent already exists with that name" },
          { status: 400 }
        );
      }

      const defaultInstruction =
        "You are given a description of a vehicle and you must predict its final selling price. You must also provide a reason for your prediction. If you cannot predict the price of the vehicle, please respond with 'I am sorry, but I cannot predict the price of this vehicle.'";

      if (agentProperties?.systemInstruction) {
        agentProperties = {
          ...agentProperties,
          systemInstruction:
            agentProperties.systemInstruction + ` ${defaultInstruction}`,
        };
      }
      const updateData: any = {
        username,
        fullName,
        email,
        agentProperties,
      };
      const agent = await Users.findOneAndUpdate(
        { _id },
        { $set: updateData },
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

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (session?.user.role !== "owner" && session?.user.role !== "admin") {
    return NextResponse.json(
      { message: "Unauthorized. Only owners or admins can delete agents." },
      { status: 400 }
    );
  }
  try {
    await connectToDB();
    const { _id } = await req.json();
    if (!_id) {
      return NextResponse.json(
        { message: "Agent ID is required" },
        { status: 400 }
      );
    }

    const existingAgent = await Users.findById(_id);

    if (!existingAgent) {
      return NextResponse.json({ message: "Agent not found" }, { status: 404 });
    }

    await Users.deleteOne({ _id });

    return NextResponse.json(
      { message: "Agent account deleted" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting agent:", error);
    return NextResponse.json(
      { message: "Internal server error", error },
      { status: 500 }
    );
  }
}
