import connectToDB from "@/app/lib/mongoose";
import Wagers from "@/app/models/wager.model";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/app/lib/mongoDB";

export const dynamic = "force-dynamic";

// URL: /api/wagers/filters?limit=6&sort=newest&offset=0
export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db();

        const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
        const limit = Number(req.nextUrl.searchParams.get("limit"));
        const searchedKeyword = req.nextUrl.searchParams.get("search");
        const sort: string | null =
            req.nextUrl.searchParams.get("sort") || "newest";

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

        let sortObject;
        switch (sort) {
            case "newest":
                sortObject = { createdAt: -1 };
                break;
            case "oldest":
                sortObject = { createdAt: 1 };
                break;
            default:
                sortObject = { createdAt: -1 };
                break;
        }

        const searchedWagers = await db
            .collection("wagers")
            .find({})
            .sort(sortObject as any)
            .limit(limit)
            .skip(0);

        const searchedWagersArray = await searchedWagers.toArray();
        if (searchedWagers) {
            return NextResponse.json(
                {
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
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Internal server error" });
    }
}
