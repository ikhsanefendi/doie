"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Save, RotateCcw } from "lucide-react";

interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  order?: number;
}

export default function MenuOrderPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const response = await fetch("/api/admin/menu-items");
      if (response.ok) {
        const data = await response.json();
        setMenuItems(data.menuItems || []);
      } else {
        toast.error("Failed to load menu items");
      }
    } catch (error) {
      console.error("Failed to fetch menu items:", error);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...menuItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newItems.length) {
      // Swap items
      [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
      
      // Update order values
      newItems.forEach((item, idx) => {
        item.order = idx + 1;
      });
      
      setMenuItems(newItems);
    }
  };

  const updateOrder = (index: number, newOrder: number) => {
    const newItems = [...menuItems];
    newItems[index].order = newOrder;
    setMenuItems(newItems);
  };

  const resetToDefault = () => {
    const defaultOrder = [
      'Dashboard', 'Marketplace', 'Billing', 'Users', 
      'Applications', 'Transactions', 'Subscribers', 'Settings', 'Audit Logs'
    ];
    
    const newItems = [...menuItems].sort((a, b) => {
      const aIndex = defaultOrder.indexOf(a.label);
      const bIndex = defaultOrder.indexOf(b.label);
      return aIndex - bIndex;
    });
    
    newItems.forEach((item, idx) => {
      item.order = idx + 1;
    });
    
    setMenuItems(newItems);
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/menu-items/order", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          menuItems: menuItems.map(item => ({
            id: item.id,
            order: item.order
          }))
        }),
      });

      if (response.ok) {
        toast.success("Menu order saved successfully");
      } else {
        toast.error("Failed to save menu order");
      }
    } catch (error) {
      console.error("Failed to save menu order:", error);
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading menu items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Menu Order</h1>
          <p className="text-muted-foreground mt-1">
            Arrange the menu items in your preferred order
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={resetToDefault}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Default
          </Button>
          <Button
            onClick={saveOrder}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Order"}
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          {menuItems.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 border border-border rounded-lg bg-background"
            >
              <div className="flex flex-col gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                  className="h-8 w-8 p-0"
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === menuItems.length - 1}
                  className="h-8 w-8 p-0"
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground w-8">
                    {item.order}
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.href}</p>
                  </div>
                </div>
              </div>

              <div className="w-24">
                <Label htmlFor={`order-${item.id}`} className="text-sm">
                  Order
                </Label>
                <Input
                  id={`order-${item.id}`}
                  type="number"
                  min="1"
                  max={menuItems.length}
                  value={item.order}
                  onChange={(e) => updateOrder(index, parseInt(e.target.value) || 1)}
                  className="text-center"
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
