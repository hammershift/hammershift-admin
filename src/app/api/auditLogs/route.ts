import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/authMiddleware";
import { queryAuditLogs, getAuditStats } from "@/app/lib/auditLogger";
import { toObjectId, isValidObjectId } from "@/app/lib/dbHelpers";

/**
 * GET /api/auditLogs
 *
 * Query audit logs with filters
 * Requires owner or admin role
 */
export async function GET(req: NextRequest) {
  // Require admin authorization
  const authResult = await requireAuth(["owner", "admin"]);
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    const { searchParams } = new URL(req.url);

    // Parse query parameters
    const userId = searchParams.get("userId");
    const action = searchParams.get("action");
    const resource = searchParams.get("resource");
    const resourceId = searchParams.get("resourceId");
    const status = searchParams.get("status") as "success" | "failure" | null;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Validate ObjectIds if provided
    if (userId && !isValidObjectId(userId)) {
      return NextResponse.json(
        { message: "Invalid userId format" },
        { status: 400 }
      );
    }

    if (resourceId && !isValidObjectId(resourceId)) {
      return NextResponse.json(
        { message: "Invalid resourceId format" },
        { status: 400 }
      );
    }

    // Build query
    const query: any = {
      limit: Math.min(limit, 100), // Max 100 per page
      offset,
    };

    if (userId) query.userId = userId;
    if (action) query.action = action;
    if (resource) query.resource = resource;
    if (resourceId) query.resourceId = resourceId;
    if (status) query.status = status;
    if (startDate) query.startDate = new Date(startDate);
    if (endDate) query.endDate = new Date(endDate);

    const result = await queryAuditLogs(query);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error querying audit logs:", error);
    return NextResponse.json(
      {
        message: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
