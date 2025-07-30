import { NextRequest, NextResponse } from "next/server";
import connectToDB from "@/app/lib/mongoose";
import { app } from "@/app/lib/firebase";
import { getVertexAI, getGenerativeModel, Schema } from "firebase/vertexai";
import Auctions from "@/app/models/auction.model";
import Users from "@/app/models/user.model";
import Predictions from "@/app/models/prediction.model";
import Tournaments, { Tournament } from "@/app/models/tournament.model";
export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const body = await req.json();
    const { tournament_id } = body;

    if (!tournament_id) {
      return NextResponse.json(
        { message: "tournament_id is required" },
        { status: 400 }
      );
    }

    const tournament = await Tournaments.findOne({
      tournament_id: parseInt(tournament_id),
    });

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }

    if (!tournament.isActive && tournament.type == "free_play") {
      const predictionExists = !!(await Predictions.exists({ tournament_id }));
      if (!predictionExists) {
        const agents = await Users.find({ role: "AGENT" });

        if (agents.length === 0) {
          console.error("No AI agents found");
          return NextResponse.json({ message: "No AI agents found" });
        }

        for (const auction_id of tournament.auction_ids) {
          const auction = await Auctions.findOne({ _id: auction_id });
          if (!auction) {
            console.error("Auction not found");
            return NextResponse.json({ message: "Auction not found" });
          }
          const description = auction!.description.join(" ");

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
          const predictionValues: number[] = [];
          for (const agent of agents) {
            try {
              //check if agent has already submitted a prediction
              const existingPrediction = await Predictions.findOne({
                auction_id: auction_id,
                tournament_id: tournament._id,
                "user.userId": agent._id,
              });

              if (existingPrediction) {
                console.log(
                  `Agent ${agent._id} has already submitted a prediction for this auction`
                );
                continue;
              }

              let systemInstruction =
                agent.agentProperties?.systemInstruction || "";
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

                //get the structured response object
                const response = JSON.parse(
                  result.response.candidates[0].content.parts[0].text!
                );

                const prediction = await Predictions.create({
                  auction_id: auction!._id,
                  tournament_id: tournament._id,
                  predictedPrice: response.predictedPrice,
                  reasoning: response.reasoning,
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

                predictionValues.push(response.predictedPrice);
              } else {
                console.error("Failed to get a response from Vertex AI");
              }
            } catch (e) {
              console.error("An error has occurred: ", e);
              continue;
            }
          }
        }
        for (const agent of agents) {
          tournament.users.push({
            userId: agent._id,
            fullName: agent.fullName,
            username: agent.username,
            role: agent.role,
          });
        }
      }
      tournament.isActive = true;
      await tournament.save();
      return NextResponse.json(
        {
          message:
            "Tournament status updated to active & added AI predictions, if applicable",
        },
        { status: 200 }
      );
    } else {
      tournament.isActive = false;
      await tournament.save();

      return NextResponse.json(
        {
          message: "Tournament status updated to not active",
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Toggle Tournament Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
