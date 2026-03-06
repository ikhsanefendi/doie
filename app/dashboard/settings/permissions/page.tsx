"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function PermissionSettingsPage() {
  const [permission, setPermission] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPermission();
  }, []);

  const fetchPermission = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/settings/menu-item-roles-permission");
      if (res.ok) {
        const data = await res.json();
        setPermission(data.permission || "manage_roles");
      } else {
        toast.error("Failed to load setting");
      }
    } catch (err) {
      toast.error("Error fetching setting");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    try {
      const res = await fetch(
        "/api/admin/settings/menu-item-roles-permission",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permission }),
        },
      );
      if (res.ok) {
        toast.success("Saved");
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.error || "Failed to save");
      }
    } catch (err) {
      toast.error("Error saving setting");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Permission Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure required permission for menu role updates
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label>Permission Key</Label>
            <Input
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
              placeholder="manage_roles"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
