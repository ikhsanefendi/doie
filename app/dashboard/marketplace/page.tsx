"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { GetNetworkJSON } from "@/lib/network";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShoppingCart, ExternalLink, RefreshCw, Search } from "lucide-react";

interface Application {
  id: string;
  name: string;
  description?: string;
  price: number;
  url: string;
  subscriptionDays: number;
  isActive: boolean;
  createdAt: string;
}

interface Subscription {
  id: string;
  applicationId?: string;
  endDate?: string;
  isActive?: boolean;
  transactionStatus?: "approved" | "pending";
  description?: string;
}

export default function MarketplacePage() {
  const { user, isLoading, refetchUser } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-6">Please log in to access the marketplace.</p>
          <Button onClick={() => window.location.href = '/login'}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  const [calculatedBalance, setCalculatedBalance] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [subscriptionFilter, setSubscriptionFilter] = useState<
    "all" | "subscribed" | "not-subscribed"
  >("all");
  const [sortBy, setSortBy] = useState<"date" | "price">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchData();
    calculateBalance();

    // Auto-refresh subscriptions every 5 seconds to catch approvals from admin
    const interval = setInterval(() => {
      const refreshSubscriptions = async () => {
        try {
          const data = await GetNetworkJSON<{ subscriptions: any[] }>("/api/subscriptions");
          if (data.subscriptions) {
            setSubscriptions(data.subscriptions);
          }
          calculateBalance(); // Refresh balance too
        } catch (error) {
          // Silently fail - don't spam user with errors
          console.debug("Auto-refresh subscriptions failed:", error);
        }
      };
      refreshSubscriptions();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Log page view
  useEffect(() => {
    if (!user) {
      console.log("User not available for logging, skipping page view log");
      return;
    }

    const logPageView = async () => {
      try {
        await GetNetworkJSON("/api/admin/activity-logs/log", {
          method: "POST",
          body: JSON.stringify({
            action: "page_view",
            page: "/marketplace",
            target: "Marketplace Page",
            details: {
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent,
            },
          }),
        });
      } catch (error) {
        console.debug("Failed to log page view:", error);
      }
    };

    logPageView();
  }, [user]);

  const calculateBalance = async () => {
    if (!user) return;

    try {
      const data = await GetNetworkJSON<{ transactions: any[] }>("/api/user/transactions");
      if (data.transactions) {
        const transactions = data.transactions;

        const totalGranted = transactions
          .filter((tx: any) => (tx.type === "grant" || tx.type === "buy_amount" || tx.type === "buy_voucher") && tx.status === "approved")
          .reduce((sum: number, tx: any) => sum + parseFloat(String(tx.amount)), 0);

        const totalSpent = transactions
          .filter((tx: any) => (tx.type === "spend" || tx.type === "subscribe_app") && tx.status === "approved")
          .reduce((sum: number, tx: any) => sum + parseFloat(String(tx.amount)), 0);

        const pendingRequests = transactions
          .filter((tx: any) => (tx.type === "request" || tx.type === "buy_amount" || tx.type === "buy_voucher" || tx.type === "subscribe_app") && tx.status === "pending")
          .reduce((sum: number, tx: any) => sum + parseFloat(String(tx.amount)), 0);

        const calculated = totalGranted - totalSpent;
        const available = calculated - pendingRequests;

        setCalculatedBalance(calculated);
        setAvailableBalance(available);
      }
    } catch (error) {
      console.error("Failed to calculate balance:", error);
    }
  };

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [appsData, subsData] = await Promise.all([
        GetNetworkJSON<{ applications: any[] }>("/api/applications"),
        GetNetworkJSON<{ subscriptions: any[] }>("/api/subscriptions"),
      ]);

      if (appsData.applications) {
        setApplications(appsData.applications);
      }
      
      if (subsData.subscriptions) {
        setSubscriptions(subsData.subscriptions);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (appId: string, price: number) => {
    if (!user) return;

    if (availableBalance < price) {
      toast.error(
        `Insufficient amount. You need ${price} amount but have ${availableBalance} available (permanent balance ${calculatedBalance}).`,
      );
      return;
    }

    setSubscribing(appId);
    try {
      // Step 1: Create subscription request (creates pending transaction)
      const createResponse = await fetch("/api/subscriptions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: appId }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        toast.error(error.error || "Subscription failed");
        setSubscribing(null);
        return;
      }

      const createData = await createResponse.json();
      const transactionId = createData.transaction.id;

      // Auto-approve subscription transactions
      const approveResponse = await fetch(
        `/api/admin/transactions/${transactionId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (approveResponse.ok) {
        toast.success("Subscription activated successfully!");

        // Log subscription activity
        await fetch("/api/admin/activity-logs/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "button_click",
            page: "/marketplace",
            target: "Subscribe Button",
            details: {
              applicationId: appId,
              status: "success",
            },
          }),
        }).catch(console.debug);

        refetchUser();
        fetchData();
        calculateBalance(); // Refresh balance after subscription
      } else {
        // If approval fails, show warning but don't fail completely
        console.error("Auto-approval failed, subscription is pending");
        toast.warning(
          "Subscription created but approval pending. Please wait for admin approval.",
        );

        // Log subscription attempt
        await fetch("/api/admin/activity-logs/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "button_click",
            page: "/marketplace",
            target: "Subscribe Button",
            details: {
              applicationId: appId,
              status: "pending_approval",
            },
          }),
        }).catch(console.debug);

        refetchUser();
        fetchData();
        calculateBalance(); // Refresh balance after subscription
      }
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error("An error occurred");
    } finally {
      setSubscribing(null);
    }
  };

  const getSubscription = (appId: string) => {
    // First check for approved subscriptions (filter by applicationId and transactionStatus)
    console.log(
      `Looking for subscription for app ${appId}. Available subscriptions:`,
      subscriptions,
    );

    let subscription = subscriptions.find(
      (s) => s.applicationId === appId && s.transactionStatus === "approved",
    );

    if (subscription) {
      console.log(`Found approved subscription:`, subscription);
      return subscription;
    }

    // If not found, check for pending subscription requests
    subscription = subscriptions.find((s) => {
      if (s.transactionStatus === "pending" && s.description) {
        try {
          const details = JSON.parse(s.description);
          const isMatch = details.applicationId === appId;
          console.log(`Checking pending subscription:`, {
            s,
            details,
            appId,
            isMatch,
          });
          return isMatch;
        } catch {
          console.log(
            `Failed to parse pending subscription description:`,
            s.description,
          );
          return false;
        }
      }
      return false;
    });    // console.log(`Final result for app ${appId}:`, subscription);
    return subscription;
  };

  const isSubscriptionExpired = (endDate?: string) => {
    if (!endDate) return false; // Pending subscriptions don't have an end date yet
    return new Date(endDate) < new Date();
  };

  const getFilteredAndSorted = () => {
    let filtered = applications
      .filter((a) => a.isActive)
      .filter((app) => {
        const subscription = getSubscription(app.id);
        const isSubscribed =
          subscription &&
          (subscription.transactionStatus === "pending" ||
            !isSubscriptionExpired(subscription.endDate));

        if (subscriptionFilter === "subscribed") return isSubscribed;
        if (subscriptionFilter === "not-subscribed") return !isSubscribed;
        return true;
      })
      .filter((app) =>
        app.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    filtered.sort((a, b) => {
      if (sortBy === "price") {
        return sortOrder === "asc" ? a.price - b.price : b.price - a.price;
      } else {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      }
    });

    return filtered;
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchData();
      toast.success("Data refreshed");
    } catch (error) {
      toast.error("Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleGoToApp = (appName: string, url: string) => {
    // Log app access
    fetch("/api/admin/activity-logs/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "button_click",
        page: "/marketplace",
        target: `${appName} App`,
        details: {
          url: url,
          timestamp: new Date().toISOString(),
        },
      }),
    }).catch(console.debug);

    // Open app in new tab
    window.open(url, "_blank");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Marketplace</h1>
          <p className="text-muted-foreground mt-2">
            Browse and subscribe to available applications
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Your Balance</p>
          <p className="text-2xl font-bold text-primary">
            {calculatedBalance.toLocaleString('id-ID')}
          </p>
          {availableBalance < calculatedBalance && (
            <p className="text-xs text-muted-foreground">
              {availableBalance.toLocaleString('id-ID')} available
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading applications...</p>
        </div>
      ) : applications.filter((a) => a.isActive).length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No applications available</p>
        </Card>
      ) : (
        <>
          {/* Search and Refresh */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground">
                Search Application
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
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw size={18} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          {/* Filter Controls */}
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">
                  Subscription Status
                </label>
                <select
                  value={subscriptionFilter}
                  onChange={(e) => setSubscriptionFilter(e.target.value as any)}
                  className="w-full px-3 py-2 mt-1 border border-border rounded bg-background text-foreground"
                >
                  <option value="all">All Applications</option>
                  <option value="subscribed">Subscribed</option>
                  <option value="not-subscribed">Not Subscribed</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 mt-1 border border-border rounded bg-background text-foreground"
                >
                  <option value="date">Date Added</option>
                  <option value="price">Price</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">
                  Order
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="w-full px-3 py-2 mt-1 border border-border rounded bg-background text-foreground"
                >
                  <option value="desc">Newest / Highest</option>
                  <option value="asc">Oldest / Lowest</option>
                </select>
              </div>
            </div>
          </Card>

          {getFilteredAndSorted().length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">
                No applications match your filters
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getFilteredAndSorted().map((app) => {
                const subscription = getSubscription(app.id);
                const isExpired =
                  subscription &&
                  subscription.transactionStatus === "approved" &&
                  isSubscriptionExpired(subscription.endDate);

                return (
                  <Card key={app.id} className="overflow-hidden flex flex-col">
                    <div className="p-6 flex-1 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-foreground">
                            {app.name}
                          </h3>
                          {subscription &&
                            subscription.transactionStatus === "pending" && (
                              <Badge className="mt-2 bg-gray-100 text-gray-800">
                                Pending Approval
                              </Badge>
                            )}
                          {subscription &&
                            subscription.transactionStatus === "approved" &&
                            !isExpired && (
                              <Badge className="mt-2 bg-green-100 text-green-800">
                                Subscribed
                              </Badge>
                            )}
                          {isExpired && (
                            <Badge className="mt-2 bg-red-100 text-red-800">
                              Subscription Expired
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {app.description}
                      </p>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Price:</span>
                          <span className="font-semibold text-foreground">
                            {app.price} amount
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Duration:
                          </span>
                          <span className="font-semibold text-foreground">
                            {app.subscriptionDays} days
                          </span>
                        </div>
                        {subscription &&
                          subscription.transactionStatus === "approved" &&
                          !isExpired && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Expires:
                              </span>
                              <span className="font-semibold text-foreground">
                                {new Date(
                                  subscription.endDate || "",
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                      </div>
                    </div>

                    <div className="border-t border-border p-4 flex gap-2">
                      {subscription &&
                      subscription.transactionStatus === "pending" ? (
                        <Button
                          disabled
                          variant="outline"
                          className="flex-1 gap-2 opacity-50 cursor-not-allowed"
                        >
                          <ShoppingCart size={18} />
                          Pending
                        </Button>
                      ) : subscription &&
                        subscription.transactionStatus === "approved" &&
                        !isExpired ? (
                        <Button
                          onClick={() => handleGoToApp(app.name, app.url)}
                          className="flex-1 gap-2"
                        >
                          <ExternalLink size={18} />
                          Go to Application
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleSubscribe(app.id, app.price)}
                          disabled={subscribing === app.id}
                          className="flex-1 gap-2"
                        >
                          <ShoppingCart size={18} />
                          {subscribing === app.id
                            ? "Subscribing..."
                            : "Subscribe"}
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
