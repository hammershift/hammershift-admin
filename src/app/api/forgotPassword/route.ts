import { sendOtpEmail } from "@/app/lib/mail";
import clientPromise from "@/app/lib/mongoDB";
import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { withRateLimit, RateLimitPresets } from "@/app/lib/rateLimiter";

export const POST = withRateLimit(RateLimitPresets.AUTH, async (req: NextRequest) => {
  try {
    const data = await req.json();
    const { email } = data;

    // connect to DB
    const client = await clientPromise;
    const db = client.db();

    // look for the admin by email
    const admin = await db.collection("admins").findOne({ email });
    if (!admin) {
      return NextResponse.json(
        {
          message:
            "If an email address is associated with an account, we will process the password reset.",
        },
        { status: 200 }
      );
    }

    // otp generator
    const otp = String(randomInt(100000, 999999));
    const expirationDate = new Date(new Date().getTime() + 10 * 60 * 1000);

    // store it in the db
    console.log("Inserting OTP into the database");
    await db.collection("admin_password_reset_tokens").insertOne({
      userId: admin._id,
      email: email,
      otp: otp,
      expires: expirationDate,
    });
    console.log("OTP inserted successfully");

    // TODO: Reset token to store, and expiration date maybe?
    const emailResult = await sendOtpEmail({ to: email, otp });
    if (!emailResult.success) {
      console.error("Failed to send OTP email:", emailResult.error);
      return NextResponse.json(
        { message: "Failed to send OTP email" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Password reset process has been initiated" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      {
        message:
          "An error occurred while processing the password reset request",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
});
