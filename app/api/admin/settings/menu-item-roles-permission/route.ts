import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { eq } from "drizzle-orm";

const KEY = "menu_item_roles_permission";

export async function GET() {
  try {
    let row;
    try {
      row = await db
        .select()
        .from(settings)
        .where(eq(settings.key, KEY))
        .limit(1);
    } catch (innerErr: any) {
      if (innerErr?.code === "42P01") {
        // settings table not yet created
        return NextResponse.json(
          { permission: "manage_roles" },
          { status: 200 },
        );
      }
      throw innerErr;
    }
    if (!row || row.length === 0) {
      return NextResponse.json({ permission: "manage_roles" }, { status: 200 });
    }
    return NextResponse.json({ permission: row[0].value }, { status: 200 });
  } catch (err) {
    console.error("Get menu-item-roles permission error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ok = await hasPermission(user.id, "manage_roles");
    if (!ok)
      return NextResponse.json(
        { error: "Permission denied", requiredPermission: "manage_roles" },
        { status: 403 },
      );

    const body = await request.json().catch(() => ({}));
    const { permission } = body as { permission?: string };
    if (!permission)
      return NextResponse.json(
        { error: "permission required" },
        { status: 400 },
      );

    // Upsert
    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, KEY))
      .limit(1);
    if (existing && existing.length > 0) {
      await db
        .update(settings)
        .set({ value: permission })
        .where(eq(settings.key, KEY));
    } else {
      await db.insert(settings).values({ key: KEY, value: permission });
    }

    return NextResponse.json({ success: true, permission }, { status: 200 });
  } catch (err) {
    console.error("Set menu-item-roles permission error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
