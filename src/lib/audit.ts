import { db } from "./db";
import { Role } from "@prisma/client";

/**
 * Standardized types of activity events.
 */
export type AuditEventType = 
  | "auth.login"
  | "auth.logout"
  | "auth.register"
  | "auth.2fa_prompted"
  | "auth.2fa_verified"
  | "auth.2fa_failed"
  | "session.resolved"
  | "session.denied"
  | "admin.access"
  | "vehicle.created"
  | "vehicle.updated"
  | "vehicle.status_changed"
  | "vehicle.published";

interface AuditLogOptions {
  eventType: AuditEventType;
  actorId?: string;
  actorRole?: Role;
  entityType: string;
  entityId: string;
  metadata?: any;
}

/**
 * Persists an activity event to the audit log.
 */
export async function logAuditEvent({
  eventType,
  actorId,
  actorRole,
  entityType,
  entityId,
  metadata,
}: AuditLogOptions) {
  try {
    return await db.activityEvent.create({
      data: {
        eventType,
        actorId,
        actorRole,
        entityType,
        entityId,
        metadata: metadata || {},
      },
    });
  } catch (error) {
    // We don't want audit logging failures to crash the application,
    // but we should log them to stderr in production.
    console.error("Failed to log audit event:", error);
  }
}
