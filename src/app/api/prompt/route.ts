import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import connectToDB from "@/app/lib/mongoose";
import { app } from "@/app/lib/firebase";
import { getVertexAI, getGenerativeModel, Schema } from "firebase/vertexai";
import Auctions from "@/app/models/auction.model";
import Users from "@/app/models/user.model";
import { initializeApp } from "firebase/app";
export async function POST(req: NextRequest) {
  try {
    await connectToDB();

    const auction_id = req.nextUrl.searchParams.get("auction_id");

    //get the description of the auction
    const auction = await Auctions.findOne({ auction_id: auction_id });

    const description = auction.description.join(" ");

    const vertexAI = getVertexAI(app);

    //initialize model and schema
    const jsonSchema = Schema.object({
      properties: {
        predictedPrice: Schema.number(),
        reasoning: Schema.string(),
      },
    });
    const model = getGenerativeModel(vertexAI, {
      model: "gemini-2.0-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: jsonSchema,
      },
    });

    //TODO: add a loop through all the ai users
    const agents = await Users.find({ isAI: true });

    if (agents.length === 0) {
      console.error("No AI agents found");
      return NextResponse.json({ message: "No AI agents found" });
    }
    for (const agent of agents) {
      const result = await model.generateContent({
        //TODO: replace this with the agent's system instruction
        systemInstruction: {
          text: "You are a veteran predictor of car auction pricing. You are given a description of a vehicle and you must predict its final selling price. You must also provide a reason for your prediction. If you cannot predict the price of the vehicle, please respond with 'I am sorry, but I cannot predict the price of this vehicle.'",
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
      // successful response
      if (result.response.candidates !== undefined) {
        if (
          result.response.candidates[0].content.parts[0].text ===
          "I am sorry, but I cannot predict the price of this vehicle."
        ) {
          return NextResponse.json({
            message:
              "I am sorry, but I cannot predict the price of this vehicle.",
          });
        }

        //TODO: submit a prediction for the auction, using the result of the prompt
      } else {
        console.error("Failed to get response from Gemini");
      }
    }
  } catch (e) {
    console.error(e);
  }
}
