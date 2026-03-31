import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import connectToDB from "@/app/lib/mongoose";
import mongoose from "mongoose";
import {
  createAuditLog,
  AuditActions,
  AuditResources,
} from "@/app/lib/auditLogger";

export const dynamic = "force-dynamic";

export async function GET(
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
    const tournament = await db
      .collection("tournaments")
      .findOne({ _id: objId });
    if (!tournament)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ tournament });
  } catch (error) {
    console.error("Tournament GET error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const body = (await req.json()) as Record<string, unknown>;

    const allowedFields = [
      "name",
      "description",
      "startTime",
      "endTime",
      "rakePercent",
      "scoring_version",
      "maxUsers",
      "banner",
      "bannerImageUrl",
      "entryTiers",
      "status",
    ];

    const update: Record<string, unknown> = { updatedAt: new Date() };
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        update[field] = body[field];
        if (
          ["startTime", "endTime"].includes(field) &&
          typeof body[field] === "string"
        ) {
          update[field] = new Date(body[field] as string);
        }
      }
    }

    await db.collection("tournaments").updateOne({ _id: objId }, { $set: update });

    await createAuditLog({
      userId: session.user.id,
      username: session.user.username,
      userRole: session.user.role,
      action: AuditActions.TOURNAMENT_UPDATE || "TOURNAMENT_UPDATE",
      resource: AuditResources.TOURNAMENT || "Tournament",
      resourceId: params.id,
      method: "PATCH",
      endpoint: `/api/admin/tournaments/${params.id}`,
      status: "success",
      changes: { after: { updatedFields: Object.keys(update).filter((k) => k !== "updatedAt") } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tournament PATCH error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
