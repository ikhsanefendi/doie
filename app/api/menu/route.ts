import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { menuItems, roleMenuItems } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const items = await db
      .select({
        id: menuItems.id,
        label: menuItems.label,
        href: menuItems.href,
        icon: menuItems.icon,
      })
      .from(menuItems)
      .innerJoin(roleMenuItems, eq(menuItems.id, roleMenuItems.menuItemId))
      .where(eq(roleMenuItems.roleId, user.roleId));

    return NextResponse.json({ menuItems: items }, { status: 200 });
  } catch (error) {
    console.error("Get menu for user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
