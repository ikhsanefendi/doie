import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  transactions,
  users,
  vouchers,
  applications,
  subscriptions,
} from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { requireCSRF } from "@/lib/api-csrf";
import { eq, sql } from "drizzle-orm";

// POST approve transaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Get authenticated user
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  console.log("Approve transaction request for ID:", id);
  
  try {
    const body = await request.json().catch(() => ({}));
    const txId = id || body.id;
    console.log("Transaction ID to approve:", txId);
    
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

    // Get transaction first to check if user can approve it
    const txn = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, txId))
      .limit(1);

    console.log("approve lookup returned", txn);

    if (txn.length === 0) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    const transaction = txn[0];

    // Permission check:
    // 1. Auto-approve all subscribe_app transactions (no admin approval needed)
    // 2. Otherwise, user must have manage_transactions permission
    const isOwnSubscription =
      user.id === transaction.userId && transaction.type === "subscribe_app";
    const hasAdminAccess = await hasPermission(user.id, "manage_transactions");

    // Auto-approve subscribe_app transactions
    if (isOwnSubscription) {
      console.log("Auto-approving subscription transaction");
      console.log("Transaction details:", {
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        userId: transaction.userId
      });
      // Skip permission check and proceed directly to approval
    } else if (!hasAdminAccess) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    if (transaction.status !== "pending") {
      return NextResponse.json(
        { error: "Transaction already processed" },
        { status: 400 },
      );
    }

    // determine which user should be updated - prefer transaction.userId but allow payload override
    const targetUserId = transaction.userId || (body as any).userId;
    if (!targetUserId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ensure the user exists
    const userLookup = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);
    if (!userLookup || userLookup.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // record balances before change for audit
    let userBefore: any[];
    try {
      userBefore = await db
        .select({
          amountBalance: users.amountBalance,
          pendingAmountBalance: users.pendingAmountBalance,
        })
        .from(users)
        .where(eq(users.id, targetUserId))
        .limit(1);
    } catch (err: any) {
      if (err?.code === "42703") {
        // column nonexistent
        userBefore = await db
          .select({
            amountBalance: users.amountBalance,
          })
          .from(users)
          .where(eq(users.id, targetUserId))
          .limit(1);
        userBefore[0] = { ...userBefore[0], pendingAmountBalance: 0 };
      } else {
        throw err;
      }
    }

    // Update transaction status
    await db
      .update(transactions)
      .set({
        status: "approved",
        approvedBy: user.id,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, txId));

    // process transaction types
    if (transaction.type === "buy_voucher") {
      await db
        .update(users)
        .set({
          amountBalance: sql`${users.amountBalance} + ${transaction.amount}`,
        })
        .where(eq(users.id, targetUserId));

      // Create voucher record
      await db.insert(vouchers).values({
        userId: targetUserId,
        amount: transaction.amount,
        transactionId: transaction.id,
        isUsed: false,
      });
    } else if (transaction.type === "subscribe_app") {
      // description contains JSON with applicationId
      let applicationId: string | null = null;
      try {
        const desc = JSON.parse(transaction.description || "{}");
        applicationId = desc.applicationId;
      } catch {}
      if (applicationId) {
        // deduct permanent balance and clear pending
        try {
          await db
            .update(users)
            .set({
              amountBalance: sql`${users.amountBalance} - ${transaction.amount}`,
              pendingAmountBalance: sql`${users.pendingAmountBalance} - ${transaction.amount}`,
            })
            .where(eq(users.id, targetUserId));
        } catch (err: any) {
          if (err?.code === "42703") {
            // column missing, add it and retry
            await db.execute(
              sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_amount_balance INT DEFAULT 0`,
            );
            await db
              .update(users)
              .set({
                amountBalance: sql`${users.amountBalance} - ${transaction.amount}`,
                pendingAmountBalance: sql`${transaction.amount * -1}`,
              })
              .where(eq(users.id, targetUserId));
          } else {
            throw err;
          }
        }

        // create subscription record
        const startDate = new Date();
        const endDate = new Date();
        // find application for days
        const apps = await db
          .select()
          .from(applications)
          .where(eq(applications.id, applicationId))
          .limit(1);
        if (apps.length > 0) {
          endDate.setDate(endDate.getDate() + apps[0].subscriptionDays);
          await db.insert(subscriptions).values({
            userId: targetUserId,
            applicationId,
            startDate,
            endDate,
            isActive: true,
          });
        }
      }
    }

    // log audit for transaction approval and balance mutation
    try {
      let afterUser: any[];
      try {
        afterUser = await db
          .select({
            amountBalance: users.amountBalance,
            pendingAmountBalance: users.pendingAmountBalance,
          })
          .from(users)
          .where(eq(users.id, targetUserId))
          .limit(1);
      } catch (err: any) {
        if (err?.code === "42703") {
          afterUser = await db
            .select({
              amountBalance: users.amountBalance,
            })
            .from(users)
            .where(eq(users.id, targetUserId))
            .limit(1);
          afterUser[0] = { ...afterUser[0], pendingAmountBalance: 0 };
        } else {
          throw err;
        }
      }
      const { logAudit } = await import("@/lib/audit");
      await logAudit({
        userId: user.id,
        action: "approve_transaction",
        entityType: "transaction",
        entityId: txId,
        details: {
          transaction,
          userBefore: userBefore[0] || null,
          userAfter: afterUser[0] || null,
        },
      });
    } catch (e) {
      console.error("Failed to write audit for transaction approval", e);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Approve transaction error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
