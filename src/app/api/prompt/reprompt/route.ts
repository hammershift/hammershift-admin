import { NextRequest, NextResponse } from "next/server";
import connectToDB from "@/app/lib/mongoose";
import Auctions from "@/app/models/auction.model";
import Predictions from "@/app/models/prediction.model";
import GroundingMetadata from "@/app/models/grounding_metadata.model";
import Tournaments from "@/app/models/tournament.model";
import { app } from "@/app/lib/firebase";
import { getAI, getGenerativeModel, VertexAIBackend } from "firebase/ai";
import Users from "@/app/models/user.model";

export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const auction_id = req.nextUrl.searchParams.get("auction_id");
    const tournament_id = req.nextUrl.searchParams.get("tournament_id");
    const agent_id = req.nextUrl.searchParams.get("agent_id");

    if (!auction_id) {
      return NextResponse.json({
        message: "Missing auction_id or tournament_id",
      });
    }

    const auction = await Auctions.findById(auction_id);

    if (!auction) {
      return NextResponse.json(
        { message: "Auction not found" },
        { status: 404 }
      );
    }

    const description = auction.description.join(" ");
    const vertexAI = getAI(app, { backend: new VertexAIBackend("global") });

    const model = getGenerativeModel(vertexAI, {
      model: process.env.GEMINI_MODEL_NAME || "gemini-2.5-flash-lite",
    });

    const agent = await Users.findById(agent_id);

    if (!agent) {
      return NextResponse.json({ message: "Agent not found" }, { status: 404 });
    }
    const existingAgentPrediction = await Predictions.findOne({
      auction_id: auction_id,
      "user.userId": agent._id,
      tournament_id: tournament_id ? tournament_id : { $exists: false },
    });
    if (existingAgentPrediction) {
      console.log(
        `Agent ${agent._id} has already submitted a prediction for this auction`
      );
      return NextResponse.json(
        {
          message: "Agent has already submitted a prediction for this auction",
        },
        { status: 400 }
      );
    }
    let systemInstruction = agent.agentProperties?.systemInstruction || "";

    //check if there are existing predictions for the auction, then get all the predicted prices

    const existingPredictions = await Predictions.find({
      auction_id: auction_id,
      tournament_id: tournament_id ? tournament_id : { $exists: false },
    });

    if (existingPredictions.length > 0) {
      const predictionValues = existingPredictions.map(
        (prediction) => prediction.predictedPrice
      );
      systemInstruction +=
        " For the final selling price, these values are taken so you cannot use them as your prediction: " +
        predictionValues.join(", ");
    }

    const result = await model.generateContent({
      systemInstruction: {
        text: systemInstruction,
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: description,
            },
          ],
        },
      ],
    });

    if (result.response.candidates !== undefined) {
      if (
        result.response.candidates[0].content.parts[0].text ===
        "I am sorry, but I cannot predict the price of this vehicle."
      ) {
        console.error("AI agent could not predict the price");
        return NextResponse.json({
          message: "AI agent could not predict the price",
        });
      }
      const response = result.response.text();
      const regex = /\[(\d+)\]/;

      const match = response.match(regex);

      if (!match) {
        console.error("No final price found");
        return NextResponse.json(
          {
            message: "No final price found, please reprompt again.",
          },
          {
            status: 400,
          }
        );
      }
      const predictedPrice = match[1];

      const prediction = await Predictions.create({
        auction_id: auction._id,
        ...(tournament_id ? { tournament_id: tournament_id } : {}),
        predictedPrice: Number(predictedPrice),
        reasoning: response,
        predictionType: "free_play",
        wagerAmount: 0,
        user: {
          userId: agent._id,
          fullName: agent.fullName,
          username: agent.username,
          role: agent.role,
        },
        refunded: false,
        isActive: true,
        prize: 0,
      });

      const groundingMetadata =
        result.response.candidates?.[0]?.groundingMetadata;

      if (
        groundingMetadata !== undefined &&
        Object.keys(groundingMetadata).length !== 0
      ) {
        const webSearchQueries = groundingMetadata?.webSearchQueries;
        const renderedContent =
          groundingMetadata?.searchEntryPoint?.renderedContent;

        const groundingChunks = groundingMetadata?.groundingChunks;

        //create grounding metadata for archival
        await GroundingMetadata.create({
          prediction_id: prediction._id,
          webSearchQueries: webSearchQueries,
          searchEntryPoint: {
            renderedContent: renderedContent,
          },
          groundingChunks: groundingChunks,
        });
      }

      console.log("Successfully reprompted for agent", agent.username);
      return NextResponse.json(
        {
          prediction: prediction,
          message: `Successfully reprompted for agent ${agent.username}`,
          status: "success",
        },
        { status: 200 }
      );
    } else {
      console.error("Failed to get a response from Vertex AI");
      return NextResponse.json(
        {
          message: "Failed to get a response from Vertex AI",
          status: "error",
        },
        { status: 500 }
      );
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: "Internal server error", status: "error" },
      { status: 500 }
    );
  }
}
