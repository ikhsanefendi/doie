import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions, users, applications, transactions } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, sql, and, gt } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { applicationId } = await request.json();

    if (!applicationId) {
      return NextResponse.json(
        { error: "Application ID is required" },
        { status: 400 },
      );
    }

    // Get application details
    const app = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (app.length === 0) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }

    const application = app[0];

    // Check if user already has an ACTIVE and NOT EXPIRED subscription for this app
    const existingSubscription = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, user.id),
          eq(subscriptions.applicationId, applicationId),
          eq(subscriptions.isActive, true),
          gt(subscriptions.endDate, new Date()), // Only block if subscription hasn't expired yet
        ),
      )
      .limit(1);

    if (existingSubscription.length > 0) {
      const expiryDate = existingSubscription[0].endDate;
      return NextResponse.json(
        {
          error: `You already have an active subscription for this application. It expires on ${new Date(expiryDate).toLocaleDateString()}`,
        },
        { status: 400 },
      );
    }

    // Check if user has a pending subscription request for this app
    const pendingTransaction = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          eq(transactions.type, "subscribe_app"),
          eq(transactions.status, "pending"),
        ),
      );

    // Filter transactions to find one for this specific application
    const hasPendingForApp = pendingTransaction.some((tx) => {
      try {
        const details = JSON.parse(tx.description || "{}");
        return details.applicationId === applicationId;
      } catch {
        return false;
      }
    });

    if (hasPendingForApp) {
      return NextResponse.json(
        {
          error:
            "You already have a pending subscription request for this application",
        },
        { status: 400 },
      );
    }

    // compute available balance = permanent - pending
    const available = user.voucherBalance - (user.pendingVoucherBalance || 0);

    // Check against available balance (permanent - pending)
    if (available < application.price) {
      return NextResponse.json(
        { error: "Insufficient vouchers" },
        { status: 400 },
      );
    }

    // create a pending transaction for subscription
    const tx = await db
      .insert(transactions)
      .values({
        userId: user.id,
        type: "subscribe_app",
        amount: application.price,
        status: "pending",
        description: JSON.stringify({
          applicationId,
          price: application.price,
          subscriptionDays: application.subscriptionDays,
        }),
        balanceBefore: user.voucherBalance,
      })
      .returning();

    // increment user's pending voucher balance (temporary deduction for display)
    try {
      await db
        .update(users)
        .set({
          pendingVoucherBalance: sql`${users.pendingVoucherBalance} + ${application.price}`,
        })
        .where(eq(users.id, user.id));
    } catch (err: any) {
      if (err?.code === "42703") {
        // column missing - add it and retry
        await db.execute(
          sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_voucher_balance INT DEFAULT 0`,
        );
        await db
          .update(users)
          .set({
            pendingVoucherBalance: sql`${application.price}`,
          })
          .where(eq(users.id, user.id));
      } else {
        throw err;
      }
    }

    // log audit
    try {
      const { logAudit } = await import("@/lib/audit");
      await logAudit({
        userId: user.id,
        action: "create_subscription_request",
        entityType: "subscription_transaction",
        entityId: tx[0].id,
        details: {
          applicationId,
          price: application.price,
          subscriptionDays: application.subscriptionDays,
        },
      });
    } catch (e) {
      console.error("Failed to write audit for subscription request", e);
    }

    return NextResponse.json(
      {
        transaction: tx[0],
        message: "Subscription request submitted and pending approval.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create subscription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
