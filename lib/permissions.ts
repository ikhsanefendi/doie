import { db } from "./db";
import { users, rolePermissions, permissions, roles } from "./schema";
import { eq, and } from "drizzle-orm";

export async function hasPermission(
  userId: string,
  permissionName: string,
): Promise<boolean> {
  try {
    const result = await db
      .select({ id: permissions.id })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(and(eq(users.id, userId), eq(permissions.name, permissionName)))
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error("Permission check error:", error);
    return false;
  }
}

export async function checkPermission(
  userId: string,
  requiredPermission: string,
) {
  const hasAccess = await hasPermission(userId, requiredPermission);
  if (!hasAccess) {
    throw new Error("Access denied");
  }
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    const userPermissions = await db
      .select({ name: permissions.name })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(users.id, userId));

    return userPermissions.map((p) => p.name);
  } catch (error) {
    console.error("Get permissions error:", error);
    return [];
  }
}

export async function isSuperAdmin(userId: string): Promise<boolean> {
  try {
    const result = await db
      .select({ id: roles.id })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(and(eq(users.id, userId), eq(roles.name, "SuperAdmin")))
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error("SuperAdmin check error:", error);
    return false;
  }
}
