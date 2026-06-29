import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { transactions, users } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    console.log("Voucher request started");
    
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("User authenticated:", user.id, user.email);

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
    console.log("Getting user balance for:", user.id);
    let userBalance: any[];
    try {
      userBalance = await db
        .select({ amountBalance: users.amountBalance })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      console.log("User balance query success:", userBalance.length, "records");
    } catch (err: any) {
      // If amountBalance column doesn't exist, use basic user query
      if (err?.code === "42703") {
        console.log("amountBalance column not found, using basic user query");
        userBalance = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);
      } else {
        console.error("Balance query error:", err);
        throw err;
      }
    }

    console.log("User balance result:", userBalance[0]);
    const balanceBefore = userBalance[0]?.amountBalance || 0;

    // Ensure userBalance[0] exists before proceeding
    if (!userBalance || userBalance.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create a pending transaction for voucher purchase
    const transaction = await db
      .insert(transactions)
      .values({
        userId: user.id,
        type: "buy_amount",
        amount,
        status: "pending",
        description: `Request for ${amount} amount`,
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

    const newTransaction = transaction[0];

    return NextResponse.json(
      {
        success: true,
        message: "Voucher request submitted successfully",
        transaction: newTransaction,
        user: {
          id: user.id,
          email: user.email,
          balance: user.amountBalance,
        },
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
