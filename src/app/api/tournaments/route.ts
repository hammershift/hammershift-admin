import connectToDB from "@/app/lib/mongoose";
import Tournaments from "@/app/models/tournament.model";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type TournamentData = {
    auctionID: string[];
    buyInFee: number;
    finalPrize: number;
    isActive: boolean;
    startTime: string;
    endTime: string;
};

// to GET tournament data
// URL = /api/tournaments?id=<insert id>    fetch one tournaments
// URL = /api/tournaments                   fetch all tournaments
export async function GET(req: NextRequest) {
    try {
        await connectToDB();
        const id = req.nextUrl.searchParams.get("id");
        const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
        const limit = Number(req.nextUrl.searchParams.get("limit"));

        // check if there is a request body
        if (id) {
            const tournament = await Tournaments.findOne({ _id: id });
            if (tournament) {
                return NextResponse.json(tournament, { status: 200 });
            } else {
                return NextResponse.json(
                    { message: "Cannot find tournament" },
                    { status: 404 }
                );
            }
        }

        // To get all auctions with isActive = true
        const tournaments = await Tournaments.find({ isActive: true })
            .limit(limit)
            .skip(offset);
        // count all tournaments with isActive = true
        const tournamentsCount = await Tournaments.countDocuments({
            isActive: true,
        });

        //response {total, tournaments}
        if (tournaments) {
            return NextResponse.json(
                { total: tournamentsCount, tournaments },
                { status: 200 }
            );
        } else {
            return NextResponse.json(
                { message: "Cannot post tournament" },
                { status: 404 }
            );
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            {
                message: "Internal server error",
                error,
            },
            { status: 500 }
        );
    }
}

// to POST tournament data
export async function POST(req: NextRequest) {
    try {
        await connectToDB();
        const tournamentData = await req.json();

        // check if there is a request body
        if (!tournamentData) {
            return NextResponse.json({
                message: "Please complete request body",
                status: 404,
            });
        }

        // check if required fields are present
        if (
            !tournamentData.auctionID ||
            !tournamentData.buyInFee ||
            !tournamentData.finalPrize ||
            !tournamentData.isActive ||
            !tournamentData.startTime ||
            !tournamentData.endTime
        ) {
            return NextResponse.json(
                { message: "Please complete request body" },
                { status: 404 }
            );
        }

        // Access the 'auctionID' property from the parsed request body
        const tournament = await Tournaments.create(tournamentData);
        if (tournament) {
            return NextResponse.json(tournament, { status: 200 });
        } else {
            return NextResponse.json(
                { message: "Cannot post tournament" },
                { status: 404 }
            );
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            {
                message: "Internal server error",
                error,
            },
            { status: 500 }
        );
    }
}
