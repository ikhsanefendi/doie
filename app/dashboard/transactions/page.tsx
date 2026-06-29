"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GetNetworkJSON } from "@/lib/network";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Eye, RefreshCw } from "lucide-react";

interface Transaction {
  id: string;
  userId: string;
  type: string;
  amount: number;
  status: string;
  description?: string;
  paymentProofUrl?: string | null;
  createdAt: string;
  balanceBefore?: number;
  currentBalance?: number;
  currentPending?: number;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const searchParams = useSearchParams();
  const filterUserId = searchParams.get("userId") || "";
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState<
    "all" | "buy_voucher" | "subscribe_app"
  >("all");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canManageTransactions, setCanManageTransactions] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
    fetchTransactions();
  }, [filterUserId]);

  const fetchCurrentUser = async () => {
    try {
      // Check if user has admin/manage permissions by trying to access admin-only endpoint
      const adminCheckResponse = await GetNetworkJSON("/api/admin/users");
      console.log("Admin check response status:", adminCheckResponse);
      if (adminCheckResponse) {
        setCanManageTransactions(true);
        console.log("User can manage transactions: true");
      } else if (adminCheckResponse.status === 403) {
        setCanManageTransactions(false);
        console.log("User can manage transactions: false (403)");
      }
    } catch (error) {
      console.error("Failed to fetch current user:", error);
      setCanManageTransactions(false);
      console.log("User can manage transactions: false (error)");
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      let url = "/api/admin/transactions";
      if (filterUserId) {
        url += `?userId=${filterUserId}`;
      }
      const data = await GetNetworkJSON<{ transactions: any[] }>(url);
      if (data.transactions) {
        console.log("fetched transactions", data);
        setTransactions(data.transactions);
      } else {
        toast.error("Failed to fetch transactions");
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAndSorted = () => {
    let filtered = transactions.filter((txn) => {
      if (filterType !== "all" && txn.type !== filterType) return false;
      if (statusFilter !== "all" && txn.status !== statusFilter) return false;
      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === "amount") {
        return sortOrder === "asc" ? a.amount - b.amount : b.amount - a.amount;
      } else {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      }
    });

    return filtered;
  };

  const handleApproveModal = (txn: Transaction) => {
    setSelectedTxn(txn);
    setShowModal(true);
  };

  const confirmApprove = async () => {
    if (!selectedTxn) return;

    try {
      const result = await GetNetworkJSON(`/api/admin/transactions/${selectedTxn.id}/approve`, {
        method: "POST",
        body: JSON.stringify({ id: selectedTxn.id }),
      });
      
      if (result) {
        toast.success("Transaction approved successfully");
        fetchTransactions();
      } else {
        toast.error("Failed to approve transaction");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleReject = async (id: string) => {
    console.log("handleReject called for id", id);
    const found = transactions.find((t) => t.id === id);
    console.log("transaction in state", found);
    try {
      const result = await GetNetworkJSON(`/api/admin/transactions/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ id }),
      });
      
      if (result) {
        toast.success("Transaction rejected successfully");
        fetchTransactions();
      } else {
        toast.error("Failed to reject transaction");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getTypeLabel = (type: string) => {
    return type === "buy_voucher" ? "Buy Voucher" : "Subscribe App";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
          <p className="text-muted-foreground mt-1">
            Manage and approve transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={async () => {
              setIsRefreshing(true);
              try {
                await fetchTransactions();
                toast.success("Transactions refreshed");
              } catch (error) {
                toast.error("Failed to refresh");
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
          <Button asChild variant="outline" className="gap-2">
            <a href="/dashboard/transactions/mutations">Balance Mutations</a>
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-3 py-2 mt-1 border border-border rounded bg-background text-foreground"
            >
              <option value="all">All Types</option>
              <option value="buy_voucher">Buy Voucher</option>
              <option value="subscribe_app">Subscribe App</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 mt-1 border border-border rounded bg-background text-foreground"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
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
              <option value="date">Date</option>
              <option value="amount">Amount</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Order</label>
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

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading transactions...</p>
        </div>
      ) : getFilteredAndSorted().length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No transactions found</p>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                  User ID
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                  Balance Before
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                  Balance After
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {getFilteredAndSorted().map((txn) => (
                <tr key={txn.id} className="hover:bg-secondary/5">
                  <td className="px-4 py-3 text-sm font-mono text-foreground">
                    {txn.userId.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {getTypeLabel(txn.type)}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-foreground">
                    {txn.amount} amount
                  </td>
                  {/* parse description for additional info */}
                  {(() => {
                    let priceDisplay: string | number = "-";
                    let durationDisplay = "-";
                    if (txn.description) {
                      try {
                        const det = JSON.parse(txn.description);
                        if (det.price !== undefined) {
                          priceDisplay = det.price;
                        }
                        if (det.subscriptionDays !== undefined) {
                          durationDisplay = det.subscriptionDays + " days";
                        }
                      } catch {}
                    }
                    return (
                      <>
                        <td className="px-4 py-3 text-sm font-semibold text-foreground">
                          {priceDisplay}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {durationDisplay}
                        </td>
                      </>
                    );
                  })()}
                  <td className="px-4 py-3 text-sm">
                    <Badge className={getStatusColor(txn.status)}>
                      {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(txn.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {txn.balanceBefore ?? 0}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {(() => {
                      if (txn.balanceBefore == null) return "-";
                      if (txn.status === "rejected") return txn.balanceBefore;
                      if (txn.status === "approved") {
                        return txn.type === "buy_voucher"
                          ? txn.balanceBefore + txn.amount
                          : txn.balanceBefore - txn.amount;
                      }
                      if (txn.status === "pending") {
                        return txn.type === "buy_voucher"
                          ? txn.balanceBefore + txn.amount
                          : txn.balanceBefore - txn.amount;
                      }
                      return "-";
                    })()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {(() => {
                      console.log("Transaction:", txn.type, txn.status, "Can manage:", canManageTransactions);
                      return canManageTransactions ? (
                        <div className="flex gap-2">
                          {txn.status === "pending" ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproveModal(txn)}
                                className="gap-1"
                              >
                                <Check size={14} />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(txn.id)}
                                className="gap-1"
                              >
                                <X size={14} />
                                Reject
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApproveModal(txn)}
                              className="gap-1"
                            >
                              <Eye size={14} />
                              View
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No access</span>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Modal */}
      {showModal && selectedTxn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Review Transaction
              </h2>

              <div className="space-y-4 mb-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">User ID</p>
                    <p className="font-mono text-sm">{selectedTxn.userId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-semibold">
                      {getTypeLabel(selectedTxn.type)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-semibold text-lg">
                      {selectedTxn.amount} amount
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-semibold">
                      {new Date(selectedTxn.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {selectedTxn.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">Details</p>
                    {(() => {
                      try {
                        const det = JSON.parse(
                          selectedTxn.description as string,
                        );
                        return (
                          <div className="space-y-1 text-sm">
                            {det.price !== undefined && (
                              <p>Price: {det.price} amount</p>
                            )}
                            {det.subscriptionDays !== undefined && (
                              <p>Duration: {det.subscriptionDays} days</p>
                            )}
                            {det.applicationId && (
                              <p>App ID: {det.applicationId}</p>
                            )}
                          </div>
                        );
                      } catch {
                        return (
                          <p className="text-sm">{selectedTxn.description}</p>
                        );
                      }
                    })()}
                  </div>
                )}

                {/* File Preview */}
                {selectedTxn.paymentProofUrl && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Payment Proof
                    </p>
                    <div className="bg-secondary/20 rounded p-4">
                      {selectedTxn.paymentProofUrl.match(
                        /\.(png|jpg|jpeg|gif|webp)$/i,
                      ) ? (
                        <img
                          src={selectedTxn.paymentProofUrl}
                          alt="Payment proof"
                          className="max-w-full max-h-96 rounded"
                        />
                      ) : (
                        <a
                          href={selectedTxn.paymentProofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 underline"
                        >
                          Download File
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedTxn(null);
                  }}
                >
                  Close
                </Button>
                {canManageTransactions && selectedTxn.status === "pending" && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleReject(selectedTxn.id);
                        setShowModal(false);
                        setSelectedTxn(null);
                      }}
                    >
                      Reject
                    </Button>
                    <Button variant="default" onClick={confirmApprove}>
                      <Check size={16} className="mr-1" />
                      Approve
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
