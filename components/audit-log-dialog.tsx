"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  details: any;
  createdAt: string;
}

interface AuditLogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entityId: string;
  entityName: string;
}

export function AuditLogDialog({
  isOpen,
  onClose,
  entityId,
  entityName,
}: AuditLogDialogProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/audit-logs?entityType=application&entityId=${entityId}`,
        );
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs);
        }
      } catch (error) {
        console.error("Failed to fetch audit logs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [isOpen, entityId]);

  const getActionColor = (action: string) => {
    switch (action) {
      case "create":
        return "bg-green-100 text-green-800";
      case "update":
        return "bg-blue-100 text-blue-800";
      case "delete":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Audit Log History - {entityName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex justify-center py-8">
            <p className="text-muted-foreground">Tidak ada perubahan</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div
                key={log.id}
                className="border border-border rounded-lg p-4 bg-card"
              >
                <div className="flex items-start gap-3 mb-3">
                  <Badge className={getActionColor(log.action)}>
                    {log.action.toUpperCase()}
                  </Badge>
                  <p className="text-sm font-medium">{log.userName}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.userEmail}
                  </p>
                </div>

                {log.details && (
                  <div className="mt-3 space-y-2 bg-muted/30 p-3 rounded text-sm">
                    {log.details.before && log.details.after ? (
                      <div className="space-y-2">
                        {/* Show field-by-field comparison */}
                        {Object.keys(log.details.after).map((key) => {
                          const before = log.details.before[key];
                          const after = log.details.after[key];
                          if (before === after) return null;
                          return (
                            <div key={key} className="flex items-start gap-2">
                              <span className="font-semibold min-w-32 capitalize">
                                {key}:
                              </span>
                              <div className="flex-1">
                                <p className="line-through text-red-600">
                                  {String(before)}
                                </p>
                                <p className="text-green-600">
                                  {String(after)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : log.details.before ? (
                      <div>
                        <p className="font-semibold mb-2">Dihapus:</p>
                        <pre className="text-xs bg-background p-2 rounded overflow-auto">
                          {JSON.stringify(log.details.before, null, 2)}
                        </pre>
                      </div>
                    ) : log.details.after ? (
                      <div>
                        <p className="font-semibold mb-2">Dibuat:</p>
                        <pre className="text-xs bg-background p-2 rounded overflow-auto">
                          {JSON.stringify(log.details.after, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
