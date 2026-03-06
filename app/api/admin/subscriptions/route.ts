import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions, users, applications, transactions } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = request.nextUrl.searchParams.get("userId");

    // allow a user to fetch their own subscriptions without admin permissions
    const isSelfRequest = !!userId && userId === user.id;

    if (!isSelfRequest) {
      // only users with transaction management rights may view all
      const hasAccess = await hasPermission(user.id, "manage_transactions");
      if (!hasAccess) {
        return NextResponse.json(
          { error: "Permission denied" },
          { status: 403 },
        );
      }
    }

    let rows;
    if (userId) {
      // Get approved subscriptions for specific user
      const approvedSubs = await db
        .select({
          id: subscriptions.id,
          userId: subscriptions.userId,
          applicationId: subscriptions.applicationId,
          applicationName: applications.name,
          applicationPrice: applications.price,
          applicationUrl: applications.url,
          startDate: subscriptions.startDate,
          endDate: subscriptions.endDate,
          isActive: subscriptions.isActive,
          createdAt: subscriptions.createdAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(subscriptions)
        .leftJoin(users, eq(subscriptions.userId, users.id))
        .leftJoin(
          applications,
          eq(subscriptions.applicationId, applications.id),
        )
        .where(eq(subscriptions.userId, userId));

      // Get pending subscriptions for specific user
      const pendingSubsRaw = await db
        .select({
          id: transactions.id,
          userId: transactions.userId,
          createdAt: transactions.createdAt,
          userName: users.name,
          userEmail: users.email,
          description: transactions.description,
        })
        .from(transactions)
        .leftJoin(users, eq(transactions.userId, users.id))
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.type, "subscribe_app"),
            eq(transactions.status, "pending"),
          ),
        );

      const pendingSubs = pendingSubsRaw.map((s: any) => ({
        ...s,
        applicationId: null,
        applicationName: null,
        applicationPrice: null,
        applicationUrl: null,
        startDate: null,
        endDate: null,
        isActive: false,
      }));

      rows = [
        ...approvedSubs.map((s: any) => ({
          ...s,
          transactionStatus: "approved" as const,
        })),
        ...pendingSubs.map((s: any) => ({
          ...s,
          transactionStatus: "pending" as const,
        })),
      ];
    } else {
      // Get all approved subscriptions
      const approvedSubs = await db
        .select({
          id: subscriptions.id,
          userId: subscriptions.userId,
          applicationId: subscriptions.applicationId,
          applicationName: applications.name,
          applicationPrice: applications.price,
          subscriptionDays: applications.subscriptionDays,
          applicationUrl: applications.url,
          startDate: subscriptions.startDate,
          endDate: subscriptions.endDate,
          isActive: subscriptions.isActive,
          createdAt: subscriptions.createdAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(subscriptions)
        .leftJoin(users, eq(subscriptions.userId, users.id))
        .leftJoin(
          applications,
          eq(subscriptions.applicationId, applications.id),
        )
        .orderBy(subscriptions.createdAt);

      // Get all pending subscriptions
      const pendingSubsRaw = await db
        .select({
          id: transactions.id,
          userId: transactions.userId,
          createdAt: transactions.createdAt,
          userName: users.name,
          userEmail: users.email,
          description: transactions.description,
        })
        .from(transactions)
        .leftJoin(users, eq(transactions.userId, users.id))
        .where(
          and(
            eq(transactions.type, "subscribe_app"),
            eq(transactions.status, "pending"),
          ),
        );

      const pendingSubs = pendingSubsRaw.map((s: any) => ({
        ...s,
        applicationId: null,
        applicationName: null,
        applicationPrice: null,
        applicationUrl: null,
        startDate: null,
        endDate: null,
        isActive: false,
      }));

      rows = [
        ...approvedSubs.map((s: any) => ({
          ...s,
          transactionStatus: "approved" as const,
        })),
        ...pendingSubs.map((s: any) => ({
          ...s,
          transactionStatus: "pending" as const,
        })),
      ];
    }

    // compute actual duration in days based on stored start/end
    const computeDays = (r: any) => {
      if (r.transactionStatus === "pending") {
        // For pending, try to parse from description
        try {
          if (r.description) {
            const details = JSON.parse(r.description);
            return {
              ...r,
              subscriptionDays: details.subscriptionDays || "-",
              applicationPrice: details.price || "-",
            };
          }
        } catch {}
        return { ...r, subscriptionDays: "-" };
      } else {
        // For approved, calculate from dates
        const diff =
          new Date(r.endDate).getTime() - new Date(r.startDate).getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return { ...r, subscriptionDays: days };
      }
    };

    rows = rows.map(computeDays);

    return NextResponse.json({ subscriptions: rows }, { status: 200 });
  } catch (error) {
    console.error("Admin get subscriptions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
