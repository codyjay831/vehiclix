import { db } from "./db";
import { Role } from "@prisma/client";

/**
 * Standardized types of activity events.
 */
export type AuditEventType = 
  | "auth.login"
  | "auth.logout"
  | "auth.register"
  | "auth.register_owner"
  | "auth.2fa_prompted"
  | "auth.2fa_verified"
  | "auth.2fa_failed"
  | "session.resolved"
  | "session.denied"
  | "admin.access"
  | "vehicle.created"
  | "vehicle.updated"
  | "vehicle.status_changed"
  | "vehicle.published"
  | "vehicle.archived"
  | "vehicle.deleted_permanently"
  | "domain.add"
  | "domain.delete"
  | "domain.verify_success"
  | "domain.set_primary"
  | "organization.update_homepage"
  | "organization.create"
  | "organization.update_slug"
  | "organization.update_branding"
  | "organization.suspended"
  | "organization.reactivated"
  | "system.test"
  | "inquiry.submitted"
  | "deal.cancelled"
  | "deal.contracts_sent"
  | "deal.contracts_signed"
  | "deposit.initiated"
  | "deposit.completed"
  | "request.submitted"
  | "lead.notification_sent"
  | "document.uploaded"
  | "document.verified"
  | "document.rejected"
  | "support.session_started"
  | "support.session_ended"
  | "support.action_attempted"
  | "user.deleted_by_admin";

interface AuditLogOptions {
  eventType: AuditEventType;
  actorId?: string;
  actorRole?: Role;
  entityType: string;
  entityId: string;
  metadata?: any;
  organizationId?: string; // Optional for multi-tenant hardening, can be null for system events
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
  organizationId,
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
        organizationId,
      },
    });
  } catch (error) {
    // We don't want audit logging failures to crash the application,
    // but we should log them to stderr in production.
    console.error("Failed to log audit event:", error);
  }
}
