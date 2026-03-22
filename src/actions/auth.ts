"use server";

// SUPPORT MODE PROTECTION
// All mutations must call requireWriteAccess()
// Do not hardcode actorRole
// Use requireUserWithOrg()

import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { encrypt, decrypt } from "@/lib/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit";
import { getOrganizationById } from "@/lib/organization";
import { effectivePostLoginReturnPath } from "@/lib/api/auth-bridge-utils";
import { MIN_PASSWORD_LENGTH, PASSWORD_MIN_ERROR } from "@/lib/auth/password";
import { getAuthenticatedUser } from "@/lib/auth";
import { requireWriteAccess } from "@/lib/support";

const SESSION_COOKIE_NAME = "evo_session";

/**
 * Sets the session cookie based on user role.
 */
async function setSessionCookie(user: { id: string; role: Role; email: string; organizationId?: string | null }, isTwoFactorVerified = true) {
  console.log("SESSION: setSessionCookie called", { userId: user.id, isTwoFactorVerified });
  const expiresAt = new Date(
    Date.now() + (user.role === Role.OWNER ? 8 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000)
  );

  console.log("SESSION: encrypting payload", { expiresAt: expiresAt.toISOString() });
  try {
    const session = await encrypt({
      userId: user.id,
      role: user.role,
      email: user.email,
      organizationId: user.organizationId,
      expiresAt,
      isTwoFactorVerified,
    });
    console.log("SESSION: encryption successful");

    const cookieStore = await cookies();
    console.log("SESSION: setting cookie", SESSION_COOKIE_NAME);
    cookieStore.set(SESSION_COOKIE_NAME, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });
    console.log("SESSION: cookie set successful");
  } catch (error) {
    console.error("SESSION: error setting session cookie", error);
    throw error;
  }
}

/**
 * Login action for both customers and owners.
 */
export async function loginAction(formData: FormData) {
  console.log("ENV CHECK", {
    DATABASE_URL: !!process.env.DATABASE_URL,
    AUTH_SECRET: !!process.env.AUTH_SECRET,
    TWO_FACTOR_ENCRYPTION_KEY: !!process.env.TWO_FACTOR_ENCRYPTION_KEY,
    APP_URL: !!process.env.APP_URL,
    NEXT_PUBLIC_PLATFORM_DOMAIN: !!process.env.NEXT_PUBLIC_PLATFORM_DOMAIN,
  });

  console.log("LOGIN STEP: request received");
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    console.log("LOGIN STEP: missing email/password");
    return { error: "Email and password are required" };
  }

  try {
    console.log("LOGIN STEP: verifying database connectivity");
    await db.$queryRaw`SELECT 1`;
    console.log("LOGIN STEP: database connectivity confirmed");
  } catch (error) {
    console.error("LOGIN STEP: database connectivity failed", error);
    return { error: "Database connection failed" };
  }

  console.log("LOGIN STEP: searching for user", email);
  const user = await db.user.findUnique({
    where: { email },
  });

  if (!user || !user.passwordHash) {
    console.log("LOGIN STEP: user not found or passwordHash missing");
    return { error: "Invalid credentials" };
  }
  console.log("LOGIN STEP: user found", user.id);

  console.log("LOGIN STEP: verifying password");
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    console.log("LOGIN STEP: invalid password");
    return { error: "Invalid credentials" };
  }
  console.log("LOGIN STEP: password verified");

  // Handle Owner 2FA
  if (user.role === Role.OWNER && user.twoFactorEnabled) {
    console.log("LOGIN STEP: handling 2FA for owner");
    if (!user.twoFactorSecret) {
      console.error("LOGIN STEP: 2FA secret missing");
      throw new Error("Configuration error: Owner 2FA enabled but secret is missing.");
    }

    // Set a "partial" session where isTwoFactorVerified is false
    console.log("LOGIN STEP: creating partial 2FA session");
    await setSessionCookie(user, false);

    console.log("LOGIN STEP: logging audit event (2fa_prompted)");
    await logAuditEvent({
      eventType: "auth.2fa_prompted",
      actorId: user.id,
      actorRole: user.role,
      entityType: "User",
      entityId: user.id,
      organizationId: user.organizationId || undefined,
    });

    const safeFrom = effectivePostLoginReturnPath(formData.get("from") as string | null);
    const baseUrl = process.env.APP_URL || "https://vehiclix.app";
    const verifyUrl = new URL("/login/verify-2fa", baseUrl);
    if (safeFrom) verifyUrl.searchParams.set("from", safeFrom);
    console.log("LOGIN STEP: redirecting to 2FA", verifyUrl.toString());
    redirect(`${verifyUrl.pathname}${verifyUrl.search}`);
  }

  console.log("LOGIN STEP: creating session");
  await setSessionCookie(user);
  console.log("LOGIN STEP: session created");

  console.log("LOGIN STEP: logging audit event (login)");
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

  const safeFrom = effectivePostLoginReturnPath(formData.get("from") as string | null);
  const defaultRedirect =
    user.role === Role.SUPER_ADMIN
      ? "/super-admin"
      : user.role === Role.OWNER || user.role === Role.STAFF
        ? "/admin"
        : "/portal";
  const redirectTarget = safeFrom ?? defaultRedirect;

  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/329925ab-9b1c-4864-8917-f8b91cf631b6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b6598c'},body:JSON.stringify({sessionId:'b6598c',location:'actions/auth.ts:loginRedirect',message:'post-login redirect',data:{userId:user.id,role:user.role,fromRaw:formData.get("from"),defaultRedirect,redirectTarget},timestamp:Date.now(),hypothesisId:'A,C'})}).catch(()=>{});
  // #endregion

  console.log("LOGIN STEP: redirecting to", redirectTarget);
  redirect(redirectTarget);
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

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: PASSWORD_MIN_ERROR };
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
  console.log("LOGOUT: logoutAction called");
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  console.log("LOGOUT: token present", !!token);
  const session = await decrypt(token);

  if (session) {
    console.log("LOGOUT: session found for user", session.userId);
    await logAuditEvent({
      eventType: "auth.logout",
      actorId: session.userId,
      actorRole: session.role,
      entityType: "User",
      entityId: session.userId,
      organizationId: session.organizationId || undefined,
    });
  } else {
    console.log("LOGOUT: no session found during logout");
  }

  console.log("LOGOUT: deleting cookies");
  cookieStore.delete(SESSION_COOKIE_NAME);
  // HARDENING: Clear mock cookies to prevent implicit re-auth in development
  cookieStore.delete("evo_mock_role");
  cookieStore.delete("evo_mock_user_email");
  console.log("LOGOUT: cookies deleted, redirecting to /login");

  redirect("/login");
}

