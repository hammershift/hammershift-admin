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
  score?: number;
  rank?: number;
  delta_from_actual?: number;
  scored_at?: Date;
  bonus_modifiers?: {
    early_bird: boolean;
    streak_bonus: boolean;
    bullseye: boolean;
    tournament_multiplier: boolean;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const predictionsSchema = new Schema(
  {
    // carId: { type: String, required: true },
    // carObjectId: { type: Types.ObjectId, required: true },
    auction_id: { type: Schema.Types.ObjectId, required: true, ref: "Auction" },
    tournament_id: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: "Tournament",
    },
    predictedPrice: { type: Number, required: true },
    reasoning: { type: String, required: false },
    predictionType: { type: String, required: true },
    wagerAmount: { type: Number, required: false, default: 0 },
    user: {
      userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
      fullName: { type: String, required: true },
      username: { type: String, required: true },
      role: { type: String, enum: ["USER", "AGENT"], required: true },
      //TODO: add role to differentiate between human and AI agents
    },
    refunded: { type: Boolean, required: false, default: false },
    isActive: { type: Boolean, required: true, default: true },
    prize: { type: Number, required: false, default: 0 },
    score: { type: Number, required: false },
    rank: { type: Number, required: false },
    delta_from_actual: { type: Number, required: false },
    scored_at: { type: Date, required: false },
    bonus_modifiers: {
      early_bird: { type: Boolean, default: false },
      streak_bonus: { type: Boolean, default: false },
      bullseye: { type: Boolean, default: false },
      tournament_multiplier: { type: Boolean, default: false },
    },
  },
  {
    collection: "predictions",
    timestamps: true,
  }
);

// Add indexes for query optimization
predictionsSchema.index({ auction_id: 1 });
predictionsSchema.index({ tournament_id: 1 });
predictionsSchema.index({ auction_id: 1, tournament_id: 1 });
predictionsSchema.index({ "user.userId": 1 });
predictionsSchema.index({ auction_id: 1, "user.userId": 1 });
predictionsSchema.index({ isActive: 1 });
predictionsSchema.index({ "user.role": 1 });
predictionsSchema.index({ createdAt: -1 });
predictionsSchema.index({ score: -1 }); // For leaderboard aggregation
predictionsSchema.index({ scored_at: -1 }); // For result queries

const Predictions = models.Prediction || model("Prediction", predictionsSchema);

export default Predictions;
