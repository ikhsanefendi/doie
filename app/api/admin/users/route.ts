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
          amountBalance: users.amountBalance,
          pendingAmountBalance: users.pendingAmountBalance,
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
            amountBalance: users.amountBalance,
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
    console.log("Raw users from DB:", allUsers.length);
    const usersWithAvailable = allUsers.map((u: any) => {
      // Ensure user object is not null/undefined
      if (!u) {
        console.log("Found null user entry");
        return null;
      }
      
      console.log("Processing user:", u.id, u.email);
      return {
        ...u,
        availableAmountBalance:
          (u.amountBalance || 0) - (u.pendingAmountBalance || 0),
      };
    }).filter(Boolean); // Remove null entries

    console.log("Final users count:", usersWithAvailable.length);

    return NextResponse.json({ users: usersWithAvailable }, { status: 200 });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
