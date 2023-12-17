import connectToDB from "@/app/lib/mongoose";
import Wagers from "@/app/models/wager.model";
import { NextRequest, NextResponse } from "next/server";

// to edit user
export async function PUT(req: NextRequest) {
    try {
        await connectToDB();
        const wager_id = req.nextUrl.searchParams.get("wager_id");

        const requestBody = await req.json();
        const editData: { [key: string]: string | boolean | number } = {};
        if (requestBody) {
            Object.keys(requestBody).forEach((key) => {
                editData[key] = requestBody[key] as string | boolean | number;
            });
        }

        // api/wagers/edit?wager_id=657ab7edd422075ea7871f65
        if (wager_id) {
            const wager = await Wagers.findOneAndUpdate(
                { _id: wager_id, isActive: true },
                editData,
                { new: true }
            );

            if (wager) {
                return NextResponse.json(wager, { status: 200 });
            } else {
                return NextResponse.json(
                    { message: "Cannot find Wager" },
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
