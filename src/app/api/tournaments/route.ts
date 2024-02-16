import connectToDB from "@/app/lib/mongoose";
import Tournaments from "@/app/models/tournament.model";
import Auctions from "@/app/models/auction.model";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import { CarData } from "@/app/dashboard/auctions/page";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

type TournamentData = {
    title: string;
    buyInFee: number;
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
        const tournaments = await Tournaments.find()
            .sort({ createdAt: -1 }) //newest first
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
// sample request body:
/*{
    "title": "Random Collections Tournament"
    "auctionID": ["65b06c9a5860b968d880c6e9", "65b309b0990459fcb7461e02", "65b309b1990459fcb7461e34", "65b309b1990459fcb7461e66", "65b38cc682288dfdce7db1c9" ],
    "buyInFee": 50,
    "startTime": "2024-02-05T07:34:45.337Z",
    "endTime": "2024-02-10T07:34:45.337Z"
}*/
export async function POST(req: NextRequest) {
    // check if user is authorized to access this function(owner, admin, moderator)
    // TODO: uncomment this after testing
    const session = await getServerSession(authOptions);
    if (
        session?.user.role !== "owner" &&
        session?.user.role !== "admin" &&
        session?.user.role !== "moderator"
    ) {
        return NextResponse.json(
            {
                message:
                    "Unauthorized! Your role does not have access to this function",
            },
            { status: 400 }
        );
    }

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
            !tournamentData.title ||
            !tournamentData.buyInFee ||
            !tournamentData.startTime ||
            !tournamentData.endTime
        ) {
            return NextResponse.json(
                { message: "Please complete request body" },
                { status: 404 }
            );
        }

        const { auctionID, ...newTournamentData } = tournamentData;

        //Create tournament
        // added pot and isActive
        const tournament = await Tournaments.create(newTournamentData);
        let auctionsData: CarData[] = [];
        if (tournament && auctionID.length > 0) {
            await Promise.all(
                auctionID.map(async (id: string) => {
                    const updatedAuction = await Auctions.findOneAndUpdate(
                        { _id: new ObjectId(id) },
                        { $push: { tournamentID: tournament._id } },
                        { new: true }
                    );
                    if (updatedAuction !== null) {
                        auctionsData.push(updatedAuction);
                    }
                })
            );

            if (auctionsData.length > 0) {
                return NextResponse.json(
                    { tournament, auctionsData },
                    { status: 200 }
                );
            } else {
                return NextResponse.json(
                    { message: "Error in updating Auctions" },
                    { status: 404 }
                );
            }
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

// to PUT tournament data
export async function PUT(req: NextRequest) {
    //   const session = await getServerSession(authOptions);
    //   if (session?.user.role !== "owner" && session?.user.role !== "admin") {
    //     return NextResponse.json(
    //       {
    //         message:
    //           "Unauthorized! Your role does not have access to this function",
    //       },
    //       { status: 400 }
    //     );
    //   }

    // console.log("User is Authorized!");

    try {
        await connectToDB();
        const tournament_id = req.nextUrl.searchParams.get("id");

        const requestBody = await req.json();
        const editData: { [key: string]: string | boolean | number } = {};
        if (requestBody) {
            Object.keys(requestBody).forEach((key) => {
                editData[key] = requestBody[key] as string | boolean | number;
            });
        }

        // api/users/edit?user_id=657ab7edd422075ea7871f65
        if (tournament_id) {
            const tournament = await Tournaments.findOneAndUpdate(
                { _id: tournament_id },
                editData,
                { new: true }
            );

            if (tournament) {
                console.log("message: Tournament deleted successfully");
                return NextResponse.json(tournament, { status: 200 });
            } else {
                return NextResponse.json(
                    { message: "Cannot find tournament" },
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
