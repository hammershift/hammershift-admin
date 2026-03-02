import { Document, Schema, model, models, Types } from 'mongoose';

export interface PolygonOrder {
  _id: Types.ObjectId;
  marketId: string;
  auctionId: string;
  userId: Types.ObjectId;
  walletAddress: string;

  side: 'BUY' | 'SELL';
  outcome: 'YES' | 'NO';

  price: number;
  size: number;
  remainingSize: number;

  status: 'OPEN' | 'PARTIAL' | 'FILLED' | 'CANCELLED';
  orderType: 'LIMIT' | 'MARKET';

  makerFee: number;
  takerFee: number;

  transactionHash?: string;
  blockNumber?: number;

  createdAt: Date;
  updatedAt: Date;
}

const PolygonOrderSchema = new Schema(
  {
    marketId: { type: String, required: true, index: true },
    auctionId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    walletAddress: { type: String, required: true, lowercase: true },

    side: { type: String, enum: ['BUY', 'SELL'], required: true },
    outcome: { type: String, enum: ['YES', 'NO'], required: true },

    price: { type: Number, required: true, min: 0, max: 1 },
    size: { type: Number, required: true, min: 0 },
    remainingSize: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ['OPEN', 'PARTIAL', 'FILLED', 'CANCELLED'],
      default: 'OPEN'
    },
    orderType: {
      type: String,
      enum: ['LIMIT', 'MARKET'],
      default: 'LIMIT'
    },

    makerFee: { type: Number, default: 0 },
    takerFee: { type: Number, default: 0 },

    transactionHash: { type: String },
    blockNumber: { type: Number },
  },
  {
    collection: 'polygon_orders',
    timestamps: true,
  }
);

// Critical index for order book queries
PolygonOrderSchema.index({ marketId: 1, side: 1, price: -1, createdAt: 1 });
PolygonOrderSchema.index({ userId: 1, status: 1 });
PolygonOrderSchema.index({ walletAddress: 1 });

const PolygonOrderModel = models.PolygonOrder || model('PolygonOrder', PolygonOrderSchema);

export default PolygonOrderModel;
