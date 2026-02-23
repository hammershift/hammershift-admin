import mongoose, { Document, Schema, model, models, Types } from 'mongoose';

export interface ACHAccount extends Document {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  routing_number: string; // Encrypted in real implementation
  account_number_last4: string;
  account_type: 'checking' | 'savings';
  is_verified: boolean;
  created_at: Date;
}

const achAccountSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      indexed: true,
    },
    routing_number: {
      type: String,
      required: true,
    },
    account_number_last4: {
      type: String,
      required: true,
    },
    account_type: {
      type: String,
      enum: ['checking', 'savings'],
      required: true,
    },
    is_verified: {
      type: Boolean,
      default: false,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'ach_accounts',
    timestamps: false,
  }
);

// Indexes
achAccountSchema.index({ user_id: 1 });

const ACHAccounts = models.ACHAccount || model('ACHAccount', achAccountSchema);

export default ACHAccounts;
