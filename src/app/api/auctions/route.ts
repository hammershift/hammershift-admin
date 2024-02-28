import Auctions from "@/app/models/auction.model";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import clientPromise from "@/app/lib/mongoDB";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db();
        const auction_id = req.nextUrl.searchParams.get("auction_id");
        const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
        const limit = Number(req.nextUrl.searchParams.get("limit"));

        // api/auctions?auction_id=213123 to get a single car
        if (auction_id) {
            const auction = await db
                .collection("auctions")
                .findOne({ auction_id: auction_id });
            return NextResponse.json(auction);
        }

        // api/cars to get all cars
        const cars = await db
            .collection("auctions")
            .find({ $and: [{ isActive: true }] })
            .limit(limit)
            .skip(offset);

        const carsArray = await cars.toArray();

        return NextResponse.json({ total: carsArray.length, cars: carsArray });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Internal server error" });
    }
}

export async function PUT(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (session?.user.role !== "owner" && session?.user.role !== "admin") {
        return NextResponse.json(
            {
                message:
                    "Unauthorized! Your role does not have access to this function",
            },
            { status: 400 }
        );
    }

    console.log("User is Authorized!");

    try {
        const client = await clientPromise;
        const db = client.db();
        // await connectToDB();
        const auction_id = req.nextUrl.searchParams.get("auction_id");
        const newAuctionDetails = await req.json();

        const updatedAuction = await db
            .collection("auctions")
            .findOneAndUpdate({ auction_id: auction_id }, newAuctionDetails);

        if (!updatedAuction) {
            return NextResponse.json({ message: "Auction not found" });
        }

        return NextResponse.json(updatedAuction);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Internal server error" });
    }
}
