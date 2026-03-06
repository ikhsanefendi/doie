import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { permissions, roles, rolePermissions } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { eq } from "drizzle-orm";

// GET all permissions or permissions for a specific role
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // require manage_roles permission
    const hasAccess = await hasPermission(user.id, "manage_roles");
    if (!hasAccess) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get("roleId");

    // If roleId is provided, get permissions for that role
    if (roleId) {
      const rolePerms = await db
        .select({ permissionId: rolePermissions.permissionId })
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId));

      return NextResponse.json(
        { permissionIds: rolePerms.map((rp) => rp.permissionId) },
        { status: 200 },
      );
    }

    // Otherwise, return all permissions with current user role info
    const allPermissions = await db.select().from(permissions);

    // Get the user's role name
    let userRole = "User";
    if (user.roleId) {
      const userRoleInfo = await db
        .select({ name: roles.name })
        .from(roles)
        .where(eq(roles.id, user.roleId))
        .limit(1);
      if (userRoleInfo.length > 0) {
        userRole = userRoleInfo[0].name;
      }
    }

    return NextResponse.json(
      { permissions: allPermissions, userRole },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get permissions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT update role permissions
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // require manage_roles permission
    const hasAccess = await hasPermission(user.id, "manage_roles");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Permission denied", requiredPermission: "manage_roles" },
        { status: 403 },
      );
    }

    const { roleId, permissionIds } = await request.json();

    if (!roleId) {
      return NextResponse.json(
        { error: "Role ID is required" },
        { status: 400 },
      );
    }

    // Check if role exists
    const roleExists = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (roleExists.length === 0) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Get the current user's role name
    let isUserSuperAdmin = false;
    if (user.roleId) {
      const userRoleInfo = await db
        .select({ name: roles.name })
        .from(roles)
        .where(eq(roles.id, user.roleId))
        .limit(1);
      if (userRoleInfo.length > 0) {
        isUserSuperAdmin = userRoleInfo[0].name === "SuperAdmin";
      }
    }

    // Prevent non-superadmin from modifying system roles
    // SuperAdmin can edit any role
    if (roleExists[0].isSystem && !isUserSuperAdmin) {
      return NextResponse.json(
        { error: "Cannot modify system roles" },
        { status: 400 },
      );
    }

    // Delete existing permissions for this role
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

    // Add new permissions
    if (permissionIds && permissionIds.length > 0) {
      for (const permId of permissionIds) {
        await db.insert(rolePermissions).values({
          roleId,
          permissionId: permId,
        });
      }
    }

    return NextResponse.json(
      { success: true, message: "Permissions updated" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update role permissions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
