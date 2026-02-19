import mongoose, { Document, Schema, model, models, Types } from "mongoose";

export interface Streak extends Document {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  current_streak: number;
  longest_streak: number;
  last_prediction_date: Date | null;
  freeze_tokens: number;
  createdAt: Date;
  updatedAt: Date;
}

const streakSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    current_streak: {
      type: Number,
      default: 0,
    },
    longest_streak: {
      type: Number,
      default: 0,
    },
    last_prediction_date: {
      type: Date,
      required: false,
    },
    freeze_tokens: {
      type: Number,
      default: 0,
    },
  },
  {
    collection: "streaks",
    timestamps: true,
  }
);

streakSchema.index({ user_id: 1 }, { unique: true });

const Streaks = models.Streak || model("Streak", streakSchema);

export default Streaks;
