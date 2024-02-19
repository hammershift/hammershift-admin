import clientPromise from "@/app/lib/mongoDB";
import connectToDB from "@/app/lib/mongoose";
import Tournaments from "@/app/models/tournament.model";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// search for tournaments by title or buyInFee
// URL = /api/tournaments/search?search=<insert search keyword>
export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db();
        const searchKeyword = req.nextUrl.searchParams.get("search");

        //TODO: search sensitivity
        if (searchKeyword) {
            const searchedTournaments = await db
                .collection("tournaments")
                .aggregate([
                    {
                        $search: {
                            index: "tournamentSearch",
                            text: {
                                query: searchKeyword,
                                path: ["title", "buyInFee"],
                                fuzzy: {
                                    prefixLength: 1,
                                },
                            },
                        },
                    },
                    {
                        $limit: 7,
                    },
                ])
                .toArray();

            return NextResponse.json(
                {
                    total: searchedTournaments.length,
                    tournaments: searchedTournaments,
                },
                { status: 200 }
            );
        }
        return NextResponse.json(
            {
                message:
                    "Please provide a search keyword to search for tournaments",
            },
            { status: 500 }
        );
    } catch (error) {
        console.log(error);
        return NextResponse.json(
            {
                message: "Internal server error",
                error,
            },
            { status: 500 }
        );
    }
}
