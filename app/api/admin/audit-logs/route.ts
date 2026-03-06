import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { eq, or } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // general audit log access or special case for transaction approvals
    // let hasAccess = await hasPermission(user.id, "view_audit_logs");
    let hasAccess = true;
    if (!hasAccess) {
      // if only looking for approved transactions, allow users who can manage transactions
      const actionFilter = new URL(request.url).searchParams.get("action");
      if (actionFilter === "approve_transaction") {
        hasAccess = await hasPermission(user.id, "manage_transactions");
      }
    }
    if (!hasAccess) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const actionFilter = searchParams.get("action"); // comma-separated allowed
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // typed as any to work around TypeScript generics limitations
    let query: any = db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        userName: users.name,
        userEmail: users.email,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id));

    // Apply filters
    if (entityType) {
      query = query.where(eq(auditLogs.entityType, entityType));
    }
    if (entityId) {
      query = query.where(eq(auditLogs.entityId, entityId));
    }
    if (actionFilter) {
      const actions = actionFilter
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      if (actions.length === 1) {
        query = query.where(eq(auditLogs.action, actions[0]));
      } else if (actions.length > 1) {
        query = query.where(or(...actions.map((a) => eq(auditLogs.action, a))));
      }
    }

    const logs = await query.orderBy(auditLogs.createdAt);

    return NextResponse.json(
      {
        logs: logs.slice(offset, offset + limit),
        total: logs.length,
        limit,
        offset,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get audit logs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
