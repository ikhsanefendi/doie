import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, users, vouchers } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/permissions";
import { eq } from "drizzle-orm";

// GET all transactions
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdminUser = await isSuperAdmin(user.id);

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");

    // build base query
    let query = db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        type: transactions.type,
        amount: transactions.amount,
        status: transactions.status,
        description: transactions.description,
        paymentProofUrl: transactions.paymentProofUrl,
        balanceBefore: transactions.balanceBefore,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
        currentBalance: users.voucherBalance,
        currentPending: users.pendingVoucherBalance,
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id));

    if (isSuperAdminUser) {
      // superadmin: can see all transactions, optionally filter by userId
      if (userIdParam) {
        query = query.where(eq(transactions.userId, userIdParam));
      }
    } else {
      // regular user: restrict to own transactions only
      query = query.where(eq(transactions.userId, user.id));
    }

    const txns = await query.orderBy(transactions.createdAt);

    return NextResponse.json({ transactions: txns }, { status: 200 });
  } catch (error) {
    console.error("Get transactions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
