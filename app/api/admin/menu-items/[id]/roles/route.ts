import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { roleMenuItems, settings } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { eq } from "drizzle-orm";

// PUT replace roles for a menu item
export async function PUT(request: NextRequest, context: { params: any }) {
  try {
    // unwrap params safely (Next may provide a Promise)
    const params = await context.params;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // determine required permission from settings (fallback to manage_roles)
    let requiredPermission = "manage_roles";
    try {
      const permRow = await db
        .select()
        .from(settings)
        .where(eq(settings.key, "menu_item_roles_permission"))
        .limit(1);
      if (permRow && permRow.length > 0 && permRow[0].value) {
        requiredPermission = String(permRow[0].value);
      }
    } catch (err: any) {
      if (err?.code === "42P01") {
        // settings table doesn't exist yet, ignore and use default
      } else {
        throw err;
      }
    }
    const hasAccess = await hasPermission(user.id, requiredPermission);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Permission denied", requiredPermission },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { roleIds } = body as { roleIds?: string[] };
    if (!Array.isArray(roleIds)) {
      return NextResponse.json(
        { error: "roleIds array required" },
        { status: 400 },
      );
    }

    // determine menu item id (route param preferred, fallback to body.id)
    const menuItemId = params?.id || (body as any).id;
    if (!menuItemId) {
      return NextResponse.json(
        { error: "Missing menu item id" },
        { status: 400 },
      );
    }

    // delete existing links
    await db
      .delete(roleMenuItems)
      .where(eq(roleMenuItems.menuItemId, menuItemId));

    // insert new ones (skip falsy ids)
    for (const rid of roleIds) {
      if (!rid) continue;
      await db.insert(roleMenuItems).values({ roleId: rid, menuItemId });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Update menu item roles error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
