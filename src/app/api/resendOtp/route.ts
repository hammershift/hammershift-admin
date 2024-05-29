import clientPromise from "@/app/lib/mongoDB";
import { NextRequest, NextResponse } from "next/server";
import otpGenerator from "otp-generator";

export async function POST(req: NextRequest) {
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
    const newOtp = otpGenerator.generate(6, {
      digits: true,
      specialChars: false,
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
    });

    const newExpirationDate = new Date(new Date().getTime() + 1 * 60000);

    // update the OTP in the db
    await db.collection("password_reset_tokens").updateOne(
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
}
