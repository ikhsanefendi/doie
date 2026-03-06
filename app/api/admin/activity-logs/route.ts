import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/permissions";
import { eq, desc, and, gte } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only superadmin can view activity logs
    const isAdmin = await isSuperAdmin(currentUser.id);
    if (!isAdmin) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const action = searchParams.get("action");
    const days = parseInt(searchParams.get("days") || "7", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    // Build query
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);

    let conditions = [
      gte(auditLogs.createdAt, pastDate),
      eq(auditLogs.entityType, "user_activity"),
    ];

    if (userId) {
      conditions.push(eq(auditLogs.userId, userId));
    }

    if (action) {
      conditions.push(eq(auditLogs.action, action));
    }

    const logs = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        action: auditLogs.action,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    // Get unique users for filter dropdown
    const uniqueUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(
        and(
          gte(auditLogs.createdAt, pastDate),
          eq(auditLogs.entityType, "user_activity"),
        ),
      );

    // Get unique actions for filter dropdown
    const uniqueActionResults = await db
      .select({ action: auditLogs.action })
      .from(auditLogs)
      .where(
        and(
          gte(auditLogs.createdAt, pastDate),
          eq(auditLogs.entityType, "user_activity"),
        ),
      );

    // Remove duplicates client-side
    const uniqueUsersFiltered = Array.from(
      new Map(uniqueUsers.map((u) => [u.id, u])).values(),
    );
    const uniqueActions = Array.from(
      new Set(uniqueActionResults.map((a: any) => a.action)),
    );

    return NextResponse.json(
      {
        logs: logs.map((log) => ({
          ...log,
          details: log.details ? JSON.parse(JSON.stringify(log.details)) : null,
        })),
        filters: {
          users: uniqueUsersFiltered,
          actions: uniqueActions,
        },
        pagination: {
          total: logs.length,
          limit,
          days,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get activity logs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
