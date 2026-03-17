import { Resend } from "resend";

/**
 * Mail service abstraction.
 * Sends real transactional emails via Resend.
 */
export async function sendInviteEmail({
  email,
  dealershipName,
  inviteUrl,
}: {
  email: string;
  dealershipName: string;
  inviteUrl: string;
}) {
  const subject = `Welcome to Vehiclix Beta — Action Required for ${dealershipName}`;
  
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.MAIL_FROM_ADDRESS;

  // 1. Validate configuration
  if (!apiKey || apiKey === "re_dummy_for_build") {
    console.error("[MAIL] Configuration error: RESEND_API_KEY is missing or invalid.");
    return { success: false, error: "Email configuration error: RESEND_API_KEY is missing" };
  }
  
  if (!fromAddress) {
    console.error("[MAIL] Configuration error: MAIL_FROM_ADDRESS is missing.");
    return { success: false, error: "Email configuration error: MAIL_FROM_ADDRESS is missing" };
  }

  const resend = new Resend(apiKey);
  
  try {
    console.log(`[MAIL] Attempting to send email to ${email} via Resend...`);
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 8px;">
          <h1 style="color: #1A1A1A; text-transform: uppercase; letter-spacing: -0.05em;">Vehiclix</h1>
          <p style="font-size: 16px; color: #4A4A4A; line-height: 1.5;">Hello,</p>
          <p style="font-size: 16px; color: #4A4A4A; line-height: 1.5;">
            Your dealership, <strong>${dealershipName}</strong>, has been approved for Vehiclix Beta.
          </p>
          <p style="font-size: 16px; color: #4A4A4A; line-height: 1.5;">
            Please click the button below to set up your account and claim your dealership dashboard:
          </p>
          <div style="margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #1A1A1A; color: white; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: bold; display: inline-block; text-transform: uppercase; font-size: 12px; letter-spacing: 0.1em;">
              Set Up Account
            </a>
          </div>
          <p style="font-size: 12px; color: #999; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
            This link expires in 72 hours. If you did not request this access, please ignore this email.
          </p>
          <p style="font-size: 12px; color: #999;">
            &mdash; The Vehiclix Team
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[MAIL] Provider delivery failed:", error);
      return { success: false, error: `Email delivery failed: ${error.message}` };
    }

    console.log("[MAIL] Email sent successfully:", data?.id);
    return { success: true, data };
  } catch (err: any) {
    console.error("[MAIL] Exception during send:", err);
    return { success: false, error: `Email delivery failed: ${err.message || "Unknown error"}` };
  }
}
