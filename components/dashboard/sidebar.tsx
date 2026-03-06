"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function Sidebar({ open, setOpen }: SidebarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [menuItems, setMenuItems] = useState<
    Array<{ icon: string; label: string; href: string }>
  >([]);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch("/api/menu");
        if (res.ok) {
          const data = await res.json();
          setMenuItems(data.menuItems || []);
        }
      } catch (e) {
        console.error("Failed to load menu items", e);
      }
    };
    fetchMenu();
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:relative left-0 top-0 z-50 h-screen w-64 bg-card border-r border-border transition-transform duration-300 flex flex-col md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">DOIEHub</h1>
          <button
            onClick={() => setOpen(false)}
            className="md:hidden text-foreground hover:text-primary"
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            // dynamic icon lookup
            const IconComponent = (Icons as any)[item.icon] || LayoutDashboard;
            const isActive = pathname === item.href;

            const handleMenuClick = async () => {
              setOpen(false);

              // Log sidebar click
              try {
                await fetch("/api/admin/activity-logs/log", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "sidebar_click",
                    page: item.href,
                    target: item.label,
                  }),
                });
              } catch (error) {
                console.debug("Failed to log sidebar click:", error);
              }
            };

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleMenuClick}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-secondary/20",
                )}
              >
                <IconComponent size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Activity Logs - Superadmin only */}
          {user?.roleId === "superadmin" && (
            <>
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4">
                Admin Tools
              </div>
              <Link
                href="/dashboard/settings/activity-logs"
                onClick={async () => {
                  setOpen(false);
                  // Log activity logs page access
                  try {
                    await fetch("/api/admin/activity-logs/log", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "sidebar_click",
                        page: "/dashboard/settings/activity-logs",
                        target: "Activity Logs",
                      }),
                    });
                  } catch (error) {
                    console.debug("Failed to log sidebar click:", error);
                  }
                }}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
                  pathname === "/dashboard/settings/activity-logs"
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-secondary/20",
                )}
              >
                <Icons.Activity size={20} />
                <span>Activity Logs</span>
              </Link>
            </>
          )}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-border space-y-3">
          <div className="px-4 py-3 bg-secondary/10 rounded-lg">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full justify-start gap-2"
          >
            <LogOut size={18} />
            Logout
          </Button>
        </div>
      </aside>
    </>
  );
}