/**
 * Logged-in user changes their own password (current password required).
 */
export async function changePasswordAction(
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  try {
    await requireWriteAccess();
  } catch {
    return { error: "You cannot change your password while in support preview mode." };
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return { error: "Authentication required." };
  }

  if (!user.passwordHash) {
    return { error: "Password change is not available for this account." };
  }

  const currentPassword = formData.get("currentPassword") as string | null;
  const newPassword = formData.get("newPassword") as string | null;
  const confirmPassword = formData.get("confirmPassword") as string | null;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "All fields are required." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { error: PASSWORD_MIN_ERROR };
  }

  const currentOk = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!currentOk) {
    return { error: "Current password is incorrect." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return { success: true };
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

import { hashToken } from "@/lib/crypto";

/**
 * Claim an owner account using an invite token.
 */
export async function claimOwnerAccountAction(formData: FormData) {
  const token = formData.get("token") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;

  if (!token || !firstName || !lastName || !password) {
    return { error: "Required fields are missing." };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: PASSWORD_MIN_ERROR };
  }

  const tokenHash = hashToken(token);

  const result = await db.$transaction(async (tx) => {
    // 1. Find and validate invite
    const invite = await tx.ownerInvite.findUnique({
      where: { tokenHash, status: "PENDING" }
    });

    if (!invite) {
      throw new Error("Invalid or already used invite token.");
    }

    if (invite.expiresAt < new Date()) {
      throw new Error("Invite token has expired.");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // 2. Create the OWNER user
    const user = await tx.user.create({
      data: {
        firstName,
        lastName,
        email: invite.email,
        phone,
        passwordHash,
        role: Role.OWNER,
        organizationId: invite.organizationId,
        isStub: false,
      },
    });

    // 3. Mark invite as accepted
    await tx.ownerInvite.update({
      where: { id: invite.id },
      data: { 
        status: "ACCEPTED",
        acceptedAt: new Date()
      }
    });

    return user;
  }).catch((err) => {
    return { error: err.message || "Failed to claim account." };
  });

  if ("error" in result) {
    return result;
  }

  const user = result;
  await setSessionCookie(user);

  await logAuditEvent({
    eventType: "auth.register_owner",
    actorId: user.id,
    actorRole: user.role,
    entityType: "User",
    entityId: user.id,
    organizationId: user.organizationId!,
    metadata: {
      email: user.email,
    },
  });

  redirect("/admin");
}
