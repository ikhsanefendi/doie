import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { applications } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const apps = await db
      .select()
      .from(applications)
      .where(eq(applications.isActive, true))
      .orderBy(applications.createdAt);

    return NextResponse.json(
      { applications: apps },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get applications error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
