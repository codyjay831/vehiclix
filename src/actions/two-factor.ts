"use server";

import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/encryption";
import { decrypt, encrypt } from "@/lib/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TOTP } from "otplib";
const authenticator = new TOTP();
import { logAuditEvent } from "@/lib/audit";
import { Role } from "@prisma/client";

const SESSION_COOKIE_NAME = "evo_session";

/**
 * Re-issues the session cookie with the isTwoFactorVerified flag set to true.
 */
async function setVerifiedSessionCookie(session: { userId: string; role: Role; email: string; organizationId?: string | null }) {
  const expiresAt = new Date(
    Date.now() + (session.role === Role.OWNER ? 8 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000)
  );

  const newSession = await encrypt({
    userId: session.userId,
    role: session.role,
    email: session.email,
    organizationId: session.organizationId,
    expiresAt,
    isTwoFactorVerified: true,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, newSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

/**
 * Verifies the 2FA code provided by the user.
 */
export async function verify2FAAction(formData: FormData) {
  const code = formData.get("code") as string;
  const from = formData.get("from") as string || "/admin";

  if (!code || code.length !== 6) {
    return { error: "A 6-digit code is required" };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await decrypt(token);

  if (!session || session.isTwoFactorVerified) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
  });

  if (!user || !user.twoFactorSecret) {
    redirect("/login");
  }

  const decryptedSecret = decryptSecret(user.twoFactorSecret);
  const result = await authenticator.verify(code, { secret: decryptedSecret });
  const isValid = result.valid;

  if (!isValid) {
    await logAuditEvent({
      eventType: "auth.2fa_failed",
      actorId: user.id,
      actorRole: user.role,
      entityType: "User",
      entityId: user.id,
      organizationId: user.organizationId || undefined,
    });
    return { error: "Invalid verification code" };
  }

  await setVerifiedSessionCookie(session);

  await logAuditEvent({
    eventType: "auth.2fa_verified",
    actorId: user.id,
    actorRole: user.role,
    entityType: "User",
    entityId: user.id,
    organizationId: user.organizationId || undefined,
  });

  redirect(from);
}
