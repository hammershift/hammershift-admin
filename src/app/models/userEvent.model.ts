import mongoose, { Document, Schema, model, models, Types } from "mongoose";

export interface UserEvent extends Document {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  event_type: string;
  event_data: any;
  created_at: Date;
}

const userEventSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      indexed: true,
    },
    event_type: {
      type: String,
      required: true,
      indexed: true,
    },
    event_data: {
      type: Schema.Types.Mixed,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "user_events",
    timestamps: false,
  }
);

// TTL index - auto-delete after 90 days
userEventSchema.index({ created_at: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Compound index for efficient queries
userEventSchema.index({ user_id: 1, event_type: 1, created_at: -1 });

const UserEvents = models.UserEvent || model("UserEvent", userEventSchema);

export default UserEvents;
