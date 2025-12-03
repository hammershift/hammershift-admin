import mongoose from "mongoose";

/**
 * Audit Log Model
 *
 * Tracks all administrative actions and sensitive operations
 * for compliance, debugging, and security monitoring.
 */

export interface IAuditLog {
  timestamp: Date;
  userId: mongoose.Types.ObjectId;
  username: string;
  userRole: string;
  action: string; // e.g., "user.update", "wager.refund", "transaction.approve"
  resource: string; // e.g., "User", "Wager", "Transaction"
  resourceId?: mongoose.Types.ObjectId;
  method: string; // HTTP method (GET, POST, PUT, DELETE)
  endpoint: string; // API endpoint
  changes?: {
    before?: any;
    after?: any;
  };
  metadata?: any; // Additional context-specific data
  ipAddress: string;
  userAgent: string;
  status: "success" | "failure";
  errorMessage?: string;
  duration?: number; // Request duration in milliseconds
}

const auditLogSchema = new mongoose.Schema<IAuditLog>(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      required: true,
      enum: ["owner", "admin", "moderator", "user"],
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    resource: {
      type: String,
      required: true,
      index: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    method: {
      type: String,
      required: true,
      enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    },
    endpoint: {
      type: String,
      required: true,
    },
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["success", "failure"],
      index: true,
    },
    errorMessage: {
      type: String,
    },
    duration: {
      type: Number, // milliseconds
    },
  },
  {
    timestamps: false, // We have our own timestamp field
  }
);

// Indexes for efficient querying
auditLogSchema.index({ timestamp: -1 }); // Most recent first
auditLogSchema.index({ userId: 1, timestamp: -1 }); // User activity timeline
auditLogSchema.index({ action: 1, timestamp: -1 }); // Action-specific logs
auditLogSchema.index({ resource: 1, resourceId: 1 }); // Resource-specific logs
auditLogSchema.index({ status: 1, timestamp: -1 }); // Filter by success/failure
auditLogSchema.index({ userRole: 1, action: 1 }); // Role-based audit
auditLogSchema.index({ endpoint: 1, timestamp: -1 }); // Endpoint-specific logs

// Compound index for common queries
auditLogSchema.index({ userId: 1, action: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, status: 1, timestamp: -1 });

const AuditLog =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>("AuditLog", auditLogSchema);

export default AuditLog;
