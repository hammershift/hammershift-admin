import connectToDB from "@/app/lib/mongoose";
import Tournament from "@/app/models/tournament.model";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type TournamentData = {
    auctionID: string[];
    buyInFee: number;
    finalPrize: number;
    isActive: boolean;
    startTime: Date;
    endTime: Date;
};

// to GET tournament data
// URL = /api/tournaments?id=<insert id>    fetch one tournaments
// URL = /api/tournaments                   fetch all tournaments
export async function GET(req: NextRequest) {
    try {
        await connectToDB();
        const tournamentID = req.nextUrl.searchParams.get("id");
        const limit = Number(req.nextUrl.searchParams.get("limit"));
        const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;

        // api/users?user_id=<insert id> to get a specific user
        if (tournamentID) {
            const tournament = await Tournament.findOne({
                $and: [{ _id: tournamentID }, { isActive: true }],
            });
            if (tournament) {
                return NextResponse.json(tournament, { status: 200 });
            } else {
                return NextResponse.json(
                    { message: "Cannot find Tournament" },
                    { status: 404 }
                );
            }
        }

        // api/users to get all users that are active
        const tournaments = await Tournament.find({ isActive: true })
            .limit(limit)
            .skip(offset);

        if (tournaments) {
            return NextResponse.json({ tournaments }, { status: 200 });
        } else {
            return NextResponse.json(
                { message: "No users found" },
                { status: 404 }
            );
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Internal server error" });
    }
}

// to POST tournament data URL = /api/tournaments
// body = {auctionID, buyInFee, finalPrize, isActive, startTime, endTime}
export async function POST(req: NextRequest) {
    try {
        await connectToDB();
        const tournamentData = req.body;

        // check if there is a request body
        if (tournamentData == null) {
            return NextResponse.json(
                { message: "Please complete request body" },
                { status: 404 }
            );
        }
        // if (
        //     tournamentData.auctionID == null ||
        //     tournamentData.buyInFee == null ||
        //     tournamentData.finalPrize == null ||
        //     tournamentData.isActive == null ||
        //     tournamentData.startTime == null ||
        //     tournamentData.endTime == null
        // ) {
        //     return NextResponse.json(
        //         { message: "Please complete request body" },
        //         { status: 404 }
        //     );
        // }

        // Parse the request body as JSON
        const requestBody = JSON.parse(tournamentData.toString());

        // Access the 'auctionID' property from the parsed request body
        const tournament = await new Tournament(requestBody).save();
        if (tournament) {
            return NextResponse.json(tournament, { status: 200 });
        } else {
            return NextResponse.json(
                { message: "Cannot save tournament" },
                { status: 404 }
            );
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Internal server error" });
    }
}
