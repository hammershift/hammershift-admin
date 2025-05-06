import { NextRequest, NextResponse } from "next/server";
import connectToDB from "@/app/lib/mongoose";
import { app } from "@/app/lib/firebase";
import { getVertexAI, getGenerativeModel, Schema } from "firebase/vertexai";
import Auctions from "@/app/models/auction.model";
import Users from "@/app/models/user.model";
import Predictions from "@/app/models/prediction.model";
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

    const agents = await Users.find({ role: "AGENT" });

    if (agents.length === 0) {
      console.error("No AI agents found");
      return NextResponse.json({ message: "No AI agents found" });
    }
    const newPredictions: any[] = [];
    for (const agent of agents) {
      
      try {
        //check if agent has already submitted a prediction
        const existingPrediction = await Predictions.findOne({
          auction_id: auction_id,
          user: {
            userId: agent._id,
          },
        });
  
        if (existingPrediction) {
          console.log(
            `Agent ${agent._id} has already submitted a prediction for this auction`
          );
          continue;
        }
        const result = await model.generateContent({
          //TODO: replace this with the agent's system instruction
          // systemInstruction: {
          //   text: "You are a veteran predictor of car auction pricing. You are given a description of a vehicle and you must predict its final selling price. You must also provide a reason for your prediction. If you cannot predict the price of the vehicle, please respond with 'I am sorry, but I cannot predict the price of this vehicle.'",
          // },
          systemInstruction: {
            text: agent.agentProperties.systemInstruction,
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
            carId: auction_id,
            carObjectId: auction._id,
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
            prize: 0
            
          });
  
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
      console.log(`Successfully added predictions for ${newPredictions.length} AI agents`);
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
