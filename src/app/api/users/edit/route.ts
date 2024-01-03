import connectToDB from "@/app/lib/mongoose";
import Users from "@/app/models/user.model";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";

// to edit user
export async function PUT(req: NextRequest) {
    //check for authorization
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 400 });
    }

    try {
        await connectToDB();
        const user_id = req.nextUrl.searchParams.get("user_id");

        const requestBody = await req.json();
        const editData: { [key: string]: string | boolean | number } = {};
        if (requestBody) {
            Object.keys(requestBody).forEach((key) => {
                editData[key] = requestBody[key] as string | boolean | number;
            });
        }

        // api/users/edit?user_id=657ab7edd422075ea7871f65
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
