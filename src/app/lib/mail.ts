import { Resend } from "resend";

interface OtpEmailOptions {
  to: string;
  otp: string;
}

async function sendOtpEmail({ to, otp }: OtpEmailOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("RESEND_API_KEY not configured");
    return { success: false, error: "Email service not configured" };
  }

  const resend = new Resend(apiKey);

  // Use verified domain (velocity-markets.com)
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@velocity-markets.com";

  try {
    const { data, error } = await resend.emails.send({
      from: `Hammershift Support <${fromEmail}>`,
      to,
      subject: "Your OTP for Password Reset",
      html: `
        <h1>Password Reset Request</h1>
        <p>Hello,</p>
        <p>We received a password reset request for your account. Here is your One-Time Password (OTP) to proceed:</p>
        <h2>${otp}</h2>
        <p>This OTP will expire in 1 minute.</p>
        <p>If you did not request this, please ignore this email or contact support.</p>
      `,
    });

    if (error) {
      console.error("Failed to send OTP email:", error);
      return { success: false, error: error.message };
    }

    console.log("Email sent successfully:", data?.id);
    return { success: true, messageId: data?.id };
  } catch (error: any) {
    console.error("Failed to send OTP email:", error);
    return { success: false, error: error.message };
  }
}

export { sendOtpEmail };
