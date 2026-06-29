"use client";

import { useState, useEffect } from "react";
import { GetNetworkJSON, PutNetwork, PostNetwork } from "@/lib/network";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Gift, Minus, RefreshCw, Search } from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string;
  roleId?: string;
  roleName?: string;
  amountBalance: number;
  pendingAmountBalance?: number;
  availableAmountBalance?: number;
  isActive: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [canManageRoles, setCanManageRoles] = useState(false);
  const [loading, setLoading] = useState(true);
  const [grantUserId, setGrantUserId] = useState<string | null>(null);
  const [grantAmount, setGrantAmount] = useState("");
  const [reduceUserId, setReduceUserId] = useState<string | null>(null);
  const [reduceAmount, setReduceAmount] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showGrantConfirm, setShowGrantConfirm] = useState(false);
  const [showReduceConfirm, setShowReduceConfirm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await GetNetworkJSON<{ users: User[] }>("/api/admin/users");
      setUsers(data.users);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const data = await GetNetworkJSON<{ roles: Array<{ id: string; name: string }> }>("/api/admin/roles");
      setRoles(data.roles);
      setCanManageRoles(true);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
      toast.error("Failed to fetch roles");
    }
  };

  const handleChangeRole = async (userId: string, newRoleId: string) => {
    try {
      await PutNetwork(`/api/admin/users/${userId}/role`, {
        roleId: newRoleId,
        id: userId,
      });
      toast.success("User role updated successfully");
      fetchUsers();
    } catch (error) {
      console.error("Failed to change user role:", error);
      toast.error("Failed to change user role");
    }
  };

  const handleGrantAmount = async (userId: string) => {
    if (!grantAmount || parseInt(grantAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/users/${userId}/grant-vouchers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: parseInt(grantAmount) }),
        },
      );

      if (response.ok) {
        toast.success("Amount granted successfully");
        setGrantUserId(null);
        setGrantAmount("");
        setShowGrantConfirm(false);
        fetchUsers();
      } else {
        toast.error("Failed to grant amount");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleReduceAmount = async (userId: string) => {
    if (!reduceAmount || parseInt(reduceAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/users/${userId}/reduce-vouchers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: parseInt(reduceAmount) }),
        },
      );

      if (response.ok) {
        toast.success("Amount reduced successfully");
        setReduceUserId(null);
        setReduceAmount("");
        setShowReduceConfirm(false);
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to reduce amount");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const getFilteredUsers = () => {
    return users.filter((user) => {
      const nameMatch = user.name
        ?.toLowerCase()
        .includes(nameFilter.toLowerCase());
      const roleMatch = !roleFilter || user.roleId === roleFilter;
      return nameMatch && roleMatch;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Users</h1>
        <p className="text-muted-foreground mt-1">
          Manage user accounts and amount
        </p>
      </div>

      {/* Filters and Refresh */}
      <div className="flex gap-4 flex-wrap items-end">
        <div className="flex-1 min-w-64">
          <label className="text-sm font-medium text-foreground">
            Search Name
          </label>
          <div className="relative mt-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search by name..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-border rounded bg-background text-foreground placeholder-muted-foreground"
            />
          </div>
        </div>

        <div className="min-w-48">
          <label className="text-sm font-medium text-foreground">
            Filter by Role
          </label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-2 mt-1 border border-border rounded bg-background text-foreground"
          >
            <option value="">All Roles</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>

        <Button
          onClick={async () => {
            setIsRefreshing(true);
            try {
              await fetchUsers();
              toast.success("Users refreshed");
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
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No users found</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {getFilteredUsers().map((user) => (
            <Card key={user.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {user.name}
                    </h3>
                    {user.isActive ? (
                      <Badge className="bg-green-100 text-green-800">
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="mt-3 flex items-center gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Amount Balance
                      </p>
                      <p className="text-lg font-bold text-primary">
                        {user.amountBalance}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-1"
                        onClick={() =>
                          router.push(
                            `/dashboard/transactions?userId=${user.id}`,
                          )
                        }
                      >
                        View Transactions
                      </Button>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Joined</p>
                      <p className="text-sm font-semibold text-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {canManageRoles && (
                      <div>
                        <p className="text-xs text-muted-foreground">Role</p>
                        <select
                          value={user.roleId || ""}
                          onChange={(e) =>
                            handleChangeRole(user.id, e.target.value)
                          }
                          className="border border-border rounded px-2 py-1 text-sm"
                        >
                          <option value="">None</option>
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {grantUserId === user.id ? (
                  <div className="ml-4 w-48 space-y-2">
                    <Input
                      type="number"
                      min="1"
                      value={grantAmount}
                      onChange={(e) => setGrantAmount(e.target.value)}
                      placeholder="Amount"
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setShowGrantConfirm(true);
                        }}
                        className="flex-1"
                      >
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setGrantUserId(null);
                          setGrantAmount("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : reduceUserId === user.id ? (
                  <div className="ml-4 w-48 space-y-2">
                    <Input
                      type="number"
                      min="1"
                      value={reduceAmount}
                      onChange={(e) => setReduceAmount(e.target.value)}
                      placeholder="Amount"
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setShowReduceConfirm(true);
                        }}
                        className="flex-1"
                      >
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReduceUserId(null);
                          setReduceAmount("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="ml-4 flex gap-2">
                    <Button
                      onClick={() => {
                        setGrantUserId(user.id);
                        setGrantAmount("");
                      }}
                      variant="outline"
                      className="gap-2"
                    >
                      <Gift size={18} />
                      Grant
                    </Button>
                    <Button
                      onClick={() => {
                        setReduceUserId(user.id);
                        setReduceAmount("");
                      }}
                      variant="outline"
                      className="gap-2"
                    >
                      <Minus size={18} />
                      Reduce
                    </Button>
                    <Button
                      onClick={() =>
                        router.push(`/dashboard/users/${user.id}/subscribers`)
                      }
                      variant="secondary"
                      size="sm"
                      className="gap-2"
                    >
                      Subscriber History
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Grant Voucher Confirmation Modal */}
      {showGrantConfirm && grantUserId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-sm p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Confirm Grant Amount
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Grant {grantAmount} amount to{" "}
                {users.find((u) => u.id === grantUserId)?.name}?
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleGrantAmount(grantUserId)}
                className="flex-1"
              >
                Confirm
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowGrantConfirm(false);
                  setGrantUserId(null);
                  setGrantAmount("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Reduce Voucher Confirmation Modal */}
      {showReduceConfirm && reduceUserId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-sm p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Confirm Reduce Amount
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Reduce {reduceAmount} amount from{" "}
                {users.find((u) => u.id === reduceUserId)?.name}?
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleReduceAmount(reduceUserId)}
                className="flex-1"
              >
                Confirm
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowReduceConfirm(false);
                  setReduceUserId(null);
                  setReduceAmount("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
