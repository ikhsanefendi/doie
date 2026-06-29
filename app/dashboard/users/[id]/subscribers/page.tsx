"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw } from "lucide-react";

interface Subscription {
  id: string;
  userId: string;
  applicationId: string;
  applicationName: string;
  applicationPrice: number;
  subscriptionDays: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  userName?: string;
}

export default function UserSubscribersPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchForUser();
  }, [userId]);

  const fetchForUser = async () => {
    try {
      setLoading(true);
      // try admin endpoint first (for admins viewing others), fallback to /api/subscriptions
      let res = await fetch(`/api/admin/subscriptions?userId=${userId}`);
      if (res.status === 403) {
        res = await fetch(`/api/subscriptions`);
      }

      if (res.ok) {
        const data = await res.json();
        const subs = data.subscriptions || [];
        // Sort by newest startDate first
        subs.sort(
          (a: any, b: any) =>
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
        );
        setSubs(subs);
      } else {
        toast.error("Failed to load subscriptions");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Subscriber History
          </h1>
          <p className="text-muted-foreground mt-1">
            All subscription activity
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={async () => {
              setIsRefreshing(true);
              try {
                await fetchForUser();
                toast.success("Data refreshed");
              } finally {
                setIsRefreshing(false);
              }
            }}
            disabled={isRefreshing}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw size={18} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="gap-2"
          >
            <ArrowLeft size={18} />
            Back
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading subscriptions...</p>
        </div>
      ) : subs.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No subscriptions found</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {subs.map((subscription) => {
            const isExpired = new Date(subscription.endDate) < new Date();
            const startDate = new Date(subscription.startDate);
            const endDate = new Date(subscription.endDate);

            return (
              <Card key={subscription.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-foreground">
                        {subscription.applicationName}
                      </h3>
                      <Badge
                        className={
                          isExpired
                            ? "bg-red-100 text-red-800"
                            : "bg-green-100 text-green-800"
                        }
                      >
                        {isExpired ? "Expired" : "Active"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Price</p>
                        <p className="font-semibold text-foreground">
                          {subscription.applicationPrice} amount
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">Duration</p>
                        <p className="font-semibold text-foreground">
                          {subscription.subscriptionDays} days
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">Start Date</p>
                        <p className="font-mono text-foreground">
                          {startDate.toLocaleDateString()}{" "}
                          {startDate.toLocaleTimeString()}
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">End Date</p>
                        <p className="font-mono text-foreground">
                          {endDate.toLocaleDateString()}{" "}
                          {endDate.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
