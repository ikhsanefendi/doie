import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, users, vouchers } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/permissions";
import { eq, desc } from "drizzle-orm";

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

    // Try to get transactions with user balance info
    let txns;
    try {
      // build base query
      let baseQuery = db
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
          currentBalance: users.amountBalance,
          currentPending: users.pendingAmountBalance,
        })
        .from(transactions)
        .leftJoin(users, eq(transactions.userId, users.id));

      let finalQuery;
      if (isSuperAdminUser) {
        // superadmin: can see all transactions, optionally filter by userId
        if (userIdParam) {
          finalQuery = baseQuery.where(eq(transactions.userId, userIdParam));
        } else {
          finalQuery = baseQuery;
        }
      } else {
        // regular user: restrict to own transactions only
        finalQuery = baseQuery.where(eq(transactions.userId, user.id));
      }

      txns = await finalQuery.orderBy(desc(transactions.createdAt));
    } catch (dbError: any) {
      // If balance columns don't exist, fallback to basic query
      console.log('Balance columns not found, using fallback query:', dbError.message);
      
      let baseQuery = db
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
        })
        .from(transactions);

      let finalQuery;
      if (isSuperAdminUser) {
        if (userIdParam) {
          finalQuery = baseQuery.where(eq(transactions.userId, userIdParam));
        } else {
          finalQuery = baseQuery;
        }
      } else {
        finalQuery = baseQuery.where(eq(transactions.userId, user.id));
      }

      txns = await finalQuery.orderBy(desc(transactions.createdAt));
    }

    // Add null checks and format transactions
    const formattedTxns = txns.map((tx: any) => ({
      ...tx,
      currentBalance: tx.currentBalance || 0,
      currentPending: tx.currentPending || 0,
    }));

    return NextResponse.json({ transactions: formattedTxns }, { status: 200 });
  } catch (error) {
    console.error("Get transactions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
