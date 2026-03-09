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

    // look for the user by email
    const user = await db.collection("admins").findOne({ email });
    if (!user) {
      return NextResponse.json(
        { message: "No account associated with this email address." },
        { status: 404 }
      );
    }

    // generate a new OTP
    const newOtp = String(randomInt(100000, 999999));

    const newExpirationDate = new Date(new Date().getTime() + 10 * 60 * 1000);

    // update the OTP in the db
    await db.collection("admin_password_reset_tokens").updateOne(
      { userId: user._id },
      {
        $set: { otp: newOtp, expires: newExpirationDate, email: user.email },
      },
      { upsert: true }
    );

    // TODO: Send the new OTP via email

    return NextResponse.json(
      { message: "A new OTP has been sent to your email" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error during OTP resend:", error);
    return NextResponse.json(
      { message: "An error occurred while resending the OTP." },
      { status: 500 }
    );
  }
});
