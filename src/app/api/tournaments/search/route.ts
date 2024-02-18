import clientPromise from "@/app/lib/mongoDB";
import connectToDB from "@/app/lib/mongoose";
import Tournaments from "@/app/models/tournament.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db();
        const searchKeyword = req.nextUrl.searchParams.get("search");

        if (searchKeyword) {
            const searchedTournaments = await db
                .collection("tournaments")
                .aggregate([
                    {
                        $search: {
                            index: "tournamentSearch",
                            text: {
                                query: searchKeyword,
                                path: "title",
                                fuzzy: {
                                    prefixLength: 3,
                                },
                            },
                        },
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
