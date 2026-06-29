"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { GetNetworkJSON } from "@/lib/network";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

interface MutationLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  details: any;
  createdAt: string;
}

export default function BalanceMutationsPage() {
  const [logs, setLogs] = useState<MutationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterAdmin, setFilterAdmin] = useState<string>("");
  const [filterTarget, setFilterTarget] = useState<string>("");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await GetNetworkJSON(
        "/api/admin/audit-logs?action=approve_transaction,grant_amount,reduce_amount,request_amount&limit=999",
      );
      if (res.ok) {
        const data = await res.json();
        const allLogs = data.logs || [];
        // sort by date ascending so running total is calculated correctly
        allLogs.sort(
          (a: any, b: any) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        setLogs(allLogs);
      } else {
        toast.error("Failed to load mutation logs");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching logs");
    } finally {
      setLoading(false);
    }
  };

  // compute target user info from each log
  const extractTarget = (log: MutationLog) => {
    const tx = log.details?.transaction || {};
    // try transaction.userId first, then any before/after id
    const id = tx.userId || log.details?.after?.id || log.details?.before?.id;
    const name = log.details?.after?.name || log.details?.before?.name;
    const email = log.details?.after?.email || log.details?.before?.email;
    return { id, name, email };
  };

  // filter logs by admin or target user if set
  const filteredLogs = logs.filter((log) => {
    const target = extractTarget(log);
    return (
      (filterAdmin ? log.userId === filterAdmin : true) &&
      (filterTarget ? target.id === filterTarget : true)
    );
  });

  // extract unique admin ids for filter dropdown
  const uniqueAdmins = Array.from(
    new Map(
      logs.map((log) => [
        log.userId,
        { id: log.userId, name: log.userName, email: log.userEmail },
      ]),
    ).values(),
  );

  // extract unique targets for filter dropdown
  const uniqueTargets = Array.from(
    new Map(
      logs.map((log) => {
        const t = extractTarget(log);
        return [t.id, t];
      }),
    ).values(),
  );

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Balance Mutation Report
          </h1>
          <p className="text-muted-foreground mt-1">
            Complete transaction history from account creation
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex flex-col">
            <label className="text-xs text-muted-foreground">Admin</label>
            <select
              value={filterAdmin}
              onChange={(e) => setFilterAdmin(e.target.value)}
              className="px-3 py-1 border rounded bg-background text-foreground"
            >
              <option value="">All Admins</option>
              {uniqueAdmins.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-muted-foreground">Target User</label>
            <select
              value={filterTarget}
              onChange={(e) => setFilterTarget(e.target.value)}
              className="px-3 py-1 border rounded bg-background text-foreground"
            >
              <option value="">All Targets</option>
              {uniqueTargets.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name ? `${user.name} (${user.email})` : user.id}
                </option>
              ))}
            </select>
          </div>
          <button
            className="inline-flex items-center gap-2 px-3 py-1 border rounded"
            onClick={async () => {
              setIsRefreshing(true);
              try {
                await fetchLogs();
                toast.success("Refreshed");
              } finally {
                setIsRefreshing(false);
              }
            }}
          >
            <RefreshCw size={18} /> {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center py-8 text-muted-foreground">Loading...</p>
      ) : filteredLogs.length === 0 ? (
        <Card className="p-8 text-center">No mutations found</Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Admin</th>
                <th className="px-4 py-2 text-left">Target User</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Tx ID</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Before / After</th>
                <th className="px-4 py-2 text-left">Pending Before/After</th>
                <th className="px-4 py-2 text-left">Amount</th>
                <th className="px-4 py-2 text-left">Running Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.map((log, idx) => {
                const before = log.details?.userBefore || {};
                const after = log.details?.userAfter || {};
                const tx = log.details?.transaction || {};
                const target = extractTarget(log);
                const running = filteredLogs
                  .slice(0, idx + 1)
                  .reduce((sum, l) => {
                    const b = l.details?.userBefore || {};
                    const a = l.details?.userAfter || {};
                    return (
                      sum + ((a.voucherBalance ?? 0) - (b.voucherBalance ?? 0))
                    );
                  }, 0);
                return (
                  <tr key={log.id} className="hover:bg-secondary/5">
                    <td className="px-4 py-3">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {log.userName || log.userEmail || log.userId}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {target.name
                        ? `${target.name} (${target.email})`
                        : target.id || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">{tx.type || "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {tx.id || "-"}
                    </td>
                    <td className="px-4 py-3">{tx.status || "-"}</td>
                    <td className="px-4 py-3">
                      {before.voucherBalance ?? "-"} →{" "}
                      {after.voucherBalance ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      {before.pending ?? 0} → {after.pending ?? 0}
                    </td>
                    <td className="px-4 py-3">{tx.amount || "-"}</td>
                    <td className="px-4 py-3 font-semibold">{running}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
