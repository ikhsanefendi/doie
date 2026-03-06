import { db } from "./db";
import { auditLogs, settings } from "./schema";
import { eq, sql } from "drizzle-orm";

export interface AuditLogEntry {
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: any;
}

/**
 * Write a new audit log entry. Automatically runs cleanup based on
 * `audit_retention_days` setting so the table doesn't grow indefinitely.
 */
export async function logAudit(entry: AuditLogEntry) {
  try {
    await db.insert(auditLogs).values({
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      details: entry.details ? JSON.parse(JSON.stringify(entry.details)) : null,
    });
  } catch (err) {
    // Logging failure should not break the caller
    console.error("Failed to write audit log", err);
  }

  // perform retention shrink in background (don't await)
  cleanupOldLogs().catch((e) => {
    console.error("Failed to cleanup audit logs", e);
  });
}

/**
 * Remove records older than the configured retention window.
 * The setting is stored in `settings` table under key `audit_retention_days`.
 * If the value is missing or not a positive integer, no deletion occurs.
 */
export async function cleanupOldLogs() {
  try {
    const row = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, "audit_retention_days"))
      .limit(1);

    const days = row.length && row[0].value ? parseInt(row[0].value, 10) : 0;
    if (isNaN(days) || days <= 0) {
      return;
    }

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    await db.delete(auditLogs).where(sql`${auditLogs.createdAt} < ${cutoff}`);
  } catch (err: any) {
    // ignore missing table
    if (err?.code === "42P01") {
      return;
    }
    console.error("Error cleaning up audit log entries", err);
  }
}
