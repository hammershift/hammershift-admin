import { Document, Schema, model, models, Types } from 'mongoose';

export interface PolygonPosition {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  walletAddress: string;
  marketId: string;
  auctionId: string;

  outcome: 'YES' | 'NO';
  tokenId: string;

  totalShares: number;
  avgPrice: number;
  totalCost: number;

  realizedPnL: number;

  createdAt: Date;
  updatedAt: Date;
}

const PolygonPositionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    walletAddress: { type: String, required: true, lowercase: true },
    marketId: { type: String, required: true },
    auctionId: { type: String, required: true },

    outcome: { type: String, enum: ['YES', 'NO'], required: true },
    tokenId: { type: String, required: true },

    totalShares: { type: Number, default: 0 },
    avgPrice: { type: Number },
    totalCost: { type: Number, default: 0 },

    realizedPnL: { type: Number, default: 0 },
  },
  {
    collection: 'polygon_positions',
    timestamps: true,
  }
);

PolygonPositionSchema.index({ userId: 1, marketId: 1, outcome: 1 }, { unique: true });
PolygonPositionSchema.index({ walletAddress: 1 });

const PolygonPositionModel = models.PolygonPosition || model('PolygonPosition', PolygonPositionSchema);

export default PolygonPositionModel;
