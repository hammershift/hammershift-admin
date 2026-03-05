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
  orderType: 'LIMIT' | 'MARKET' | 'STOP_LOSS';

  // Advanced order type fields
  timeInForce?: 'GTC' | 'FOK' | 'IOC'; // Good-til-Cancel (default), Fill-or-Kill, Immediate-or-Cancel
  postOnly?: boolean; // Must add liquidity (maker-only)
  stopPrice?: number; // Stop-Loss trigger price
  triggerCondition?: 'GTE' | 'LTE'; // Stop-Loss trigger: Greater-Than-or-Equal, Less-Than-or-Equal
  triggered?: boolean; // Stop-Loss has been triggered

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
      enum: ['LIMIT', 'MARKET', 'STOP_LOSS'],
      default: 'LIMIT'
    },

    // Advanced order type fields
    timeInForce: {
      type: String,
      enum: ['GTC', 'FOK', 'IOC'],
      default: 'GTC'
    },
    postOnly: { type: Boolean, default: false },
    stopPrice: { type: Number, min: 0, max: 1 },
    triggerCondition: { type: String, enum: ['GTE', 'LTE'] },
    triggered: { type: Boolean, default: false },

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
