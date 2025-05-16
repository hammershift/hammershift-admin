import { NextRequest, NextResponse } from "next/server";
import Auctions from "@/app/models/auction.model";
import connectToDB from "@/app/lib/mongoose";

export async function PUT(req: NextRequest) {
  try {
    await connectToDB();
    const auction_id = req.nextUrl.searchParams.get("auction_id");
    const editDetails = await req.json();

    const updateObject: { [key: string]: any } = {};

    if (editDetails.image && editDetails.image !== "") {
      updateObject.image = editDetails.image;
    }
    if (editDetails.make && editDetails.make !== "") {
      updateObject["attributes.2.value"] = editDetails.make;
    }
    if (editDetails.model && editDetails.model !== "") {
      updateObject["attributes.3.value"] = editDetails.model;
    }
    if (editDetails.price && editDetails.price !== 0) {
      updateObject["attributes.0.value"] = editDetails.price;
    }
    if (editDetails.description && editDetails.description.length > 0) {
      updateObject.description = editDetails.description;
    }
    if (editDetails.status && editDetails.status !== null) {
      updateObject.isActive = editDetails.status === "active" ? true : false;
      updateObject.ended = editDetails.status === "ended" ? true : false;
    }

    if (Object.keys(updateObject).length === 0) {
      return NextResponse.json(
        { message: "No fields to update" },
        { status: 200 }
      );
    }

    const updateAuction = await Auctions.findOneAndUpdate(
      {
        auction_id: auction_id,
      },
      {
        $set: updateObject,
      },
      {
        new: true,
      }
    );

    if (!updateAuction) {
      return NextResponse.json(
        { message: "Auction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updateAuction, { status: 200 });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
