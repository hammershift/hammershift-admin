import mongoose, { Document, Schema, model, models, Types } from "mongoose";

export type EmailType =
  | "welcome"
  | "confirmation"
  | "result"
  | "digest"
  | "reminder"
  | "reactivation";

export type EmailStatus =
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "failed";

export interface EmailLog extends Document {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  campaign_id?: string;
  email_type: EmailType;
  sent_at: Date;
  opened_at?: Date;
  clicked_at?: Date;
  status: EmailStatus;
}

const emailLogSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      indexed: true,
    },
    campaign_id: {
      type: String,
      required: false,
    },
    email_type: {
      type: String,
      enum: ["welcome", "confirmation", "result", "digest", "reminder", "reactivation"],
      required: true,
    },
    sent_at: {
      type: Date,
      required: true,
    },
    opened_at: {
      type: Date,
      required: false,
    },
    clicked_at: {
      type: Date,
      required: false,
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "opened", "clicked", "bounced", "failed"],
      default: "sent",
    },
  },
  {
    collection: "email_logs",
    timestamps: false,
  }
);

emailLogSchema.index({ user_id: 1, sent_at: -1 });
emailLogSchema.index({ campaign_id: 1 });

const EmailLogs = models.EmailLog || model("EmailLog", emailLogSchema);

export default EmailLogs;
