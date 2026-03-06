"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Download, RefreshCw } from "lucide-react";

interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  details: any;
  createdAt: string;
  userName: string;
  userEmail: string;
}

interface FilterOptions {
  users: Array<{ id: string; name: string; email: string }>;
  actions: string[];
}

export default function ActivityLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({
    users: [],
    actions: [],
  });

  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [days, setDays] = useState<string>("7");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check if user is superadmin
  useEffect(() => {
    if (user && user.roleId !== "superadmin") {
      toast.error("You don't have permission to view activity logs");
      window.location.href = "/dashboard";
    }
  }, [user]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("days", days);
      if (selectedUser) params.append("userId", selectedUser);
      if (selectedAction) params.append("action", selectedAction);

      const response = await fetch(
        `/api/admin/activity-logs?${params.toString()}`,
      );

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setFilters(data.filters);
      } else {
        toast.error("Failed to load activity logs");
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
      toast.error("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [days, selectedUser, selectedAction]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLogs();
    setIsRefreshing(false);
    toast.success("Logs refreshed");
  };

  const handleDownloadCSV = () => {
    const csv = [
      ["User", "Email", "Action", "Page", "Target", "Details", "Timestamp"],
      ...logs.map((log) => [
        log.userName || "Unknown",
        log.userEmail || "Unknown",
        log.action,
        log.details?.page || "-",
        log.details?.target || "-",
        JSON.stringify(log.details?.details || ""),
        new Date(log.createdAt).toLocaleString(),
      ]),
    ]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Activity Logs</h1>
        <p className="text-muted-foreground mt-1">
          Track all user activities and interactions
        </p>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium">Days</label>
            <select
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-border rounded bg-background text-foreground"
            >
              <option value="1">Last 1 Day</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">User</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-border rounded bg-background text-foreground"
            >
              <option value="">All Users</option>
              {filters.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Action</label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-border rounded bg-background text-foreground"
            >
              <option value="">All Actions</option>
              {filters.actions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw size={18} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button
              onClick={handleDownloadCSV}
              variant="outline"
              className="gap-2"
            >
              <Download size={18} />
              CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading activity logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No activity logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold">User</th>
                  <th className="text-left py-3 px-4 font-semibold">Action</th>
                  <th className="text-left py-3 px-4 font-semibold">Page</th>
                  <th className="text-left py-3 px-4 font-semibold">Target</th>
                  <th className="text-left py-3 px-4 font-semibold">Details</th>
                  <th className="text-left py-3 px-4 font-semibold">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-border hover:bg-muted/50 transition"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">
                          {log.userName || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {log.userEmail || "Unknown"}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">{log.action}</Badge>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {log.details?.page || "-"}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {log.details?.target || "-"}
                    </td>
                    <td className="py-3 px-4 text-sm max-w-xs truncate">
                      {log.details?.details
                        ? JSON.stringify(log.details.details)
                        : "-"}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 text-sm text-muted-foreground">
          Showing {logs.length} logs from the last {days} day(s)
        </div>
      </Card>
    </div>
  );
}
