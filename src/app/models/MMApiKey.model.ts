import { Document, Schema, model, models, Types, Model } from 'mongoose';
import crypto from 'crypto';

export interface MMApiKey extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  apiKey: string; // Hashed
  name: string; // User-friendly name for the key
  createdAt: Date;
  lastUsedAt?: Date;
  revokedAt?: Date;
  isActive: boolean;
  updateLastUsed(): Promise<void>;
}

export interface MMApiKeyModel extends Model<MMApiKey> {
  generateKey(): string;
  hashKey(plainKey: string): Promise<string>;
  validateKey(plainKey: string, hashedKey: string): Promise<boolean>;
}

const MMApiKeySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    apiKey: { type: String, required: true, unique: true }, // Hashed with bcrypt
    name: { type: String, required: true },
    lastUsedAt: { type: Date },
    revokedAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  {
    collection: 'mm_api_keys',
    timestamps: true,
  }
);

// Indexes
MMApiKeySchema.index({ userId: 1 });
MMApiKeySchema.index({ apiKey: 1 });
MMApiKeySchema.index({ isActive: 1 });

/**
 * Generate a new API key (returns plain text - only shown once)
 */
MMApiKeySchema.statics.generateKey = function (): string {
  // Generate 32-byte random key
  const key = crypto.randomBytes(32).toString('base64url');
  return `mm_${key}`;
};

/**
 * Hash API key for storage
 */
MMApiKeySchema.statics.hashKey = async function (plainKey: string): Promise<string> {
  const bcrypt = await import('bcrypt');
  return bcrypt.hash(plainKey, 10);
};

/**
 * Validate API key
 */
MMApiKeySchema.statics.validateKey = async function (
  plainKey: string,
  hashedKey: string
): Promise<boolean> {
  const bcrypt = await import('bcrypt');
  return bcrypt.compare(plainKey, hashedKey);
};

/**
 * Revoke API key
 */
MMApiKeySchema.methods.revoke = async function (): Promise<void> {
  this.revokedAt = new Date();
  this.isActive = false;
  await this.save();
};

/**
 * Update last used timestamp
 */
MMApiKeySchema.methods.updateLastUsed = async function (): Promise<void> {
  this.lastUsedAt = new Date();
  await this.save();
};

const MMApiKeyModel = (models.MMApiKey || model<MMApiKey, MMApiKeyModel>('MMApiKey', MMApiKeySchema)) as MMApiKeyModel;

export default MMApiKeyModel;
