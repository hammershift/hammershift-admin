import clientPromise from "@/app/lib/mongoDB";
import connectToDB from "@/app/lib/mongoose";
import Wagers from "@/app/models/wager.model";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

// /api/wagers/weekly
export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db();
        // await connectToDB();
        const date: string | null = req.nextUrl.searchParams.get("date");

        // date string for start of day
        const startOfToday = new Date(date as string);
        startOfToday.setHours(0, 0, 0, 0);

        //date string for end of day
        const endOfToday = new Date(date as string);
        endOfToday.setHours(23, 59, 59, 999);

        // api/wagers to get all wagers
        const wagers = await db
            .collection("wagers")
            .find({
                createdAt: {
                    $gte: startOfToday,
                    $lt: endOfToday,
                },
            })
            .toArray();

        // To add {isActive: true} to the query
        // const wagers = await db
        //     .collection("wagers")
        //     .find({ $and: [query, { isActive: true }] });

        const totalAmount = wagers.reduce((a, b) => a + b.wagerAmount, 0);

        if (wagers) {
            return NextResponse.json(
                { total: wagers.length, totalAmount, wagers: wagers },
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
