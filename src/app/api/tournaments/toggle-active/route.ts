import { NextRequest, NextResponse } from "next/server";
import connectToDB from "@/app/lib/mongoose";
import { app } from "@/app/lib/firebase";
import { getAI, getGenerativeModel, VertexAIBackend } from "firebase/ai";
import Auctions from "@/app/models/auction.model";
import Users from "@/app/models/user.model";
import Predictions from "@/app/models/prediction.model";
import Tournaments, { Tournament } from "@/app/models/tournament.model";
import GroundingMetadata from "@/app/models/grounding_metadata.model";

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
      _id: tournament_id,
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
        const agentSuccess = Array(agents.length).fill(false);
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

          const vertexAI = getAI(app, {
            backend: new VertexAIBackend("global"),
          });

          //initialize model and schema

          const model = getGenerativeModel(vertexAI, {
            model: process.env.GEMINI_MODEL_NAME || "gemini-2.5-flash-lite",
            tools: [{ googleSearch: {} }],
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
                const response = result.response.text();
                const regex = /\[(\d+)\]/;
                const match = response.match(regex);
                if (!match) {
                  console.error("No predictedPrice found");
                  continue;
                }
                const predictedPrice = match[1];

                const prediction = await Predictions.create({
                  auction_id: auction!._id,
                  tournament_id: tournament._id,
                  predictedPrice: predictedPrice,
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
                agentSuccess[agents.indexOf(agent)] = true;
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
          //check if agent is already in the tournament
          //mostly for when the prompt above encounters an error
          // if (
          //   !tournament.users.some(
          //     (user) => user.userId.toString() === agent._id.toString()
          //   )
          // ) {
          //   tournament.users.push({
          //     userId: agent._id,
          //     fullName: agent.fullName,
          //     username: agent.username,
          //     role: agent.role,
          //   });
          // }
          if (
            agentSuccess[agents.indexOf(agent)] &&
            !tournament.users.some(
              (user) => user.userId.toString() === agent._id.toString()
            )
          ) {
            tournament.users.push({
              userId: agent._id,
              fullName: agent.fullName,
              username: agent.username,
              role: agent.role,
            });
          }
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
