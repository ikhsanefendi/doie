import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions, applications, transactions, users } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get approved subscriptions
    let userSubscriptions = await db
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
      })
      .from(subscriptions)
      .leftJoin(applications, eq(subscriptions.applicationId, applications.id))
      .where(eq(subscriptions.userId, user.id));

    // Get pending subscriptions from transactions
    const pendingTransactions = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        createdAt: transactions.createdAt,
        description: transactions.description,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          eq(transactions.type, "subscribe_app"),
          eq(transactions.status, "pending"),
        ),
      );

    // Enrich pending transactions with app details from description
    const enrichedPending = pendingTransactions.map((tx: any) => {
      let appName = "Unknown App";
      let appPrice = "-";
      let appUrl = "-";
      let subscriptionDays = "-";

      try {
        if (tx.description) {
          const details = JSON.parse(tx.description);
          if (details.price !== undefined) {
            appPrice = details.price;
          }
          if (details.subscriptionDays !== undefined) {
            subscriptionDays = details.subscriptionDays;
          }
        }
      } catch {}

      return {
        id: tx.id,
        userId: tx.userId,
        applicationId: null,
        applicationName: null,
        applicationPrice: null,
        applicationUrl: null,
        startDate: null,
        endDate: null,
        isActive: false,
        createdAt: tx.createdAt,
        description: tx.description,
        subscriptionDays,
      };
    });

    // Combine both lists with proper transactionStatus field
    const allSubscriptions = [
      ...userSubscriptions.map((sub: any) => ({
        ...sub,
        transactionStatus: "approved" as const,
        description: null as any,
        subscriptionDays: (() => {
          if (!sub.startDate || !sub.endDate) return "-";
          const diff =
            new Date(sub.endDate).getTime() - new Date(sub.startDate).getTime();
          return Math.ceil(diff / (1000 * 60 * 60 * 24));
        })(),
      })),
      ...enrichedPending.map((tx: any) => ({
        ...tx,
        transactionStatus: "pending" as const,
      })),
    ];

    console.log("Returning subscriptions:", allSubscriptions);

    return NextResponse.json(
      { subscriptions: allSubscriptions },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get subscriptions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
