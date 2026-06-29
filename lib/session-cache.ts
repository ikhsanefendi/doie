import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessionBlacklist } from "@/lib/schema";
import { eq } from "drizzle-orm";

// Simple in-memory cache for blacklisted tokens (for middleware)
// In production, use Redis instead
const tokenBlacklistCache = new Map<string, number>();

export async function isTokenBlacklisted(tokenHash: string): Promise<boolean> {
  // Check cache first
  if (tokenBlacklistCache.has(tokenHash)) {
    return true;
  }

  try {
    // Check database
    const blacklisted = await db
      .select()
      .from(sessionBlacklist)
      .where(eq(sessionBlacklist.tokenHash, tokenHash))
      .limit(1);

    if (blacklisted.length > 0) {
      // Add to cache
      tokenBlacklistCache.set(tokenHash, Date.now());
      
      // Clean old cache entries (keep only last 1000)
      if (tokenBlacklistCache.size > 1000) {
        const entries = Array.from(tokenBlacklistCache.entries());
        entries.sort((a, b) => a[1] - b[1]);
        // Keep only the newest 500
        entries.slice(0, 500).forEach(([key]) => tokenBlacklistCache.delete(key));
      }
      
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error checking blacklist:", error);
    return false;
  }
}

export function clearBlacklistCache(): void {
  tokenBlacklistCache.clear();
}

// Export for testing
export function getBlacklistCacheSize(): number {
  return tokenBlacklistCache.size;
}
