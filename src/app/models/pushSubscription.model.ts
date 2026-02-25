import mongoose, { Document, Schema, model, models, Types } from 'mongoose';

export interface PushSubscription extends Document {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  created_at: Date;
}

const pushSubscriptionSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      indexed: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
    },
    keys: {
      p256dh: {
        type: String,
        required: true,
      },
      auth: {
        type: String,
        required: true,
      },
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'push_subscriptions',
    timestamps: false,
  }
);

// Indexes
pushSubscriptionSchema.index({ user_id: 1 });
pushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });

const PushSubscriptions = models.PushSubscription || model('PushSubscription', pushSubscriptionSchema);

export default PushSubscriptions;
