import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import connectToDB from "@/app/lib/mongoose";
import mongoose from "mongoose";
import { createAuditLog, AuditResources } from "@/app/lib/auditLogger";

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
    const db = mongoose.connection.db!;
    const objId = new mongoose.Types.ObjectId(params.id);

    await db.collection("tournaments").updateOne(
      { _id: objId },
      {
        $set: {
          autoCreatedStatus: "rejected",
          status: "cancelled",
          updatedAt: new Date(),
        },
      }
    );

    await createAuditLog({
      userId: session.user.id,
      username: session.user.username,
      userRole: session.user.role,
      action: "TOURNAMENT_REJECT",
      resource: AuditResources.TOURNAMENT || "Tournament",
      resourceId: params.id,
      method: "POST",
      endpoint: `/api/admin/tournaments/${params.id}/reject`,
      status: "success",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tournament reject error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
