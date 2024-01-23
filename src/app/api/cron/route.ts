import connectToDB from "@/app/lib/mongoose";
import Users from "@/app/models/user.model";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../auth/[...nextauth]/options";
import { date } from "zod";

export const dynamic = "force-dynamic";

// to edit user URL: /api/cron?user_id=658253aa0389e2739141ae4d
export async function GET(req: NextRequest) {
    const date = new Date();
    try {
        await connectToDB();
        const user_id = "658253aa0389e2739141ae4d";

        // const requestBody = await req.json();
        // const editData: { [key: string]: string | boolean | number } = {};
        // if (requestBody) {
        //     Object.keys(requestBody).forEach((key) => {
        //         editData[key] = requestBody[key] as string | boolean | number;
        //     });
        // }

        const editData = {
            username: `Cron Job Successful! ${date}`,
        };

        // api/users/edit?user_id=658253aa0389e2739141ae4d
        if (user_id) {
            const user = await Users.findOneAndUpdate(
                { _id: user_id, isActive: true },
                editData,
                { new: true }
            ).select("-password");

            if (user) {
                return NextResponse.json(user, { status: 200 });
            } else {
                return NextResponse.json(
                    { message: "Cannot find User" },
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
