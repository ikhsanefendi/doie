import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { menuItems, roleMenuItems } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

// GET all menu items with associated role ids
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await hasPermission(user.id, "manage_roles");
    if (!hasAccess) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const items = await db.select().from(menuItems);
    const links = await db.select().from(roleMenuItems);

    const withRoles = items.map((item) => ({
      ...item,
      roles: links.filter((l) => l.menuItemId === item.id).map((l) => l.roleId),
    }));

    return NextResponse.json({ menuItems: withRoles }, { status: 200 });
  } catch (error) {
    console.error("Get menu items error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST create menu item
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await hasPermission(user.id, "manage_roles");
    if (!hasAccess) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { label, href, icon } = await request.json();
    if (!label || !href) {
      return NextResponse.json(
        { error: "label and href are required" },
        { status: 400 },
      );
    }

    const result = await db
      .insert(menuItems)
      .values({ label, href, icon })
      .returning();
    return NextResponse.json({ menuItem: result[0] }, { status: 201 });
  } catch (error) {
    console.error("Create menu item error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
