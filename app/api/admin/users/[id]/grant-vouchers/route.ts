import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { eq } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await hasPermission(user.id, "manage_vouchers");
    if (!hasAccess) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { amount } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Get user
    const targetUser = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (targetUser.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update user voucher balance
    const before = targetUser[0];
    const updated = await db
      .update(users)
      .set({
        voucherBalance: targetUser[0].voucherBalance + amount,
      })
      .where(eq(users.id, id))
      .returning();

    // audit
    try {
      const { logAudit } = await import("@/lib/audit");
      await logAudit({
        userId: user.id,
        action: "grant_vouchers",
        entityType: "user",
        entityId: id,
        details: { before, after: updated[0], amount },
      });
    } catch (e) {
      console.error("Failed to log grant vouchers", e);
    }

    return NextResponse.json(
      {
        message: `Successfully granted ${amount} vouchers to user`,
        user: updated[0],
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Grant vouchers error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
