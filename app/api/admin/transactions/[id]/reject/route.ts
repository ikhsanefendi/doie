import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, users } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { eq, sql } from "drizzle-orm";

// POST reject transaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await request.json().catch(() => ({}));
    const txId = id || body.id;
    console.log("Reject endpoint called, id=", id, "body.id=", body.id);
    if (!txId) {
      return NextResponse.json(
        { error: "Missing transaction id" },
        { status: 400 },
      );
    }
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get transaction first to check if user can reject it
    const txn = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, txId))
      .limit(1);

    console.log("reject lookup returned", txn);

    if (txn.length === 0) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    if (txn[0].status !== "pending") {
      return NextResponse.json(
        { error: "Transaction already processed" },
        { status: 400 },
      );
    }

    const transaction = txn[0];

    // Permission check:
    // 1. User can reject their own subscribe_app transactions
    // 2. Otherwise, user must have manage_transactions permission
    const isOwnSubscription =
      user.id === transaction.userId && transaction.type === "subscribe_app";
    const hasAdminAccess = await hasPermission(user.id, "manage_transactions");

    if (!isOwnSubscription && !hasAdminAccess) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Update transaction status
    await db
      .update(transactions)
      .set({
        status: "rejected",
        approvedBy: user.id,
        approvedAt: new Date(), // record when it was rejected for audit
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, txId));

    // If this is a subscribe_app transaction, restore the pending voucher balance
    if (transaction.type === "subscribe_app") {
      try {
        await db
          .update(users)
          .set({
            pendingVoucherBalance: sql`${users.pendingVoucherBalance} - ${transaction.amount}`,
          })
          .where(eq(users.id, transaction.userId));
      } catch (err: any) {
        // If column doesn't exist, it's fine - subscription didn't have pending
        if (err?.code !== "42703") {
          throw err;
        }
      }
    }

    // Log audit for transaction rejection
    try {
      const { logAudit } = await import("@/lib/audit");
      await logAudit({
        userId: user.id,
        action: "reject_transaction",
        entityType: "transaction",
        entityId: txId,
        details: {
          transaction,
          reason: "Transaction rejected by admin",
        },
      });
    } catch (e) {
      console.error("Failed to write audit for transaction rejection", e);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Reject transaction error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
