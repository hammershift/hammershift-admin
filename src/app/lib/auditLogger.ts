import { NextRequest } from "next/server";
import AuditLog from "@/app/models/auditLog.model";
import mongoose from "mongoose";
import connectToDB from "./mongoose";

/**
 * Audit Logger
 *
 * Centralized logging system for tracking all administrative actions
 * and sensitive operations for compliance and security monitoring.
 */

export interface AuditLogOptions {
  userId: string | mongoose.Types.ObjectId;
  username: string;
  userRole: string;
  action: string;
  resource: string;
  resourceId?: string | mongoose.Types.ObjectId;
  method: string;
  endpoint: string;
  changes?: {
    before?: any;
    after?: any;
  };
  metadata?: any;
  status: "success" | "failure";
  errorMessage?: string;
  duration?: number;
  req?: NextRequest; // Optional request object for IP/UA extraction
}

/**
 * Extract IP address from request
 */
function getIpAddress(req?: NextRequest): string {
  if (!req) return "unknown";

  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  return forwarded?.split(",")[0] || realIp || "unknown";
}

/**
 * Extract user agent from request
 */
function getUserAgent(req?: NextRequest): string {
  if (!req) return "unknown";
  return req.headers.get("user-agent") || "unknown";
}

/**
 * Sanitize sensitive data before logging
 */
