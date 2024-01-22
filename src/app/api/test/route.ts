import connectToDB from "@/app/lib/mongoose";
import Admins from "@/app/models/admin.model";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 400 });
    }
    console.log("session:", session);
    try {
        // await connectToDB();

        return NextResponse.json({ session });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Internal server error" });
    }
}

// sample session data:
// {
//     "session": {
//         "user": {
//             "id": "65a4cc6aa8ba82dbf88159eb",
//             "username": "bevsi",
//             "role": "owner"
//         }
//     }
// }
