"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { GetNetworkJSON } from "@/lib/network";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  createdAt: string;
}

interface Permission {
  id: string;
  name: string;
  description?: string;
}

interface RolePermissionData {
  roleId: string;
  permissions: string[];
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissionData[]>(
    [],
  );
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [menuItems, setMenuItems] = useState<
    Array<{ id: string; label: string; href: string; roles: string[] }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
    fetchMenuItems();

    // load role permissions for each role after fetching roles
    const loadAllRolePermissions = async () => {
      const fetch_response = await GetNetworkJSON("/api/admin/roles");
      if (fetch_response) {
        const allRoles = fetch_response.roles;
        setRoles(allRoles);
        const rps = await Promise.all(
          allRoles.map(async (r: Role) => ({
            roleId: r.id,
            permissions: await loadRolePermissions(r.id),
          })),
        );
        setRolePermissions(rps);
      }
    };
    loadAllRolePermissions();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await GetNetworkJSON("/api/admin/roles");
      if (response) {
        setRoles(response.roles);
      } else {
        toast.error("Failed to load roles");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const response = await GetNetworkJSON("/api/admin/roles/permissions");
      if (response) {
        setPermissions(response.permissions);
        setCurrentUserRole(response.userRole || "");
      } else {
        toast.error("Failed to load permissions");
      }
    } catch (error) {
      console.error("Failed to fetch permissions:", error);
      toast.error("Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  const loadRolePermissions = async (roleId: string) => {
    try {
      const response = await GetNetworkJSON(
        `/api/admin/roles/permissions?roleId=${roleId}`,
      );
      if (response) {
        return response.permissionIds || [];
        return data.permissionIds || [];
      }
    } catch (error) {
      console.error("Failed to load role permissions:", error);
    }
    return [];
  };

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await GetNetworkJSON("/api/admin/menu-items");
      if (response) {
        setMenuItems(response.menuItems);
      } else {
        toast.error("Failed to load menu items");
      }
    } catch (error) {
      console.error("Failed to fetch menu items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await GetNetworkJSON("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          permissionIds: [], // In production, allow selecting permissions
        }),
      });

      if (response.ok) {
        toast.success("Role created successfully");
        setFormData({ name: "", description: "" });
        setShowForm(false);
        fetchRoles();
      } else {
        toast.error("Failed to create role");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Roles & Permissions
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage roles and user permissions
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus size={18} />
          Create Role
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Role Name</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                placeholder="e.g., Content Manager"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Role description"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit">Create Role</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading roles...</p>
        </div>
      ) : roles.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No roles found</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {roles.map((role) => (
              <Card key={role.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {role.name}
                      </h3>
                      {role.isSystem && (
                        <Badge className="bg-blue-100 text-blue-800">
                          System
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {role.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Created: {new Date(role.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {!role.isSystem && (
                    <Button variant="destructive" disabled>
                      Delete
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* permissions matrix */}
          {permissions.length > 0 && (
            <Card className="p-6 mt-6">
              <h2 className="text-xl font-semibold mb-4">Role Permissions</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left">Permission</th>
                      {roles.map((r) => (
                        <th key={r.id} className="px-4 py-2 text-center">
                          {r.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map((perm) => (
                      <tr key={perm.id} className="border-t">
                        <td className="px-4 py-2">
                          <div>
                            <p className="font-medium text-foreground">
                              {perm.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {perm.description}
                            </p>
                          </div>
                        </td>
                        {roles.map((role) => {
                          const rolePerms = rolePermissions.find(
                            (rp) => rp.roleId === role.id,
                          );
                          const checked = rolePerms?.permissions.includes(
                            perm.id,
                          );
                          return (
                            <td key={role.id} className="px-4 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={checked || false}
                                disabled={
                                  role.isSystem &&
                                  currentUserRole !== "SuperAdmin"
                                }
                                onChange={async () => {
                                  const newPerms = checked
                                    ? (rolePerms?.permissions || []).filter(
                                        (id) => id !== perm.id,
                                      )
                                    : [
                                        ...(rolePerms?.permissions || []),
                                        perm.id,
                                      ];
                                  try {
                                    const res = await fetch(
                                      `/api/admin/roles/permissions`,
                                      {
                                        method: "PUT",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                          roleId: role.id,
                                          permissionIds: newPerms,
                                        }),
                                      },
                                    );
                                    if (res.ok) {
                                      toast.success("Permission updated");
                                      // update local state
                                      setRolePermissions((prev) => {
                                        const updated = prev.filter(
                                          (rp) => rp.roleId !== role.id,
                                        );
                                        updated.push({
                                          roleId: role.id,
                                          permissions: newPerms,
                                        });
                                        return updated;
                                      });
                                    } else if (res.status === 403) {
                                      const body = await res
                                        .json()
                                        .catch(() => ({}));
                                      const reqPerm =
                                        body?.requiredPermission ||
                                        "manage_roles";
                                      toast.error(
                                        `Permission denied — requires ${reqPerm}`,
                                      );
                                    } else {
                                      toast.error("Failed to update");
                                    }
                                  } catch (e) {
                                    toast.error("Error updating");
                                  }
                                }}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* menu access matrix */}
          {menuItems.length > 0 && (
            <Card className="p-6 mt-6">
              <h2 className="text-xl font-semibold mb-4">Menu Access</h2>
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <thead>
                    <tr>
                      <th className="px-4 py-2">Menu Item</th>
                      {roles.map((r) => (
                        <th key={r.id} className="px-4 py-2 text-center">
                          {r.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {menuItems.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-4 py-2">{item.label}</td>
                        {roles.map((r) => {
                          const checked = item.roles.includes(r.id);
                          return (
                            <td key={r.id} className="px-4 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={async () => {
                                  const newRoles = checked
                                    ? item.roles.filter((id) => id !== r.id)
                                    : [...item.roles, r.id];
                                  try {
                                    const res = await fetch(
                                      `/api/admin/menu-items/${item.id}/roles`,
                                      {
                                        method: "PUT",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                          roleIds: newRoles,
                                        }),
                                      },
                                    );
                                    if (res.ok) {
                                      toast.success("Updated");
                                      fetchMenuItems();
                                    } else if (res.status === 403) {
                                      const body = await res
                                        .json()
                                        .catch(() => ({}));
                                      const reqPerm =
                                        (body &&
                                          (body.requiredPermission ||
                                            body.requiredpermission ||
                                            body.required_permission)) ||
                                        "manage_roles";
                                      toast.error(
                                        `Permission denied — requires ${reqPerm}`,
                                      );
                                    } else {
                                      toast.error("Failed to update");
                                    }
                                  } catch (e) {
                                    toast.error("Error updating");
                                  }
                                }}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* new menu item form */}
          <Card className="p-6 mt-4">
            <h2 className="text-xl font-semibold mb-4">Create Menu Item</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const label = (
                  form.elements.namedItem("label") as HTMLInputElement
                ).value;
                const href = (
                  form.elements.namedItem("href") as HTMLInputElement
                ).value;
                const icon = (
                  form.elements.namedItem("icon") as HTMLInputElement
                ).value;
                try {
                  const res = await fetch("/api/admin/menu-items", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ label, href, icon }),
                  });
                  if (res.ok) {
                    toast.success("Menu item created");
                    fetchMenuItems();
                  } else {
                    toast.error("Failed to create menu item");
                  }
                } catch (err) {
                  toast.error("Error creating menu item");
                }
                form.reset();
              }}
              className="space-y-4"
            >
              <div>
                <Label>Label</Label>
                <Input name="label" required placeholder="Display name" />
              </div>
              <div>
                <Label>Href</Label>
                <Input name="href" required placeholder="/dashboard/whatever" />
              </div>
              <div>
                <Label>Icon</Label>
                <Input name="icon" placeholder="Lucide icon name" />
              </div>
              <Button type="submit">Create Item</Button>
            </form>
          </Card>
        </>
      )}

      <Card className="p-6 bg-secondary/5">
        <h3 className="font-semibold text-foreground mb-3">System Roles</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            <strong>SuperAdmin:</strong> Full access to all features. Cannot be
            deleted.
          </li>
          <li>
            <strong>Admin:</strong> Can manage applications, users, and
            transactions.
          </li>
          <li>
            <strong>User:</strong> Can browse and subscribe to applications.
          </li>
        </ul>
      </Card>
    </div>
  );
}
