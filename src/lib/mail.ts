/**
 * Mail service abstraction.
 * Currently simulates email by logging to console.
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
  const body = `
Hi there,

Your request for beta access to Vehiclix for ${dealershipName} has been approved!

Please click the link below to set up your account and claim your dealership dashboard:

${inviteUrl}

This link will expire in 72 hours.

Best regards,
The Vehiclix Team
  `;

  // Simulation: Log to console
  console.log("--------------------------------------------------");
  console.log("📧 INVITE EMAIL SENT");
  console.log(`TO: ${email}`);
  console.log(`SUBJECT: ${subject}`);
  console.log("BODY:");
  console.log(body);
  console.log("--------------------------------------------------");

  // Return success for simulation
  return { success: true };
}
