import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_for_build");
const FROM_ADDRESS = process.env.MAIL_FROM_ADDRESS || "noreply@vehiclix.com";

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
  
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
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
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("Email sending failed:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}
