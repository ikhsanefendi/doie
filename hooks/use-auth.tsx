"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { GetNetworkJSON, PostNetwork } from "@/lib/network";
import { useRouter } from "next/navigation";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roleId: string;
  amountBalance: number;
  pendingAmountBalance?: number;
  availableAmountBalance?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  sessionExpiresAt?: string;
  sessionExpiresIn?: number;
  isSessionExpired?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cache for user data to avoid unnecessary refetches
let userCache: AuthUser | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refetchUser = useCallback(async () => {
    try {
      const data = await GetNetworkJSON<{ user: AuthUser | null }>("/api/auth/me", {
        cache: "no-store",
      });

      if (data.user) {
        userCache = data.user;
        cacheTimestamp = Date.now();
        setUser(data.user);
      } else {
        userCache = null;
        cacheTimestamp = 0;
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      userCache = null;
      cacheTimestamp = 0;
      setUser(null);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    const initAuth = async () => {
      await refetchUser();
      setIsLoading(false);
    };

    initAuth();
  }, [refetchUser]);

  // Setup periodic refresh (every 5 minutes, but only if user is authenticated)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(
      () => {
        refetchUser();
      },
      5 * 60 * 1000,
    ); // 5 minutes

    return () => clearInterval(interval);
  }, [user, refetchUser, router]); // Add router dependency

  const logout = async () => {
    try {
      // Clear client-side cookies immediately (aggressive approach)
      document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + window.location.hostname;
      document.cookie = "google_oauth_state=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "g_state=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      
      console.log("Client-side cookies cleared aggressively");

      // Call server-side logout and wait for response
      try {
        await PostNetwork("/api/auth/logout");
        console.log("Server-side logout successful");
      } catch (error) {
        console.error("Logout server response failed:", error);
      }
    } catch (error) {
      console.error("Logout fetch failed:", error);
    } finally {
      // Clear cache
      userCache = null;
      cacheTimestamp = 0;

      // Clear user state immediately
      setUser(null);

      // Force redirect to login page immediately
      router.push("/login");
      router.refresh(); // Force refresh to clear any remaining state
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        setIsLoading,
        isAuthenticated: !!user,
        logout,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
