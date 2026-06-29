import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { applications } from '@/lib/schema';
import { getCurrentUser } from '@/lib/auth';
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
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

// POST endpoint without CSRF protection
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, price, url, subscriptionDays } = body;

    if (!name || !price || !url || !subscriptionDays) {
      return NextResponse.json(
        { error: 'Missing required fields: name, price, url, subscriptionDays' },
        { status: 400 }
      );
    }

    // Create new application
    const [newApp] = await db.insert(applications).values({
      name,
      description,
      price: parseFloat(price),
      url,
      subscriptionDays: parseInt(subscriptionDays),
      isActive: true,
      createdAt: new Date(),
    }).returning();

    return NextResponse.json(
      { 
        message: 'Application created successfully',
        application: newApp 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create application error:', error);
    return NextResponse.json(
      { error: 'Failed to create application' },
      { status: 500 }
    );
  }
}
