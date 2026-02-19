import mongoose, { Document, Schema, model, models, Types } from "mongoose";

export interface LeaderboardSnapshot extends Document {
  _id: Types.ObjectId;
  period: "weekly" | "monthly" | "alltime";
  user_id: Types.ObjectId;
  rank: number;
  score: number;
  accuracy_pct: number;
  predictions_count: number;
  snapshot_at: Date;
}

const leaderboardSnapshotSchema = new Schema(
  {
    period: {
      type: String,
      enum: ["weekly", "monthly", "alltime"],
      required: true,
      indexed: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rank: {
      type: Number,
      required: true,
    },
    score: {
      type: Number,
      required: true,
    },
    accuracy_pct: {
      type: Number,
      min: 0,
      max: 100,
    },
    predictions_count: {
      type: Number,
      default: 0,
    },
    snapshot_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "leaderboard_snapshots",
    timestamps: false,
  }
);

// Compound indexes
leaderboardSnapshotSchema.index({ period: 1, rank: 1 });
leaderboardSnapshotSchema.index({ period: 1, user_id: 1 });
leaderboardSnapshotSchema.index({ period: 1, snapshot_at: -1 });

const LeaderboardSnapshots =
  models.LeaderboardSnapshot || model("LeaderboardSnapshot", leaderboardSnapshotSchema);

export default LeaderboardSnapshots;
