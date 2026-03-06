import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, roles } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { eq } from "drizzle-orm";

// GET all users
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await hasPermission(user.id, "manage_users");
    if (!hasAccess) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    let allUsers: any[] = [];
    try {
      allUsers = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          roleId: users.roleId,
          roleName: roles.name,
          voucherBalance: users.voucherBalance,
          pendingVoucherBalance: users.pendingVoucherBalance,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })
        .from(users)
        .leftJoin(roles, eq(users.roleId, roles.id))
        .orderBy(users.createdAt);
    } catch (err: any) {
      if (err?.code === "42703") {
        // pending column missing, fall back to simpler select
        allUsers = await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            roleId: users.roleId,
            roleName: roles.name,
            voucherBalance: users.voucherBalance,
            isActive: users.isActive,
            createdAt: users.createdAt,
          })
          .from(users)
          .leftJoin(roles, eq(users.roleId, roles.id))
          .orderBy(users.createdAt);
      } else {
        throw err;
      }
    }

    // compute available balances in JS layer since drizzle lacks expression
    const usersWithAvailable = allUsers.map((u: any) => ({
      ...u,
      availableVoucherBalance:
        (u.voucherBalance || 0) - (u.pendingVoucherBalance || 0),
    }));

    return NextResponse.json({ users: usersWithAvailable }, { status: 200 });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
