import mongoose, { Document, Schema, model, models, Types } from 'mongoose';

export interface WalletTransaction extends Document {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  transaction_id: string;
  type: 'deposit' | 'withdrawal';
  method: 'ach' | 'card';
  amount: number; // in cents
  status: 'pending' | 'completed' | 'failed';
  available_date: Date;
  created_at: Date;
}

const walletTransactionSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      indexed: true,
    },
    transaction_id: {
      type: String,
      required: true,
      unique: true,
      indexed: true,
    },
    type: {
      type: String,
      enum: ['deposit', 'withdrawal'],
      required: true,
    },
    method: {
      type: String,
      enum: ['ach', 'card'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      required: true,
      default: 'pending',
    },
    available_date: {
      type: Date,
      required: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'wallet_transactions',
    timestamps: false,
  }
);

// Indexes
walletTransactionSchema.index({ user_id: 1, created_at: -1 });
walletTransactionSchema.index({ transaction_id: 1 }, { unique: true });
walletTransactionSchema.index({ status: 1 });

const WalletTransactions = models.WalletTransaction || model('WalletTransaction', walletTransactionSchema);

export default WalletTransactions;
