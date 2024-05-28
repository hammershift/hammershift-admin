import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  wagerID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wager',
  },
  auctionID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auction',
  },
  tournamentID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
  },
  transactionType: {
    type: String,
    required: true,
    enum: ['wager', 'deposit', 'withdraw', 'winnings', 'refund', 'tournament buy-in', 'processing_fee'],
  },
  amount: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['+', '-'],
  },
  transactionDate: {
    type: Date,
    default: Date.now,
  },
  auction_id: {
    type: String,
  },
  invoice_id: {
    type: String,
  },
  invoice_url: {
    type: String,
  },
  accountName: {
    type: String,
  },
  accountNumber: {
    type: String,
  },
  bankName: {
    type: String,
  },
  wireRoutingNumber: {
    type: String,
  },
  status: {
    type: String,
    enum: ['processing', 'success', 'failed'],
  },
});

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

export default Transaction;
