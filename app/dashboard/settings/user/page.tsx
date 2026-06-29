"use client";

import { useAuth } from "@/hooks/use-auth";
import { GetNetworkJSON } from "@/lib/network";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
  paymentProofUrl?: string | null;
  description?: string | null;
}

export default function UserSettingsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await GetNetworkJSON<{ transactions: any[] }>("/api/users/transactions");
      if (data.transactions) {
        setTransactions(data.transactions);
      } else {
        toast.error("Failed to load transactions");
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      toast.error("Failed to load transaction history");
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and amount
        </p>
      </div>

      {/* User Info */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">
          Account Information
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="font-semibold text-foreground">{user?.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-semibold text-foreground">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tanggal Daftar</p>
            <p className="font-semibold text-foreground">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              }) : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Account Status</p>
            <Badge className="mt-1 bg-green-100 text-green-800">Active</Badge>
          </div>
        </div>
      </Card>

      {/* Transaction History */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">
          Transaction History
        </h2>
        {loading ? (
          <p className="text-muted-foreground text-center py-4">
            Loading transactions...
          </p>
        ) : transactions.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No transactions yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-foreground">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-foreground">
                    Amount
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-foreground">
                    Price
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-foreground">
                    Duration
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-foreground">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-foreground">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-foreground">
                    Proof
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((txn) => {
                  // parse extra info from description if available
                  let priceDisplay: string | number = "-";
                  let durationDisplay = "-";
                  if (txn.description) {
                    try {
                      const details = JSON.parse(txn.description);
                      if (details.price !== undefined) {
                        priceDisplay = details.price;
                      }
                      if (details.subscriptionDays !== undefined) {
                        durationDisplay = details.subscriptionDays + " days";
                      }
                    } catch {
                      // ignore parse errors
                    }
                  }

                  return (
                    <tr key={txn.id} className="hover:bg-secondary/5">
                      <td className="px-4 py-3">
                        {txn.type === "buy_voucher"
                          ? "Buy Voucher"
                          : "Subscribe App"}
                      </td>
                      <td className="px-4 py-3 font-semibold">{txn.amount}</td>
                      <td className="px-4 py-3 font-semibold">
                        {priceDisplay}
                      </td>
                      <td className="px-4 py-3">{durationDisplay}</td>
                      <td className="px-4 py-3">
                        <Badge className={getStatusColor(txn.status)}>
                          {txn.status.charAt(0).toUpperCase() +
                            txn.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(txn.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {txn.paymentProofUrl ? (
                          <a
                            href={txn.paymentProofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 underline"
                          >
                            View Proof
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
