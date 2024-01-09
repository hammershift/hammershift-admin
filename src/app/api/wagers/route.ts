import clientPromise from "@/app/lib/mongoDB";
import connectToDB from "@/app/lib/mongoose";
import Wagers from "@/app/models/wager.model";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db();
        await connectToDB();
        const wager_id = req.nextUrl.searchParams.get("wager_id");
        const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
        const limit = Number(req.nextUrl.searchParams.get("limit"));

        // api/wagers?wager_id=657bd345cf53f5078c72bbc8 to get a specific wager
        if (wager_id) {
            const wager = await db.collection("wagers").findOne({
                $and: [{ _id: new ObjectId(wager_id) }, { isActive: true }],
            });
            if (wager) {
                return NextResponse.json(wager, { status: 200 });
            } else {
                return NextResponse.json(
                    { message: "Cannot find Wager" },
                    { status: 404 }
                );
            }
        }
        // api/wagers to get all wagers
        const wagers = await db
            .collection("wagers")
            .find({ isActive: true })
            .limit(limit)
            .skip(offset);

        const wagersArray = await wagers.toArray();
        if (wagers) {
            return NextResponse.json(
                { total: wagersArray.length, wagers: wagersArray },
                { status: 200 }
            );
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
