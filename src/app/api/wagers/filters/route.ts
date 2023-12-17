import connectToDB from "@/app/lib/mongoose";
import Wagers from "@/app/models/wager.model";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        await connectToDB();
        const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
        const limit = Number(req.nextUrl.searchParams.get("limit"));
        const searchedKeyword = req.nextUrl.searchParams.get("search");

        if (searchedKeyword) {
            const searchedWagers = await Wagers.find({
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
                            //{ "_id": { $regex: searchedKeyword, $options: "i" }},
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
            if (searchedWagers) {
                return NextResponse.json(
                    { total: searchedWagers.length, users: searchedWagers },
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
