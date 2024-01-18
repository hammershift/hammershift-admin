// import connectToDB from "@/lib/mongoose";
import connectToDB from "@/app/lib/mongoose";
import Admins from "@/app/models/admin.model";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        await connectToDB();
        const admin_id = req.nextUrl.searchParams.get("_id");
        const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
        const limit = Number(req.nextUrl.searchParams.get("limit"));

        // api/admins?auction_id=213123 to get a single admin
        if (admin_id) {
            const admin = await Admins.findOne({ _id: admin_id });
            return NextResponse.json(admin);
        }
        // api/admins to get all admins
        const admins = await Admins.find().limit(limit).skip(offset);
        return NextResponse.json({ total: admins.length, admins: admins });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Internal server error" });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (session?.user.role !== "owner") {
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
        await connectToDB();
        const { first_name, last_name, username, password } = await req.json();

        const existingAdmin = await Admins.findOne({ username });

        if (existingAdmin) {
            return NextResponse.json({ message: "Admin already exists" });
        } else if (!first_name || !last_name || !username || !password) {
            throw new Error("Please fill out required fields");
        } else {
            const hash = await bcrypt.hash(password, 10);

            await Admins.create({
                first_name,
                last_name,
                username,
                password: hash,
            });
            return NextResponse.json({ message: "Admin account created" });
        }
    } catch (error) {
        return NextResponse.json({
            message: "Internal server error",
            error: error,
        });
    }
}
