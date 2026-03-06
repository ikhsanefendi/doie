import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { transactions, users } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let amount: number;
    let paymentProofUrl: string | null = null;

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // parse with FormData
      const formData = await request.formData();
      const amt = formData.get("amount");
      amount = typeof amt === "string" ? parseInt(amt) : 0;

      const file = formData.get("paymentProof") as File | null;
      if (file && file.size > 0) {
        // save file to public/uploads
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        await fs.promises.mkdir(uploadsDir, { recursive: true });
        const safeName = `${Date.now()}-${file.name}`.replace(/\s+/g, "-");
        const filePath = path.join(uploadsDir, safeName);
        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.promises.writeFile(filePath, buffer);
        paymentProofUrl = `/uploads/${safeName}`;
      }
    } else {
      const json = await request.json();
      amount = json.amount;
      paymentProofUrl = json.paymentProofUrl || null;
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Get user's current balance
    const userBalance = await db
      .select({ voucherBalance: users.voucherBalance })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    const balanceBefore = userBalance[0]?.voucherBalance || 0;

    // Create a pending transaction for voucher purchase
    const transaction = await db
      .insert(transactions)
      .values({
        userId: user.id,
        type: "buy_voucher",
        amount,
        status: "pending",
        description: `Request for ${amount} vouchers`,
        paymentProofUrl,
        balanceBefore,
      })
      .returning();

    // audit entry
    try {
      const { logAudit } = await import("@/lib/audit");
      await logAudit({
        userId: user.id,
        action: "request_voucher",
        entityType: "transaction",
        entityId: transaction[0].id,
        details: { amount, paymentProofUrl },
      });
    } catch (e) {
      console.error("Failed to log voucher request", e);
    }

    return NextResponse.json(
      {
        message: "Voucher request submitted. Admin will approve it soon.",
        transaction: transaction[0],
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Request voucher error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
