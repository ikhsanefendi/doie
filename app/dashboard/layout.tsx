"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { useState, useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Use effect to handle redirect instead of redirect() function
  console.log("Dashboard layout - user:", user);
  console.log("Session expires at:", user?.sessionExpiresAt);
  console.log("Session expires in:", user?.sessionExpiresIn, "seconds");
  console.log("Is session expired:", user?.isSessionExpired);
  
  useEffect(() => {
    if (!isLoading && !user) {
      console.log("Redirecting to login");
      router.push("/login");
    }
    
    // Auto logout if session expired
    if (!isLoading && user && user.isSessionExpired) {
      console.log("Session expired, logging out");
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="flex-1 overflow-hidden flex flex-col">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
