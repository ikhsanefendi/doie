"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { GetNetworkJSON } from "@/lib/network";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, RefreshCw, Search, History } from "lucide-react";
import { AuditLogDialog } from "@/components/audit-log-dialog";

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

export default function ApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "price">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedAppName, setSelectedAppName] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    url: "",
    subscriptionDays: 30,
    isActive: true,
  });

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const data = await GetNetworkJSON<{ applications: any[] }>("/api/admin/applications");
      if (data.applications) {
        setApplications(data.applications);
      } else {
        toast.error("Failed to load applications");
      }
    } catch (error) {
      console.error("Failed to fetch applications:", error);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!editingId;
      const url = editingId 
        ? `/api/admin/applications/${editingId}`
        : "/api/admin/applications";
      const method = editingId ? "PUT" : "POST";
      const response = await GetNetworkJSON(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          name: formData.name,
          description: formData.description,
          price: parseInt(formData.price.toString()),
          url: formData.url,
          subscriptionDays: parseInt(formData.subscriptionDays.toString()),
          isActive: formData.isActive,
        }),
      });

      if (response.ok) {
        toast.success(
          isEdit
            ? "Application updated successfully"
            : "Application created successfully",
        );
        setFormData({
          name: "",
          description: "",
          price: 0,
          url: "",
          subscriptionDays: 30,
          isActive: true,
        });
        setEditingId(null);
        setShowForm(false);
        fetchApplications();
      } else {
        toast.error(
          isEdit
            ? "Failed to update application"
            : "Failed to create application",
        );
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this application?")) {
      try {
        const response = await GetNetworkJSON(`/api/admin/applications/${id}`, {
          method: "DELETE",
        });
        
        if (response) {
          toast.success("Application deleted successfully");
          fetchApplications();
        } else {
          toast.error("Failed to delete application");
        }
      } catch (error) {
        toast.error("An error occurred");
      }
    }
  };

  const getFilteredAndSorted = () => {
    let filtered = applications.filter((app) =>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Applications</h1>
          <p className="text-muted-foreground mt-1">Manage your applications</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={async () => {
              setIsRefreshing(true);
              try {
                await fetchApplications();
                toast.success("Applications refreshed");
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
            onClick={() => {
              setEditingId(null);
              setFormData({
                name: "",
                description: "",
                price: 0,
                url: "",
                subscriptionDays: 30,
                isActive: true,
              });
              setShowForm(!showForm);
            }}
            className="gap-2"
          >
            <Plus size={18} />
            Add Application
          </Button>
        </div>
      </div>

      {/* Search and Sort */}
      <div className="flex gap-4 flex-wrap items-end">
        <div className="flex-1 min-w-64">
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

        <div className="min-w-48">
          <label className="text-sm font-medium text-foreground">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full px-3 py-2 mt-1 border border-border rounded bg-background text-foreground"
          >
            <option value="date">Date Added</option>
            <option value="price">Price</option>
          </select>
        </div>

        <div className="min-w-48">
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

      {showForm && (
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-semibold">
              {editingId ? "Edit Application" : "Create Application"}
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Application Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label>Price (Amount)</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: parseInt(e.target.value),
                    })
                  }
                  required
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of the application"
              />
            </div>

            <div>
              <Label>Application URL</Label>
              <Input
                type="url"
                value={formData.url}
                onChange={(e) =>
                  setFormData({ ...formData, url: e.target.value })
                }
                placeholder="https://..."
                required
              />
            </div>

            <div>
              <Label>Subscription Days</Label>
              <Input
                type="number"
                value={formData.subscriptionDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    subscriptionDays: parseInt(e.target.value),
                  })
                }
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="is-active"
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
              />
              <Label htmlFor="is-active">Active</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                {editingId ? "Update Application" : "Create Application"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading applications...</p>
        </div>
      ) : getFilteredAndSorted().length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            No applications match your search
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {getFilteredAndSorted().map((app) => (
            <Card key={app.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    {app.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {app.description}
                  </p>
                  <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Price</p>
                      <p className="font-semibold text-foreground">
                        {app.price} amount
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Duration</p>
                      <p className="font-semibold text-foreground">
                        {app.subscriptionDays} days
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p
                        className={`font-semibold ${app.isActive ? "text-green-600" : "text-red-600"}`}
                      >
                        {app.isActive ? "Active" : "Inactive"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setSelectedAppId(app.id);
                      setSelectedAppName(app.name);
                    }}
                    title="View audit log"
                  >
                    <History size={18} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      // populate form for editing
                      setEditingId(app.id);
                      setFormData({
                        name: app.name,
                        description: app.description || "",
                        price: app.price,
                        url: app.url,
                        subscriptionDays: app.subscriptionDays,
                        isActive: app.isActive,
                      });
                      setShowForm(true);
                    }}
                  >
                    <Edit2 size={18} />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(app.id)}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AuditLogDialog
        isOpen={!!selectedAppId}
        onClose={() => setSelectedAppId(null)}
        entityId={selectedAppId || ""}
        entityName={selectedAppName}
      />
    </div>
  );
}
