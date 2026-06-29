import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getSessionCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get session token and decode for expiration info
    const sessionToken = await getSessionCookie();
    let sessionExpiresAt = undefined;
    let sessionExpiresIn = undefined;
    let isSessionExpired = false;

    if (sessionToken) {
      try {
        const parts = sessionToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          
          if (payload.exp) {
            const expTime = payload.exp * 1000;
            const now = Date.now();
            
            sessionExpiresAt = new Date(expTime).toISOString();
            sessionExpiresIn = Math.floor((expTime - now) / 1000);
            isSessionExpired = expTime < now;
          }
        }
      } catch (error) {
        console.error("Failed to decode session token:", error);
      }
    }

    // compute available balance (permanent minus pending)
    const pending = user.pendingAmountBalance || 0;
    const available = (user.amountBalance || 0) - pending;

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roleId: user.roleId,
          amountBalance: user.amountBalance,
          pendingAmountBalance: pending,
          availableAmountBalance: available,
          isActive: user.isActive,
          sessionExpiresAt,
          sessionExpiresIn,
          isSessionExpired,
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
