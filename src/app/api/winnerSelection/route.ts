import connectToDB from "@/app/lib/mongoose";
import Auctions from "@/app/models/auction.model";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import clientPromise from "@/app/lib/mongoDB";
import prizeDistribution from "@/app/lib/prizeDistribution";
import { ObjectId } from "mongodb";

// URL: /api/winnerSelection?auction_id=68490202
export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db();
        const auction_id = req.nextUrl.searchParams.get("auction_id");

        //add selecting all status 2 auctions

        // if no auction_id is provided
        if (!auction_id) {
            return NextResponse.json(
                {
                    message: "Bad request! Please provide an auction_id",
                },
                { status: 400 }
            );
        }

        // api/auctions?auction_id=213123 to get a single car
        const auction = await db
            .collection("auctions")
            .findOne({ auction_id: auction_id });

        const wagers = await db
            .collection("wagers")
            .find({ auctionIdentifierId: auction_id })
            .toArray();

        // check if enough number wagers to select winners
        // To be integerated with the API created by AJ and miel
        if (wagers.length <= 2) {
            return NextResponse.json(
                {
                    message: "Bad request! Not enough wagers to select winners",
                },
                { status: 400 }
            );
        }

        // if auction does not exist
        if (!auction) {
            return NextResponse.json(
                {
                    message: "Bad request! Auction does not exist",
                },
                { status: 400 }
            );
        }

        // select winners from wagers
        const winners = await prizeDistribution(
            wagers,
            auction.attributes.finalSellingPrice,
            auction.pot
        );

        // distribute prizes to winners
        if (winners) {
            await Promise.all(
                winners.map(async (winner) => {
                    const user = await db
                        .collection("users")
                        .findOneAndUpdate(
                            { _id: new ObjectId(winner.userID) },
                            { $inc: { balance: winner.prize } }
                        );
                    if (!user) {
                        console.log(
                            "Error distributing prizes to winner:",
                            winner.userID
                        );
                    } else {
                        console.log(
                            "Successfully distributed prizes to winner:",
                            winner.userID
                        );
                    }
                })
            );
        }

        // update auction document: winners and status: 4
        const statusIndex = auction.attributes.findIndex(
            (attr: any) => attr.key === "status"
        );
        const updatedAuction = await db.collection("auctions").findOneAndUpdate(
            { auction_id: auction_id },
            {
                $set: {
                    winners: winners,
                    [`attributes.${statusIndex}.value`]: 4,
                },
            }
        );

        // check if auction was updated
        if (updatedAuction) {
            return NextResponse.json({
                message: "Winners selected! Prizes distributed!",
            });
        } else {
            return NextResponse.json({
                message: "Error selecting winners",
            });
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Internal server error" });
    }
}
