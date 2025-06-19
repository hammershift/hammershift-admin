import { Document, Schema, model, models, Types } from "mongoose";

export interface Prediction {
  _id: Types.ObjectId;
  auction_id: string;
  tournament_id?: number;
  predictedPrice: number;
  predictionType: string;
  isActive: boolean;
  refunded: boolean;
  user: {
    fullName: string;
    username: string;
    role: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const predictionsSchema = new Schema(
  {
    // carId: { type: String, required: true },
    // carObjectId: { type: Types.ObjectId, required: true },
    auction_id: { type: String, required: true },
    tournament_id: { type: Number, required: false },
    predictedPrice: { type: Number, required: true },
    reasoning: { type: String, required: false },
    predictionType: { type: String, required: true },
    wagerAmount: { type: Number, required: false, default: 0 },
    user: {
      userId: { type: Types.ObjectId, required: true },
      fullName: { type: String, required: true },
      username: { type: String, required: true },
      role: { type: String, enum: ["USER", "AGENT"], required: true },
      //TODO: add role to differentiate between human and AI agents
    },
    refunded: { type: Boolean, required: false, default: false },
    isActive: { type: Boolean, required: true, default: true },
    prize: { type: Number, required: false, default: 0 },
  },
  {
    collection: "predictions",
    timestamps: true,
  }
);

const Predictions =
  models.predictions || model("predictions", predictionsSchema);

export default Predictions;
