// import connectToDB from "@/lib/mongoose";
import Admins from "@/app/models/admin.model";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import clientPromise from "@/app/lib/mongoDB";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db();
        const admin_id = req.nextUrl.searchParams.get("_id");
        const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
        const limit = Number(req.nextUrl.searchParams.get("limit"));

        // api/admins?auction_id=213123 to get a single admin
        if (admin_id) {
            const admin = await db
                .collection("admins")
                .findOne({ _id: new ObjectId(admin_id) });
            return NextResponse.json(admin);
        }
        // api/admins to get all admins
        const admins = await db
            .collection("admins")
            .find()
            .limit(limit)
            .skip(offset)
            .toArray();

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
        const client = await clientPromise;
        const db = client.db();
        const { first_name, last_name, email, username, password, role } =
            await req.json();

        const existingAdmin = await db
            .collection("admins")
            .findOne({ username });

        if (existingAdmin) {
            return NextResponse.json({ message: "Admin already exists" });
        } else if (
            !first_name ||
            !last_name ||
            !email ||
            !username ||
            !password ||
            !role
        ) {
            throw new Error("Please fill out required fields");
        } else {
            const hash = await bcrypt.hash(password, 10);
            const newAdminData = new Admins({
                first_name,
                last_name,
                email,
                username,
                password: hash,
                role,
                createdAt: new Date(),
            });

            const newAdmin = await db
                .collection("admins")
                .insertOne(newAdminData);
            console.log("Received email:", email);
            console.log("Received role:", role);
            console.log("Created Admin:", newAdmin);
            return NextResponse.json({ message: "Admin account created" });
        }
    } catch (error) {
        return NextResponse.json({
            message: "Internal server error",
            error: error,
        });
    }
}
