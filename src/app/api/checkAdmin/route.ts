import clientPromise from "@/app/lib/mongoDB";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const { username } = await req.json();
    console.log(username);

    try {
        const client = await clientPromise;
        const db = client.db();

        const response = {
            usernameExists: false,
        };

        if (username) {
            const usernameCheck = await db
                .collection("admins")
                .findOne({ username });
            if (usernameCheck) {
                response.usernameExists = true;
            }
        }

        return NextResponse.json(response, { status: 200 });
    } catch (error) {
        console.error("Error during user existence check", error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
