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
        const date = req.nextUrl.searchParams.get("date");

        if (date) {
            const wagersOnThatDay = await db
                .collection("wagers")
                .find({ createdAt: { $gte: new Date(date) } });
            const wagersOnThatDayArray = await wagersOnThatDay.toArray();
            if (wagersOnThatDay) {
                return NextResponse.json(
                    {
                        total: wagersOnThatDayArray.length,
                        wagers: wagersOnThatDayArray,
                    },
                    { status: 200 }
                );
            } else {
                return NextResponse.json(
                    { message: "Cannot find Wagers" },
                    { status: 404 }
                );
            }
        }

        const query = {
            $and: [
                {
                    createdAt: {
                        $gte: `${date}T00:00:00Z`,
                        $lt: `${date}T23:59:59Z`,
                    },
                },
            ],
        };

        // api/wagers to get all wagers
        const wagers = await db
            .collection("wagers")
            .find({ $and: [query, { isActive: true }] });

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
