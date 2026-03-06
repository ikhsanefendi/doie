import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // compute available balance (permanent minus pending)
    const pending = user.pendingVoucherBalance || 0;
    const available = user.voucherBalance - pending;

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roleId: user.roleId,
          voucherBalance: user.voucherBalance,
          pendingVoucherBalance: pending,
          availableVoucherBalance: available,
          isActive: user.isActive,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
