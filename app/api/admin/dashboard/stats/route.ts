import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, applications, transactions } from '@/lib/schema';
import { getCurrentUser } from '@/lib/auth';
import { eq, count } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user count
    const userCount = await db.select({ count: count() }).from(users);
    
    // Get application count
    const appCount = await db.select({ count: count() }).from(applications);
    
    // Get pending transaction count
    const pendingCount = await db
      .select({ count: count() })
      .from(transactions)
      .where(eq(transactions.status, 'pending'));

    return NextResponse.json(
      {
        totalUsers: userCount[0]?.count || 0,
        totalApplications: appCount[0]?.count || 0,
        pendingTransactions: pendingCount[0]?.count || 0,
        totalAmount: user.voucherBalance || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
