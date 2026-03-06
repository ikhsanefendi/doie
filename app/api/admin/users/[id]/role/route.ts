import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, roles } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { eq } from "drizzle-orm";

// PUT update user role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // require either manage_roles or manage_users
    const hasAccess =
      (await hasPermission(user.id, "manage_roles")) ||
      (await hasPermission(user.id, "manage_users"));
    if (!hasAccess) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // read body and allow id fallback
    const body = await request.json().catch(() => ({}));
    const { roleId, id: bodyId } = body as { roleId?: string; id?: string };

    if (!roleId) {
      return NextResponse.json(
        { error: "roleId is required" },
        { status: 400 },
      );
    }

    const targetId = id || bodyId;
    if (!targetId) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }

    // verify role exists
    const roleLookup = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);
    if (!roleLookup || roleLookup.length === 0) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // update user and report if nothing changed
    const updated = await db
      .update(users)
      .set({ roleId })
      .where(eq(users.id, targetId))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Update user role error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