function sanitizeData(data: any): any {
  if (!data) return data;

  const sensitiveFields = [
    "password",
    "token",
    "secret",
    "apiKey",
    "creditCard",
    "ssn",
  ];

  if (typeof data !== "object") return data;

  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  for (const key in sanitized) {
    if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof sanitized[key] === "object") {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  options: AuditLogOptions
): Promise<void> {
  try {
    await connectToDB();

    const {
      userId,
      username,
      userRole,
      action,
      resource,
      resourceId,
      method,
      endpoint,
      changes,
      metadata,
      status,
      errorMessage,
      duration,
      req,
    } = options;

    // Sanitize sensitive data
    const sanitizedChanges = changes
      ? {
          before: sanitizeData(changes.before),
          after: sanitizeData(changes.after),
        }
      : undefined;

    const sanitizedMetadata = sanitizeData(metadata);

    const auditLog = new AuditLog({
      timestamp: new Date(),
      userId: new mongoose.Types.ObjectId(userId.toString()),
      username,
      userRole,
      action,
      resource,
      resourceId: resourceId
        ? new mongoose.Types.ObjectId(resourceId.toString())
        : undefined,
      method,
      endpoint,
      changes: sanitizedChanges,
      metadata: sanitizedMetadata,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
      status,
      errorMessage,
      duration,
    });

    await auditLog.save();
  } catch (error) {
    // Don't throw - audit logging should never break the main flow
    console.error("Failed to create audit log:", error);
  }
}

/**
 * Log a successful action
 */
export async function logSuccess(
  options: Omit<AuditLogOptions, "status">
): Promise<void> {
  await createAuditLog({ ...options, status: "success" });
}

/**
 * Log a failed action
 */
export async function logFailure(
  options: Omit<AuditLogOptions, "status"> & { errorMessage: string }
): Promise<void> {
  await createAuditLog({ ...options, status: "failure" });
}

/**
 * Query audit logs with filters
 */
export interface AuditLogQuery {
  userId?: string | mongoose.Types.ObjectId;
  action?: string;
  resource?: string;
  resourceId?: string | mongoose.Types.ObjectId;
  status?: "success" | "failure";
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export async function queryAuditLogs(query: AuditLogQuery) {
  await connectToDB();

  const filter: any = {};

  if (query.userId) {
    filter.userId = new mongoose.Types.ObjectId(query.userId.toString());
  }

  if (query.action) {
    filter.action = query.action;
  }

  if (query.resource) {
    filter.resource = query.resource;
  }

  if (query.resourceId) {
    filter.resourceId = new mongoose.Types.ObjectId(query.resourceId.toString());
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.startDate || query.endDate) {
    filter.timestamp = {};
    if (query.startDate) {
      filter.timestamp.$gte = query.startDate;
    }
    if (query.endDate) {
      filter.timestamp.$lte = query.endDate;
    }
  }

  const limit = query.limit || 50;
  const offset = query.offset || 0;

  const logs = await AuditLog.find(filter)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(offset)
    .lean();

  const total = await AuditLog.countDocuments(filter);

  return {
    logs,
    total,
    limit,
    offset,
    hasMore: total > offset + limit,
  };
}

/**
 * Get audit log statistics
 */
export async function getAuditStats(startDate?: Date, endDate?: Date) {
  await connectToDB();

  const filter: any = {};
  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = startDate;
    if (endDate) filter.timestamp.$lte = endDate;
  }

  const [
    totalLogs,
    successCount,
    failureCount,
    actionStats,
    resourceStats,
    userStats,
  ] = await Promise.all([
    AuditLog.countDocuments(filter),
    AuditLog.countDocuments({ ...filter, status: "success" }),
    AuditLog.countDocuments({ ...filter, status: "failure" }),
    AuditLog.aggregate([
      { $match: filter },
      { $group: { _id: "$action", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    AuditLog.aggregate([
      { $match: filter },
      { $group: { _id: "$resource", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    AuditLog.aggregate([
      { $match: filter },
      { $group: { _id: "$userId", username: { $first: "$username" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  return {
    totalLogs,
    successCount,
    failureCount,
    successRate:
      totalLogs > 0 ? ((successCount / totalLogs) * 100).toFixed(2) : "0",
    topActions: actionStats,
    topResources: resourceStats,
    topUsers: userStats,
  };
}

/**
 * Action constants for consistency
 */
export const AuditActions = {
  // User actions
  USER_CREATE: "user.create",
  USER_UPDATE: "user.update",
  USER_DELETE: "user.delete",
  USER_LOGIN: "user.login",
  USER_LOGOUT: "user.logout",
  USER_BALANCE_UPDATE: "user.balance.update",

  // Wager actions
  WAGER_CREATE: "wager.create",
  WAGER_UPDATE: "wager.update",
  WAGER_DELETE: "wager.delete",
  WAGER_REFUND: "wager.refund",

  // Auction actions
  AUCTION_CREATE: "auction.create",
  AUCTION_UPDATE: "auction.update",
  AUCTION_DELETE: "auction.delete",
  AUCTION_FINALIZE: "auction.finalize",

  // Tournament actions
  TOURNAMENT_CREATE: "tournament.create",
  TOURNAMENT_UPDATE: "tournament.update",
  TOURNAMENT_DELETE: "tournament.delete",
  TOURNAMENT_START: "tournament.start",
  TOURNAMENT_END: "tournament.end",

  // Transaction actions
  TRANSACTION_CREATE: "transaction.create",
  TRANSACTION_APPROVE: "transaction.approve",
  TRANSACTION_REJECT: "transaction.reject",

  // Withdrawal actions
  WITHDRAWAL_REQUEST: "withdrawal.request",
  WITHDRAWAL_APPROVE: "withdrawal.approve",
  WITHDRAWAL_REJECT: "withdrawal.reject",

  // Admin actions
  ADMIN_CREATE: "admin.create",
  ADMIN_UPDATE: "admin.update",
  ADMIN_DELETE: "admin.delete",

  // Agent actions
  AGENT_CREATE: "agent.create",
  AGENT_UPDATE: "agent.update",
  AGENT_DELETE: "agent.delete",

  // Comment actions
  COMMENT_CREATE: "comment.create",
  COMMENT_UPDATE: "comment.update",
  COMMENT_DELETE: "comment.delete",

  // Prediction actions
  PREDICTION_CREATE: "prediction.create",
  PREDICTION_UPDATE: "prediction.update",
  PREDICTION_DELETE: "prediction.delete",
};

/**
 * Resource constants for consistency
 */
export const AuditResources = {
  USER: "User",
  WAGER: "Wager",
  AUCTION: "Auction",
  TOURNAMENT: "Tournament",
  TRANSACTION: "Transaction",
  ADMIN: "Admin",
  AGENT: "Agent",
  COMMENT: "Comment",
  PREDICTION: "Prediction",
};

/**
 * Delete old audit logs (for data retention compliance)
 */
export async function cleanupOldAuditLogs(daysToKeep: number = 90) {
  await connectToDB();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await AuditLog.deleteMany({
    timestamp: { $lt: cutoffDate },
  });

  return {
    deleted: result.deletedCount,
    cutoffDate,
  };
}
