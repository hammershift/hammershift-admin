import clientPromise from "@/app/lib/mongoDB";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { otp } = await req.json();

    // connect to DB
    const client = await clientPromise;
    const db = client.db();

    // check OTP code record in the collection
    const otpCodeRecord = await db
      .collection("password_reset_tokens")
      .findOne({ otp });
    if (!otpCodeRecord) {
      return NextResponse.json(
        { message: "Invalid or incorrect OTP code" },
        { status: 400 }
      );
    }

    // check if the OTP has expired
    if (new Date() > new Date(otpCodeRecord.expires)) {
      return NextResponse.json(
        { message: "OTP code has expired" },
        { status: 400 }
      );
    }

    // if OTP code is valid
    return NextResponse.json(
      { message: "OTP code verified successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error during OTP verification:", error);
    return NextResponse.json(
      { message: "An error occurred while verifying the OTP code" },
      { status: 500 }
    );
  }
}
