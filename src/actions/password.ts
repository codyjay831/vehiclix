"use server";

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/crypto";
import { sendPasswordResetEmail } from "@/lib/mail";
import { MIN_PASSWORD_LENGTH, PASSWORD_MIN_ERROR } from "@/lib/auth/password";

const RESET_TTL_MS = 60 * 60 * 1000;

function normalizeEmail(raw: string | null): string {
  return (raw ?? "").trim().toLowerCase();
}

function isPlausibleEmail(email: string): boolean {
  return email.length > 3 && email.includes("@") && !email.includes(" ");
}

/**
 * Always returns generic success for valid-looking emails to prevent account enumeration.
 */
export async function requestPasswordResetAction(formData: FormData) {
  const email = normalizeEmail(formData.get("email") as string | null);

  if (!isPlausibleEmail(email)) {
    return { ok: true as const };
  }

  const user = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, passwordHash: true, email: true },
  });

  if (!user?.passwordHash) {
    return { ok: true as const };
  }

  await db.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const baseUrl = process.env.APP_URL || "https://vehiclix.app";
  const resetUrl = new URL("/reset-password", baseUrl);
  resetUrl.searchParams.set("token", rawToken);

  const mailResult = await sendPasswordResetEmail({
    email: user.email,
    resetUrl: resetUrl.toString(),
  });

  if (!mailResult.success) {
    console.error("[PASSWORD_RESET] Email send failed:", mailResult.error);
  }

  return { ok: true as const };
}

export async function completePasswordResetAction(formData: FormData) {
  const token = (formData.get("token") as string | null)?.trim() ?? "";
  const password = formData.get("password") as string | null;
  const confirmPassword = formData.get("confirmPassword") as string | null;

  if (!token) {
    return { error: "Invalid or expired reset link." };
  }

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return { error: PASSWORD_MIN_ERROR };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const tokenHash = hashToken(token);

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true } } },
  });

  if (!record || record.usedAt !== null || record.expiresAt < new Date()) {
    return { error: "Invalid or expired reset link." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    db.passwordResetToken.deleteMany({
      where: { userId: record.userId, id: { not: record.id } },
    }),
  ]);

  redirect("/login?passwordReset=success");
}
