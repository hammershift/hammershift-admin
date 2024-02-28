import clientPromise from "@/app/lib/mongoDB";
import connectToDB from "@/app/lib/mongoose";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db();

        // api/wagers/count count all wagers
        const wagers = await db
            .collection("wagers")
            .countDocuments({ isActive: true });

        if (wagers) {
            return NextResponse.json({ total: wagers }, { status: 200 });
        } else {
            return NextResponse.json(
                { message: "Cannot find Wagers" },
                { status: 404 }
            );
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}
