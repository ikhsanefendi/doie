"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Subscription {
  id: string;
  userId: string;
  applicationId: string;
  applicationName?: string;
  applicationPrice?: number;
  subscriptionDays?: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  userName?: string;
  userEmail?: string;
  appName?: string;
}

export default function SubscribersAdminPage() {
  const { user } = useAuth();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams(window.location.search);
      let userIdParam = params.get("userId");

      // if no explicit id supplied, default to current user id (ensures regular users only see their own)
      if (!userIdParam && user) {
        userIdParam = user.id;
      }

      const url = userIdParam
        ? `/api/admin/subscriptions?userId=${encodeURIComponent(userIdParam)}`
        : "/api/admin/subscriptions";

      let res = await fetch(url);

      if (res.status === 403 && user) {
        // not allowed to query admin route; fall back to personal endpoint
        res = await fetch("/api/subscriptions");
      }

      if (res.ok) {
        const data = await res.json();
        setSubs(data.subscriptions || []);
      } else if (res.status === 403) {
        toast.error("Permission denied");
      } else {
        toast.error("Failed to load subscribers");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // determine header text
  const params = new URLSearchParams(window.location.search);
  const explicitUserId = params.get("userId");
  const viewingOwn = user && (!explicitUserId || explicitUserId === user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscribers</h1>
        <p className="text-muted-foreground mt-1">
          {viewingOwn ? "Your subscriptions" : "All user subscriptions"}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : subs.length === 0 ? (
        <Card className="p-12 text-center">No subscriptions found</Card>
      ) : (
        <div className="grid gap-4">
          {subs.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold text-lg">
                    {s.appName || s.applicationName}
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    {s.userName && <span>{s.userName}</span>}
                    {s.userEmail && <span>• {s.userEmail}</span>}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    User ID: {s.userId}
                  </div>

                  {s.applicationPrice !== undefined && (
                    <div className="text-xs text-muted-foreground">
                      Price: {s.applicationPrice} vouchers
                    </div>
                  )}
                  {s.subscriptionDays !== undefined && (
                    <div className="text-xs text-muted-foreground">
                      Duration: {s.subscriptionDays} days
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    {new Date(s.startDate).toLocaleString()} —{" "}
                    {new Date(s.endDate).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
