"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { GetNetworkJSON } from "@/lib/network";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

interface Transaction {
  id: string;
  type: "grant" | "reduce" | "request" | "spend" | "subscribe" | "subscribe_app" | "buy_amount" | "buy_voucher";
  amount: number;
  description?: string;
  status: "approved" | "pending" | "rejected";
  createdAt: string;
  updatedAt?: string;
}

export default function BillingPage() {
  const { user, refetchUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "grant" | "reduce" | "request" | "spend" | "subscribe" | "subscribe_app" | "buy_amount" | "buy_voucher">("all");
  
  // Request Amount states
  const [requestAmount, setRequestAmount] = useState("100");
  const [requesting, setRequesting] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const data = await GetNetworkJSON<{ transactions: any[] }>("/api/user/transactions");
      if (data.transactions) {
        console.log("Fetched transactions:", data.transactions); // Debug log
        setTransactions(data.transactions);
      } else {
        toast.error("Failed to load transactions");
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAmount = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequesting(true);

    try {
      let response: Response;
      // if the user attached a proof file we need to use FormData
      if (proofFile) {
        const formData = new FormData();
        formData.append("amount", requestAmount);
        formData.append("paymentProof", proofFile);
        const result = await GetNetworkJSON("/api/vouchers/request", {
          method: "POST",
          body: formData,
        });
        if (result) {
          toast.success("Voucher request submitted successfully");
          setProofFile(null);
          setProofPreview(null);
          setRequestAmount("");
          fetchTransactions();
        }
      } else {
        const result = await GetNetworkJSON("/api/vouchers/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: requestAmount,
          }),
        });
        if (result) {
          toast.success("Voucher request submitted successfully");
          setRequestAmount("");
          fetchTransactions();
        }
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setRequesting(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => 
    filter === "all" ? true : tx.type === filter
  );

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "grant":
        return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case "reduce":
        return <ArrowDownRight className="h-4 w-4 text-red-600" />;
      case "request":
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case "spend":
        return <TrendingDown className="h-4 w-4 text-orange-600" />;
      case "subscribe":
        return <Calendar className="h-4 w-4 text-purple-600" />;
      case "subscribe_app":
        return <Calendar className="h-4 w-4 text-purple-600" />;
      case "buy_amount":
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case "buy_voucher":
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      default:
        return <Wallet className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "grant":
        return "text-green-600 bg-green-50 border-green-200";
      case "reduce":
        return "text-red-600 bg-red-50 border-red-200";
      case "request":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "spend":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "subscribe":
        return "text-purple-600 bg-purple-50 border-purple-200";
      case "subscribe_app":
        return "text-purple-600 bg-purple-50 border-purple-200";
      case "buy_amount":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "buy_voucher":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const totalGranted = transactions
    .filter(tx => (tx.type === "grant" || tx.type === "buy_amount" || tx.type === "buy_voucher") && tx.status === "approved")
    .reduce((sum, tx) => sum + parseFloat(String(tx.amount)), 0);

  const totalSpent = transactions
    .filter(tx => (tx.type === "spend" || tx.type === "subscribe_app") && tx.status === "approved")
    .reduce((sum, tx) => sum + parseFloat(String(tx.amount)), 0);

  const totalRequested = transactions
    .filter(tx => tx.type === "request" && tx.status === "approved")
    .reduce((sum, tx) => sum + parseFloat(String(tx.amount)), 0);

  const pendingRequests = transactions
    .filter(tx => (tx.type === "request" || tx.type === "buy_amount" || tx.type === "buy_voucher" || tx.type === "subscribe_app") && tx.status === "pending")
    .reduce((sum, tx) => sum + parseFloat(String(tx.amount)), 0);

  // Calculate current amount based on transaction history
  const calculatedAmount = totalGranted - totalSpent - pendingRequests;

  // Debug logs
  console.log("Transaction calculations:", {
    totalTransactions: transactions.length,
    totalGranted,
    totalSpent,
    totalRequested,
    pendingRequests,
    calculatedAmount,
    transactionTypes: transactions.map(tx => ({ type: tx.type, status: tx.status, amount: tx.amount }))
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading billing information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Billing</h1>
        <p className="text-muted-foreground">
          Manage your amount and view transaction history
        </p>
      </div>

      {/* Amount Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Amount</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                Rp {calculatedAmount.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-blue-100/20 rounded-lg">
              <Wallet className="text-blue-600" size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Granted (Approved)</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                +Rp {totalGranted.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-green-100/20 rounded-lg">
              <ArrowUpRight className="text-green-600" size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Spent (Subscriptions)</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                -Rp {totalSpent.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-red-100/20 rounded-lg">
              <TrendingDown className="text-red-600" size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Requests</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                Rp {pendingRequests.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-yellow-100/20 rounded-lg">
              <Calendar className="text-yellow-600" size={20} />
            </div>
          </div>
        </Card>
      </div>

      {/* Request Amount */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">
          Request Amount
        </h2>
        <form onSubmit={handleRequestAmount} className="space-y-4">
          {/* transfer tutorial */}
          <div className="p-4 bg-secondary/5 rounded">
            <p className="text-sm text-foreground font-medium mb-1">
              Panduan Transfer
            </p>
            <p className="text-xs text-muted-foreground">
              Silakan lakukan transfer ke rekening berikut sebelum mengajukan
              permintaan amount:
            </p>
            <ul className="list-disc list-inside text-xs text-muted-foreground">
              <li>Bank BCA</li>
              <li>Nomor Rekening: 123-456-7890</li>
              <li>Atas Nama: PT Contoh Voucher</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Setelah melakukan transfer, unggah bukti transaksi di bawah.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Number of Amount
            </label>
            <input
              type="number"
              min="1"
              max="99999999"
              value={requestAmount}
              onChange={(e) => setRequestAmount(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-foreground bg-background"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Submit a request for amount. Admin will review and approve.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Bukti Transfer (opsional)
            </label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setProofFile(file);
                if (file) {
                  setProofPreview(URL.createObjectURL(file));
                } else {
                  setProofPreview(null);
                }
              }}
              className="w-full"
            />
            {proofPreview && (
              <img
                src={proofPreview}
                alt="Preview bukti"
                className="mt-2 max-h-40 object-contain"
              />
            )}
          </div>

          <Button type="submit" disabled={requesting} className="w-full">
            {requesting ? "Submitting..." : "Request Amount"}
          </Button>
        </form>
      </Card>

      {/* Transaction History */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Transaction History</h2>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
            >
              <option value="all">All Transactions</option>
              <option value="grant">Granted</option>
              <option value="reduce">Reduced</option>
              <option value="request">Requests</option>
              <option value="spend">Spent</option>
              <option value="subscribe">Subscriptions</option>
              <option value="subscribe_app">App Subscriptions</option>
              <option value="buy_amount">Buy Amount</option>
              <option value="buy_voucher">Buy Voucher</option>
            </select>
            <Button
              onClick={fetchTransactions}
              variant="outline"
              size="sm"
            >
              Refresh
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No transactions found</p>
            </div>
          ) : (
            filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className={`p-4 rounded-lg border ${getTransactionColor(
                  transaction.type
                )}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(transaction.type)}
                    <div>
                      <p className="font-medium capitalize">
                        {transaction.type === 'buy_amount' || transaction.type === 'buy_voucher' ? 'Request Amount' : transaction.type === 'subscribe_app' ? 'Subscription' : transaction.type} Amount
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(() => {
                          if (!transaction.description) return "No description";
                          
                          // For buy_amount and buy_voucher, show better description
                          if (transaction.type === 'buy_amount' || transaction.type === 'buy_voucher') {
                            return `Request for ${transaction.amount} Amount`;
                          }
                          
                          try {
                            // Try to parse JSON description
                            const parsed = JSON.parse(transaction.description);
                            
                            if (parsed.applicationId && parsed.price) {
                              return `Application Subscription - ${parsed.price} Amount for ${parsed.subscriptionDays} days`;
                            }
                            
                            return transaction.description;
                          } catch {
                            // If not JSON, return as-is
                            return transaction.description;
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      {transaction.type === "grant" || transaction.type === "request" || transaction.type === "buy_amount" || transaction.type === "buy_voucher"
                        ? `+Rp ${parseFloat(String(transaction.amount)).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : `-Rp ${parseFloat(String(transaction.amount)).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </p>
                    <div className="flex items-center gap-2 justify-end mt-1">
                      {getStatusBadge(transaction.status)}
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
