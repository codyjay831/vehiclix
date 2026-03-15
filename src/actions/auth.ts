"use server";

import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { encrypt, decrypt } from "@/lib/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit";
import { getOrganizationById } from "@/lib/organization";

const SESSION_COOKIE_NAME = "evo_session";

/**
 * Sets the session cookie based on user role.
 */
async function setSessionCookie(user: { id: string; role: Role; email: string; organizationId?: string | null }, isTwoFactorVerified = true) {
  const expiresAt = new Date(
    Date.now() + (user.role === Role.OWNER ? 8 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000)
  );

  const session = await encrypt({
    userId: user.id,
    role: user.role,
    email: user.email,
    organizationId: user.organizationId,
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
      organizationId: user.organizationId || undefined,
    });

    const from = formData.get("from") as string;
    const baseUrl = process.env.APP_URL || "https://vehiclix.app";
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
    organizationId: user.organizationId || undefined,
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
  const organizationId = formData.get("organizationId") as string;

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
      // Resolve organization for upgrade
      const finalOrgId = organizationId || existingUser.organizationId;
      if (!finalOrgId) {
        return { error: "Organization context is required for registration" };
      }

      // Upgrade stub account in place
      user = await db.user.update({
        where: { id: existingUser.id },
        data: {
          firstName,
          lastName,
          phone,
          passwordHash,
          isStub: false,
          organizationId: finalOrgId,
        },
      });
    } else {
      return { error: "Email already registered" };
    }
  } else {
    // Resolve organization: 
    // 1. Check if an explicit organizationId was provided (pilot override)
    // 2. Fall back to error (No more Evo Motors defaults)
    const finalOrgId = organizationId;
    
    if (!finalOrgId) {
      return { error: "Organization context is required for registration" };
    }

    // NEW: Validate organization exists before creating user
    const orgExists = await db.organization.findUnique({ where: { id: finalOrgId } });
    if (!orgExists) {
      return { error: "Invalid organization context" };
    }

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
        organizationId: finalOrgId,
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
    organizationId: user.organizationId!,
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
      organizationId: session.organizationId || undefined,
    });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
  // HARDENING: Clear mock cookies to prevent implicit re-auth in development
  cookieStore.delete("evo_mock_role");
  cookieStore.delete("evo_mock_user_email");

  redirect("/login");
}

/**
 * Public action to fetch basic organization info for registration/branding.
 */
export async function getOrganizationInfoAction(id: string) {
  const org = await db.organization.findUnique({
    where: { id },
    select: { name: true, slug: true },
  });
  return org;
}
