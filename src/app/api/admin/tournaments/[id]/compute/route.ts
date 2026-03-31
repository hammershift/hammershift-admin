import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import connectToDB from "@/app/lib/mongoose";
import { createAuditLog, AuditResources } from "@/app/lib/auditLogger";
import Tournaments from "@/app/models/tournament.model";
import Auctions from "@/app/models/auction.model";
import Predictions from "@/app/models/prediction.model";
import Points from "@/app/models/auction_points.model";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["owner", "admin"].includes(session.user.role)) {
    return NextResponse.json(
      { message: "Unauthorized. Admin access required." },
      { status: 401 }
    );
  }

  try {
    await connectToDB();

    // Delegate to the existing compute endpoint logic by calling it internally
    // The existing route is at /api/tournaments/[tournament_id]/compute (PUT)
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://localhost:3000";

    const computeRes = await fetch(
      `${baseUrl}/api/tournaments/${params.id}/compute`,
      {
        method: "PUT",
        headers: {
          cookie: req.headers.get("cookie") || "",
        },
      }
    );

    if (!computeRes.ok) {
      const err = await computeRes.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: "Failed to compute results",
          detail: (err as Record<string, unknown>).message || "Compute failed",
        },
        { status: computeRes.status }
      );
    }

    await createAuditLog({
      userId: session.user.id,
      username: session.user.username,
      userRole: session.user.role,
      action: "TOURNAMENT_COMPUTE",
      resource: AuditResources.TOURNAMENT || "Tournament",
      resourceId: params.id,
      method: "POST",
      endpoint: `/api/admin/tournaments/${params.id}/compute`,
      status: "success",
    });

    return NextResponse.json({
      success: true,
      message: "Results computed successfully",
    });
  } catch (error) {
    console.error("Compute results error:", error);
    return NextResponse.json(
      { error: "Failed to compute results", detail: String(error) },
      { status: 500 }
    );
  }
}
