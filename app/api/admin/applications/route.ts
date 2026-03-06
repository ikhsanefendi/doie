import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { applications } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { eq } from "drizzle-orm";

// GET all applications
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apps = await db
      .select()
      .from(applications)
      .orderBy(applications.createdAt);

    return NextResponse.json({ applications: apps }, { status: 200 });
  } catch (error) {
    console.error("Get applications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST create application
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await hasPermission(user.id, "manage_applications");
    if (!hasAccess) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const {
      name,
      description,
      price,
      url,
      subscriptionDays,
      imageUrl,
      isActive,
    } = await request.json();

    if (!name || !price || !url || !subscriptionDays) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const newApp = await db
      .insert(applications)
      .values({
        name,
        description,
        price,
        url,
        subscriptionDays,
        imageUrl,
        createdBy: user.id,
        isActive: isActive === undefined ? true : isActive,
      })
      .returning();

    // audit creation
    try {
      const { logAudit } = await import("@/lib/audit");
      await logAudit({
        userId: user.id,
        action: "create",
        entityType: "application",
        entityId: newApp[0].id,
        details: { after: newApp[0] },
      });
    } catch (e) {
      console.error("Failed to log application creation", e);
    }

    return NextResponse.json({ application: newApp[0] }, { status: 201 });
  } catch (error) {
    console.error("Create application error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
