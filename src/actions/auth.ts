"use server";

import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { encrypt } from "@/lib/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit";

const SESSION_COOKIE_NAME = "evo_session";

/**
 * Sets the session cookie based on user role.
 */
async function setSessionCookie(user: { id: string; role: Role; email: string }, isTwoFactorVerified = true) {
  const expiresAt = new Date(
    Date.now() + (user.role === Role.OWNER ? 8 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000)
  );

  const session = await encrypt({
    userId: user.id,
    role: user.role,
    email: user.email,
    expiresAt,
    isTwoFactorVerified,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

/**
 * Login action for both customers and owners.
 */
export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const user = await db.user.findUnique({
    where: { email },
  });

  if (!user || !user.passwordHash) {
    return { error: "Invalid credentials" };
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return { error: "Invalid credentials" };
  }

  // Handle Owner 2FA
  if (user.role === Role.OWNER && user.twoFactorEnabled) {
    if (!user.twoFactorSecret) {
      throw new Error("Configuration error: Owner 2FA enabled but secret is missing.");
    }

    // Set a "partial" session where isTwoFactorVerified is false
    await setSessionCookie(user, false);

    await logAuditEvent({
      eventType: "auth.2fa_prompted",
      actorId: user.id,
      actorRole: user.role,
      entityType: "User",
      entityId: user.id,
    });

    const from = formData.get("from") as string;
    const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
    const verifyUrl = new URL("/login/verify-2fa", baseUrl);
    if (from) verifyUrl.searchParams.set("from", from);
    redirect(`${verifyUrl.pathname}${verifyUrl.search}`);
  }

  await setSessionCookie(user);

  await logAuditEvent({
    eventType: "auth.login",
    actorId: user.id,
    actorRole: user.role,
    entityType: "User",
    entityId: user.id,
    metadata: {
      email: user.email,
    },
  });

  const from = formData.get("from") as string;
  redirect(from || (user.role === Role.OWNER ? "/admin" : "/portal"));
}

/**
 * Registration action for customers.
 * Implements "Find and Upgrade" stub account logic.
 */
export async function registerAction(formData: FormData) {
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;

  if (!firstName || !lastName || !email || !password) {
    return { error: "Required fields are missing" };
  }

  const existingUser = await db.user.findUnique({
    where: { email },
  });

  const passwordHash = await bcrypt.hash(password, 10);

  let user;

  if (existingUser) {
    if (existingUser.isStub) {
      // Upgrade stub account in place
      user = await db.user.update({
        where: { id: existingUser.id },
        data: {
          firstName,
          lastName,
          phone,
          passwordHash,
          isStub: false,
        },
      });
    } else {
      return { error: "Email already registered" };
    }
  } else {
    // Create new customer
    user = await db.user.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        passwordHash,
        role: Role.CUSTOMER,
        isStub: false,
      },
    });
  }

  await setSessionCookie(user);

  await logAuditEvent({
    eventType: "auth.register",
    actorId: user.id,
    actorRole: user.role,
    entityType: "User",
    entityId: user.id,
    metadata: {
      email: user.email,
    },
  });

  redirect("/portal");
}

/**
 * Logout action.
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await decrypt(token);

  if (session) {
    await logAuditEvent({
      eventType: "auth.logout",
      actorId: session.userId,
      actorRole: session.role,
      entityType: "User",
      entityId: session.userId,
    });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
