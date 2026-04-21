import mongoose from 'mongoose';

export type WebhookEventStatus =
  | 'received'
  | 'unauthorized'
  | 'invalid_payload'
  | 'market_not_found'
  | 'already_resolved'
  | 'signature_invalid'
  | 'resolved'
  | 'onchain_failed'
  | 'error';

export interface IWebhookEvent {
  source: string;
  endpoint: string;
  method: string;
  status: WebhookEventStatus;
  auctionId?: string;
  marketId?: mongoose.Types.ObjectId;
  hammerPrice?: number;
  winningOutcome?: 'YES' | 'NO';
  resolutionTxHash?: string;
  httpStatus: number;
  payload?: any;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  durationMs?: number;
  timestamp: Date;
}

const webhookEventSchema = new mongoose.Schema<IWebhookEvent>(
  {
    source: { type: String, required: true, index: true },
    endpoint: { type: String, required: true },
    method: { type: String, required: true },
    status: { type: String, required: true, index: true },
    auctionId: { type: String, index: true },
    marketId: { type: mongoose.Schema.Types.ObjectId, ref: 'PolygonMarket' },
    hammerPrice: { type: Number },
    winningOutcome: { type: String, enum: ['YES', 'NO'] },
    resolutionTxHash: { type: String },
    httpStatus: { type: Number, required: true },
    payload: { type: mongoose.Schema.Types.Mixed },
    errorMessage: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    durationMs: { type: Number },
    timestamp: { type: Date, default: Date.now, required: true, index: true },
  },
  { collection: 'webhook_events', timestamps: false }
);

webhookEventSchema.index({ source: 1, timestamp: -1 });
webhookEventSchema.index({ status: 1, timestamp: -1 });
webhookEventSchema.index({ auctionId: 1, timestamp: -1 });

const WebhookEvent =
  mongoose.models.WebhookEvent ||
  mongoose.model<IWebhookEvent>('WebhookEvent', webhookEventSchema);

export default WebhookEvent;
