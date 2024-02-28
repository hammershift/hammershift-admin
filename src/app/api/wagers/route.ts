import clientPromise from "@/app/lib/mongoDB";
import connectToDB from "@/app/lib/mongoose";
import Wagers from "@/app/models/wager.model";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db();

        const wager_id = req.nextUrl.searchParams.get("wager_id");
        const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
        const limit = Number(req.nextUrl.searchParams.get("limit"));
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

// edit wager
export async function PUT(req: NextRequest) {
    //check for authorization
    const session = await getServerSession(authOptions);
    if (session?.user.role !== "owner" && session?.user.role !== "admin") {
        console.log("User is Authorized!");
        return NextResponse.json(
            {
                message:
                    "Unauthorized! Your role does not have access to this function",
            },
            { status: 400 }
        );
    }

    try {
        const client = await clientPromise;
        const db = client.db();
        const wager_id = req.nextUrl.searchParams.get("wager_id");

        const requestBody = await req.json();
        const editData: { [key: string]: string | boolean | number } = {};
        if (requestBody) {
            Object.keys(requestBody).forEach((key) => {
                editData[key] = requestBody[key] as string | boolean | number;
            });
        }

        // /api/wagers?wager_id=657ab7edd422075ea7871f65
        if (wager_id) {
            const wager = await db
                .collection("wagers")
                .findOneAndUpdate(
                    { _id: new ObjectId(wager_id) },
                    { $set: editData }
                );

            if (wager) {
                return NextResponse.json(wager, { status: 200 });
            } else {
                return NextResponse.json(
                    { message: "Cannot find Wager" },
                    { status: 404 }
                );
            }
        } else {
            return NextResponse.json(
                { message: "No ID has been provided" },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Internal server error" });
    }
}
