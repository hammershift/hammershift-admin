import mongoose, { Document, Schema, model, models, Types } from "mongoose";

export type BadgeType =
  | "first_prediction"
  | "first_win"
  | "hot_start"
  | "on_fire"
  | "unstoppable"
  | "legend"
  | "tournament_rookie"
  | "tournament_champion"
  | "sharpshooter"
  | "centurion"
  | "top_10";

export interface Badge extends Document {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  badge_type: BadgeType;
  earned_at: Date;
  metadata: any;
}

const badgeSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      indexed: true,
    },
    badge_type: {
      type: String,
      enum: [
        "first_prediction",
        "first_win",
        "hot_start",
        "on_fire",
        "unstoppable",
        "legend",
        "tournament_rookie",
        "tournament_champion",
        "sharpshooter",
        "centurion",
        "top_10",
      ],
      required: true,
    },
    earned_at: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    collection: "badges",
    timestamps: false,
  }
);

// Prevent duplicate badges
badgeSchema.index({ user_id: 1, badge_type: 1 }, { unique: true });
badgeSchema.index({ earned_at: -1 });

const Badges = models.Badge || model("Badge", badgeSchema);

export default Badges;
