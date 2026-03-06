"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function AuditSettingsPage() {
  const [days, setDays] = useState("30");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings/audit-retention")
      .then((res) => res.json())
      .then((data) => {
        if (data.days) setDays(data.days);
      })
      .catch((err) => console.error("Failed to load audit retention", err));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/audit-retention", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      if (res.ok) {
        toast.success("Retention updated");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save");
      }
    } catch (e) {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Audit Settings</h1>
      <Card className="p-6 w-full max-w-md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">
              Audit log retention (days)
            </label>
            <Input
              type="number"
              min="0"
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Logs older than this value will be purged automatically.
            </p>
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
