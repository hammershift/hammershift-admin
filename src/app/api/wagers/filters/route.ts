import connectToDB from "@/app/lib/mongoose";
import Wagers from "@/app/models/wager.model";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/app/lib/mongoDB";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db();
        await connectToDB();
        const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
        const limit = Number(req.nextUrl.searchParams.get("limit"));
        const searchedKeyword = req.nextUrl.searchParams.get("search");

        if (searchedKeyword) {
            const searchedWagers = await db
                .collection("wagers")
                .find({
                    $and: [
                        { isActive: true },
                        {
                            $or: [
                                {
                                    "user.fullName": {
                                        $regex: searchedKeyword,
                                        $options: "i",
                                    },
                                },
                                {
                                    "user.username": {
                                        $regex: searchedKeyword,
                                        $options: "i",
                                    },
                                },
                            ],
                        },
                    ],
                })
                .limit(limit)
                .skip(offset);

            const searchedWagersArray = await searchedWagers.toArray();
            if (searchedWagers) {
                return NextResponse.json(
                    {
                        total: searchedWagersArray.length,
                        wagers: searchedWagersArray,
                    },
                    { status: 200 }
                );
            } else {
                return NextResponse.json(
                    { message: "no search result" },
                    { status: 404 }
                );
            }
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Internal server error" });
    }
}
