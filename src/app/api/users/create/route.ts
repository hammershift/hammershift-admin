import connectToDB from "@/app/lib/mongoose";
import Users from "@/app/models/user.model";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";

// to create user
export async function POST(req: NextRequest) {
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
    try {
        await connectToDB();

        const requestBody = await req.json();
        const createData: { [key: string]: any } = {};
        if (requestBody) {
            Object.keys(requestBody).forEach((key) => {
                createData[key] = requestBody[key] as string | boolean | number;
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(createData.password, salt);
        createData.password = hashedPassword;

        // api/users/create

        const user = await Users.create(createData);

        if (user) {
            return NextResponse.json(
                { message: "user has been created" },
                { status: 200 }
            );
        } else {
            return NextResponse.json(
                { message: "Cannot create user" },
                { status: 404 }
            );
        }
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Internal server error" });
    }
}
