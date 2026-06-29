import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionBlacklist } from '@/lib/schema';
import { lt, sql } from 'drizzle-orm';
import { hasPermission } from '@/lib/permissions';
import { getCurrentUser } from '@/lib/auth';
import { createSecureResponse } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return createSecureResponse({ error: 'Unauthorized' }, 401);
    }

    // Check if user has admin permissions
    const hasAdminAccess = await hasPermission(user.id, 'manage_users');
    if (!hasAdminAccess) {
      return createSecureResponse({ error: 'Permission denied' }, 403);
    }

    // Clean up old sessions (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deletedCount = await db
      .delete(sessionBlacklist)
      .where(lt(sessionBlacklist.invalidatedAt, thirtyDaysAgo))
      .returning({ id: sessionBlacklist.id });

    return createSecureResponse({
      success: true,
      message: `Cleaned up ${deletedCount.length} old sessions`,
      deletedCount: deletedCount.length,
    });
  } catch (error) {
    console.error('Session cleanup error:', error);
    return createSecureResponse({ error: 'Internal server error' }, 500);
  }
}
