import { getAuthenticatedUser } from "./auth";
import { logAuditEvent } from "./audit";

/**
 * Reusable helper for write protection.
 * Throws an error if the user is in Support Mode (read-only).
 */
export async function requireWriteAccess() {
  const user = await getAuthenticatedUser();

  if (user?.isSupportMode) {
    // Log blocked write attempt
    if (user.supportOrgId) {
      await logAuditEvent({
        eventType: "support.action_attempted",
        actorId: user.id,
        actorRole: user.role,
        entityType: "Action",
        entityId: "blocked_write",
        organizationId: user.supportOrgId,
        metadata: {
          blocked: true,
          reason: "Support Mode is Read-only",
        },
      });
    }

    throw new Error("Read-only in Support Mode");
  }
}
