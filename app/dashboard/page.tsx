"use client";

import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Package,
  CreditCard,
  TrendingUp,
  ExternalLink,
  Search,
} from "lucide-react";

interface DashboardStats {
  totalUsers?: number;
  totalApplications?: number;
  pendingTransactions?: number;
  totalVouchers?: number;
}

interface Subscription {
  id: string;
  applicationId?: string | null;
  applicationName?: string | null;
  applicationUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  applicationPrice?: number | null;
  subscriptionDays?: number | string | null;
  transactionStatus?: "approved" | "pending";
  description?: string | null;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({});
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "expiry">("expiry");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch stats and subscriptions
        const [statsRes, subsRes] = await Promise.all([
          fetch("/api/admin/dashboard/stats"),
          fetch("/api/subscriptions"),
        ]);

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }

        if (subsRes.ok) {
          const data = await subsRes.json();
          // Sort subscriptions by newest endDate, filter out pending ones
          const sorted = (data.subscriptions || [])
            .filter((s: any) => s.transactionStatus !== "pending")
            .sort((a: any, b: any) => {
              if (!a.endDate || !b.endDate) return 0;
              return (
                new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
              );
            });
          setSubscriptions(sorted.slice(0, 5)); // Show top 5
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Log page view
  useEffect(() => {
    if (!user) return;

    const logPageView = async () => {
      try {
        await fetch("/api/admin/activity-logs/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "page_view",
            page: "/dashboard",
            target: "Dashboard",
          }),
        });
      } catch (error) {
        console.debug("Failed to log page view:", error);
      }
    };

    logPageView();
  }, [user]);

  const getFilteredAndSorted = () => {
    // Filter for approved subscriptions only and by search query
    let filtered = subscriptions.filter((sub) => {
      // Only show approved subscriptions
      if (sub.transactionStatus === "pending") return false;

      // Filter by search query
      if (!sub.applicationName) return false;
      return sub.applicationName
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    });

    filtered.sort((a, b) => {
      if (sortBy === "expiry") {
        if (!a.endDate || !b.endDate) return 0;
        const dateA = new Date(a.endDate).getTime();
        const dateB = new Date(b.endDate).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      } else {
        if (!a.startDate || !b.startDate) return 0;
        const dateA = new Date(a.startDate).getTime();
        const dateB = new Date(b.startDate).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      }
    });

    return filtered;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome back, {user?.name}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Users */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Users
              </p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {loading ? "-" : stats.totalUsers || 0}
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <Users className="text-primary" size={24} />
            </div>
          </div>
        </Card>

        {/* Applications */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Applications
              </p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {loading ? "-" : stats.totalApplications || 0}
              </p>
            </div>
            <div className="p-3 bg-secondary/10 rounded-lg">
              <Package className="text-secondary" size={24} />
            </div>
          </div>
        </Card>

        {/* Pending Transactions */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Pending Transactions
              </p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {loading ? "-" : stats.pendingTransactions || 0}
              </p>
            </div>
            <div className="p-3 bg-accent/10 rounded-lg">
              <CreditCard className="text-accent" size={24} />
            </div>
          </div>
        </Card>

        {/* Voucher Balance */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Your Vouchers
              </p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {user?.voucherBalance || 0}
                {user?.pendingVoucherBalance ? (
                  <span className="text-base text-muted-foreground ml-2">
                    (available: {user.availableVoucherBalance})
                  </span>
                ) : null}
              </p>
            </div>
            <div className="p-3 bg-amber-100/20 rounded-lg">
              <TrendingUp className="text-amber-600" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Info */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Quick Info</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">User ID</p>
            <p className="font-mono text-foreground">{user?.id}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Email</p>
            <p className="font-mono text-foreground">{user?.email}</p>
          </div>
        </div>
      </Card>

      {/* Active Subscriptions */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">
          Your Active Subscriptions
        </h2>

        {/* Search and Sort */}
        <div className="flex gap-4 flex-wrap items-end mb-4">
          <div className="flex-1 min-w-64">
            <label className="text-sm font-medium text-foreground">
              Search
            </label>
            <div className="relative mt-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-border rounded bg-background text-foreground placeholder-muted-foreground"
              />
            </div>
          </div>

          <div className="min-w-48">
            <label className="text-sm font-medium text-foreground">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 mt-1 border border-border rounded bg-background text-foreground"
            >
              <option value="expiry">Expiry Date</option>
              <option value="date">Start Date</option>
            </select>
          </div>

          <div className="min-w-48">
            <label className="text-sm font-medium text-foreground">Order</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="w-full px-3 py-2 mt-1 border border-border rounded bg-background text-foreground"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>

        {subscriptions.length === 0 ? (
          <p className="text-muted-foreground">No active subscriptions</p>
        ) : getFilteredAndSorted().length === 0 ? (
          <p className="text-muted-foreground">
            No subscriptions match your search
          </p>
        ) : (
          <div className="space-y-3">
            {getFilteredAndSorted().map((sub) => {
              const isExpired = sub.endDate
                ? new Date(sub.endDate) < new Date()
                : false;
              return (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-3 border border-border rounded"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      {sub.applicationName || "Unknown Application"}
                    </p>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span>Price: {sub.applicationPrice || "-"} vouchers</span>
                      <span>Duration: {sub.subscriptionDays || "-"} days</span>
                      <span>
                        Expires:{" "}
                        {sub.endDate
                          ? new Date(sub.endDate).toLocaleDateString()
                          : "-"}
                        {isExpired && (
                          <Badge className="ml-2 bg-red-100 text-red-800">
                            Expired
                          </Badge>
                        )}
                      </span>
                    </div>
                  </div>
                  {sub.applicationUrl && (
                    <Button
                      onClick={() => window.open(sub.applicationUrl!, "_blank")}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <ExternalLink size={16} />
                      Open
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
