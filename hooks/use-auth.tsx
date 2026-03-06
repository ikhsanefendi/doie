"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roleId: string;
  voucherBalance: number;
  pendingVoucherBalance?: number;
  availableVoucherBalance?: number;
  isActive: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
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
    // Check if we have fresh cached data
    const now = Date.now();
    if (userCache && now - cacheTimestamp < CACHE_DURATION) {
      setUser(userCache);
      return;
    }

    try {
      const response = await fetch("/api/auth/me", {
        // This suggests the browser should check the cache for a matching request
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        userCache = data.user;
        cacheTimestamp = Date.now();
        setUser(data.user);
      } else if (response.status === 401) {
        // Not authenticated - clear cache
        userCache = null;
        cacheTimestamp = 0;
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      // On error, check if we have stale cache to use
      if (userCache) {
        setUser(userCache);
      } else {
        setUser(null);
      }
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
  }, [user, refetchUser]);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout fetch failed:", error);
    } finally {
      // Clear cache
      userCache = null;
      cacheTimestamp = 0;

      // Clear user and redirect
      setUser(null);

      // Use a small delay to ensure state update is processed before navigation
      setTimeout(() => {
        router.push("/login");
      }, 100);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
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
