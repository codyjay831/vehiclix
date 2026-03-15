"use server";

// SUPPORT MODE PROTECTION
// All mutations must call requireWriteAccess()
// Do not hardcode actorRole
// Use requireUserWithOrg()

import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { encrypt, decrypt } from "@/lib/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit";
import { getAuthenticatedUser } from "@/lib/auth";

const SESSION_COOKIE_NAME = "evo_session";

/**
 * Starts a support session for a SUPER_ADMIN.
 */
export async function startSupportSession(orgId: string) {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== Role.SUPER_ADMIN) {
    throw new Error("Unauthorized: Super Admin access required");
  }

  // Validate target organization exists
  const organization = await db.organization.findUnique({
    where: { id: orgId },
  });

  if (!organization) {
    throw new Error("Target organization not found");
  }

  // Issue a new session cookie with supportOrgId set
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = await decrypt(token);

  if (!payload) {
    throw new Error("Active session not found");
  }

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Super Admin session length

  const session = await encrypt({
    ...payload,
    supportOrgId: orgId,
    expiresAt,
  });

  cookieStore.set(SESSION_COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  // Log audit event: support.session_started
  await logAuditEvent({
    eventType: "support.session_started",
    actorId: user.id,
    actorRole: user.role,
    entityType: "Organization",
    entityId: orgId,
    organizationId: orgId,
    metadata: {
      targetOrgName: organization.name,
      targetOrgSlug: organization.slug,
    },
  });

  // Redirect to the dealership's admin experience
  redirect("/admin");
}

/**
 * Stops a support session.
 */
export async function stopSupportSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = await decrypt(token);

  if (!payload) {
    redirect("/login");
  }

  const supportOrgId = payload.supportOrgId;

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const session = await encrypt({
    ...payload,
    supportOrgId: null,
    expiresAt,
  });

  cookieStore.set(SESSION_COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  // Log audit event: support.session_ended
  if (supportOrgId) {
    await logAuditEvent({
      eventType: "support.session_ended",
      actorId: payload.userId,
      actorRole: payload.role,
      entityType: "Organization",
      entityId: supportOrgId,
      organizationId: supportOrgId,
    });
  }

  redirect("/super-admin/requests");
}
