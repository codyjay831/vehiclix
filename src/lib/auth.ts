import { cookies } from "next/headers";
import { db } from "./db";
import { encrypt, decrypt } from "./session";
import type { SessionPayload } from "./session";
import { Role, User } from "@prisma/client";

/**
 * Resolves the authenticated user.
 */
export async function getAuthenticatedUser(): Promise<User & { supportOrgId?: string | null, isSupportMode?: boolean } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("evo_session")?.value;
  const payload = await decrypt(token);

  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/329925ab-9b1c-4864-8917-f8b91cf631b6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b6598c'},body:JSON.stringify({sessionId:'b6598c',location:'auth.ts:getAuthenticatedUser',message:'auth lookup',data:{hasToken:!!token,payloadUserId:payload?.userId ?? null,payloadRole:payload?.role ?? null,payloadOrgId:payload?.organizationId ?? null,supportOrgId:payload?.supportOrgId ?? null},timestamp:Date.now(),hypothesisId:'A,C'})}).catch(()=>{});
  // #endregion

  if (payload) {
    const user = await db.user.findUnique({
      where: { id: payload.userId },
    });
    
    if (!user) return null;

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/329925ab-9b1c-4864-8917-f8b91cf631b6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b6598c'},body:JSON.stringify({sessionId:'b6598c',location:'auth.ts:getAuthenticatedUserResolved',message:'user resolved',data:{userId:user.id,role:user.role,organizationId:user.organizationId ?? null},timestamp:Date.now(),hypothesisId:'A,C'})}).catch(()=>{});
    // #endregion

    // Support mode logic
    if (user.role === Role.SUPER_ADMIN && payload.supportOrgId) {
      return {
        ...user,
        supportOrgId: payload.supportOrgId,
        isSupportMode: true,
      };
    }
    
    return user;
  }

  // Fallback to mock auth if enabled
  if (process.env.ALLOW_MOCK_AUTH === "true") {
    const mockRole = cookieStore.get("evo_mock_role")?.value as Role | undefined;
    const mockEmail = cookieStore.get("evo_mock_user_email")?.value;

    if (mockRole && mockEmail) {
      return db.user.findUnique({
        where: { email: mockEmail },
      });
    }
  }

  return null;
}

/**
 * Legacy/Staged compatibility helper.
 * Returns a minimal session object.
 */
export async function getMockSession() {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  return {
    user: {
      id: user.id,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: user.organizationId,
    },
  };
}

/**
 * Check if the current user has a specific role.
 */
export async function hasRole(role: Role) {
  const user = await getAuthenticatedUser();
  return user?.role === role;
}

/**
 * Requires an authenticated user with an associated organization.
 * Throws an error if not authenticated or no organization is present.
 * For Owners/Staff, this is a non-negotiable requirement.
 * Support mode for SUPER_ADMIN is handled here by resolving supportOrgId.
 */
export async function requireUserWithOrg() {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    throw new Error("Authentication required");
  }

  // Support mode resolution for Super Admin
  if (user.role === Role.SUPER_ADMIN && (user.isSupportMode || user.supportOrgId)) {
    const effectiveOrgId = user.supportOrgId || user.organizationId;
    
    if (!effectiveOrgId) {
      throw new Error("Organization context required for support mode");
    }

    return {
      ...user,
      organizationId: effectiveOrgId,
      isSupportMode: true,
    } as User & { organizationId: string; isSupportMode: true };
  }
  
  if (!user.organizationId) {
    // If they are an OWNER, this is a critical configuration error.
    if (user.role === Role.OWNER) {
      throw new Error("Critical: Owner account has no associated organization");
    }
    throw new Error("Organization context required");
  }
  
  return user as User & { organizationId: string; isSupportMode?: boolean };
}

/**
 * Ensures the record with the given ID belongs to the specified organization.
 * This is a critical guard for multi-tenant isolation.
 */
export async function validateRecordOwnership(
  model: any,
  id: string,
  organizationId: string,
  errorMessage = "Resource not found or access denied"
) {
  const record = await model.findUnique({
    where: { id },
    select: { organizationId: true },
  });

  if (!record || record.organizationId !== organizationId) {
    throw new Error(errorMessage);
  }

  return record;
}
