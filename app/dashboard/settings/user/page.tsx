"use client";

import { useAuth } from "@/hooks/use-auth";
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
  const [requestAmount, setRequestAmount] = useState("100");
  const [requesting, setRequesting] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/users/transactions");
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
      toast.error("Failed to load transaction history");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestVouchers = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequesting(true);

    try {
      let response: Response;

      // if the user attached a proof file we need to use FormData
      if (proofFile) {
        const formData = new FormData();
        formData.append("amount", requestAmount);
        formData.append("paymentProof", proofFile);
        response = await fetch("/api/vouchers/request", {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch("/api/vouchers/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: parseInt(requestAmount),
            paymentProofUrl: null,
          }),
        });
      }

      if (response.ok) {
        toast.success("Voucher request submitted for admin approval");
        setRequestAmount("100");
        setProofFile(null);
        setProofPreview(null);
        fetchTransactions();
      } else {
        const error = await response.json().catch(() => null);
        toast.error(error?.error || "Failed to request vouchers");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setRequesting(false);
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
          Manage your account and vouchers
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
            <p className="text-sm text-muted-foreground">Voucher Balance</p>
            <p className="text-2xl font-bold text-primary">
              {user?.voucherBalance} vouchers
              {user?.pendingVoucherBalance ? (
                <span className="text-base text-muted-foreground ml-2">
                  (available: {user.availableVoucherBalance})
                </span>
              ) : null}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Account Status</p>
            <Badge className="mt-1 bg-green-100 text-green-800">Active</Badge>
          </div>
        </div>
      </Card>

      {/* Request Vouchers */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">
          Request Vouchers
        </h2>
        <form onSubmit={handleRequestVouchers} className="space-y-4">
          {/* transfer tutorial */}
          <div className="p-4 bg-secondary/5 rounded">
            <p className="text-sm text-foreground font-medium mb-1">
              Panduan Transfer
            </p>
            <p className="text-xs text-muted-foreground">
              Silakan lakukan transfer ke rekening berikut sebelum mengajukan
              permintaan voucher:
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
              Number of Vouchers
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
              Submit a request for vouchers. Admin will review and approve.
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
            {requesting ? "Submitting..." : "Request Vouchers"}
          </Button>
        </form>
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
