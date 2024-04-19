import clientPromise from "@/app/lib/mongoDB";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";

export async function POST(req: NextRequest) {
  try {
    const { email, otp, newPassword } = await req.json();

    // connect to DB
    const client = await clientPromise;
    const db = client.db();

    // verify OTP
    const otpRecord = await db
      .collection("password_reset_tokens")
      .findOne({ email, otp });
    if (!otpRecord || new Date() > new Date(otpRecord.expires)) {
      return NextResponse.json(
        { message: "Invalid or expired OTP." },
        { status: 400 }
      );
    }

    // hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // update password in admins collection
    await db
      .collection("admins")
      .updateOne({ email }, { $set: { password: hashedPassword } });

    return NextResponse.json(
      { message: "Password reset successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error during password reset:", error);
    return NextResponse.json(
      { message: "Error resetting password." },
      { status: 500 }
    );
  }
}
