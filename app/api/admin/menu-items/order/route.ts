import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { menuItems } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { eq } from "drizzle-orm";

// PUT update menu order
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await hasPermission(user.id, "manage_roles");
    if (!hasAccess) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { menuItems: itemsToUpdate } = await request.json();
    if (!itemsToUpdate || !Array.isArray(itemsToUpdate)) {
      return NextResponse.json(
        { error: "menuItems array is required" },
        { status: 400 },
      );
    }

    // Update each menu item order
    for (const item of itemsToUpdate) {
      if (!item.id || item.order === undefined) {
        return NextResponse.json(
          { error: "Each item must have id and order" },
          { status: 400 },
        );
      }

      await db
        .update(menuItems)
        .set({ order: item.order })
        .where(eq(menuItems.id, item.id));
    }

    return NextResponse.json({ message: "Menu order updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Update menu order error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
