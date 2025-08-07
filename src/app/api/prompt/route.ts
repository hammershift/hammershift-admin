import { NextRequest, NextResponse } from "next/server";
import connectToDB from "@/app/lib/mongoose";
import { app } from "@/app/lib/firebase";
import {
  getAI,
  getGenerativeModel,
  Schema,
  VertexAIBackend,
  Tool,
} from "firebase/ai";

import Auctions from "@/app/models/auction.model";
import Users from "@/app/models/user.model";
import Predictions from "@/app/models/prediction.model";
import GroundingMetadata from "@/app/models/grounding_metadata.model";

export async function POST(req: NextRequest) {
  try {
    await connectToDB();

    const auction_id = req.nextUrl.searchParams.get("auction_id");

    //get the description of the auction
    const auction = await Auctions.findById(auction_id);

    if (!auction) {
      return NextResponse.json(
        { message: "Auction not found" },
        { status: 404 }
      );
    }
    const description = auction.description.join(" ");

    //initialize Vertex AI
    const vertexAI = getAI(app, { backend: new VertexAIBackend("global") });

    //initialize model and schema
    // const jsonSchema = Schema.object({
    //   properties: {
    //     predictedPrice: Schema.number(),
    //     reasoning: Schema.string(),
    //   },
    // });
    const model = getGenerativeModel(vertexAI, {
      model: process.env.GEMINI_MODEL_NAME || "gemini-2.5-flash-lite", //default to gemini-2.5-flash-lite
      // generationConfig: {
      //   responseMimeType: "application/json",
      //   responseSchema: jsonSchema,
      // },
      tools: [{ googleSearch: {} }],
    });

    const agents = await Users.find({ role: "AGENT" });

    if (agents.length === 0) {
      console.error("No AI agents found");
      return NextResponse.json({ message: "No AI agents found" });
    }
    const newPredictions: any[] = [];
    const predictionValues: number[] = [];
    for (const agent of agents) {
      try {
        //check if agent has already submitted a prediction
        const existingPrediction = await Predictions.findOne({
          auction_id: auction_id,
          "user.userId": agent._id,
        });

        if (existingPrediction) {
          console.log(
            `Agent ${agent._id} has already submitted a prediction for this auction`
          );
          continue;
        }

        let systemInstruction = agent.agentProperties?.systemInstruction || "";
        //add already submitted prediction values to the system instruction so the agent cannot use them
        if (predictionValues.length > 0) {
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
        // successful response
        if (result.response.candidates !== undefined) {
          if (
            result.response.candidates[0].content.parts[0].text ===
            "I am sorry, but I cannot predict the price of this vehicle."
          ) {
            //TODO: skip the agent that can't predict or retry?
            console.error("AI agent could not predict the price");
            continue;
          }

          //get the final price from the response enclosed in brackets
          const response = result.response.text();
          const regex = /\[(\d+)\]/;

          const match = response.match(regex);

          if (!match) {
            console.error("No predictedPrice found");
            continue;
          }
          const predictedPrice = match[1];

          //get the structured response object
          // console.log(result.response.text());

          const prediction = await Predictions.create({
            auction_id: auction._id,
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

          predictionValues.push(Number(predictedPrice));
          newPredictions.push(prediction);
        } else {
          console.error("Failed to get a response from Vertex AI");
        }
      } catch (e) {
        console.error("An error has occured: ", e);
        continue;
      }
    }

    if (newPredictions.length > 0) {
      console.log(
        `Successfully added predictions for ${newPredictions.length} AI agents`
      );
      return NextResponse.json({
        predictions: newPredictions,
        message: "Successfully added predictions for AI agents",
      });
    } else {
      console.log("Failed to add predictions for AI agents");
      return NextResponse.json({
        message: "Failed to add predictions for AI agents",
      });
    }
  } catch (e) {
    console.error(e);
  }
}
