import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { roles, rolePermissions, permissions } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { eq } from "drizzle-orm";

// GET all roles
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // either manage_roles or manage_users can fetch roles
    const hasAccess =
      (await hasPermission(user.id, "manage_roles")) ||
      (await hasPermission(user.id, "manage_users"));
    if (!hasAccess) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const allRoles = await db.select().from(roles);

    return NextResponse.json({ roles: allRoles }, { status: 200 });
  } catch (error) {
    console.error("Get roles error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST create role
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

    const { name, description, permissionIds } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Role name is required" },
        { status: 400 },
      );
    }

    // Create role
    const newRole = await db
      .insert(roles)
      .values({
        name,
        description,
        isSystem: false,
      })
      .returning();

    // Assign permissions if provided
    if (permissionIds && permissionIds.length > 0) {
      for (const permId of permissionIds) {
        await db.insert(rolePermissions).values({
          roleId: newRole[0].id,
          permissionId: permId,
        });
      }
    }

    return NextResponse.json({ role: newRole[0] }, { status: 201 });
  } catch (error) {
    console.error("Create role error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
