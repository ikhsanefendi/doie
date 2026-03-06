import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { applications } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { eq } from "drizzle-orm";

// PUT update application
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await hasPermission(user.id, "manage_applications");
    if (!hasAccess) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // read body and allow id fallback for robustness
    const body = await request.json();
    const {
      id: bodyId,
      name,
      description,
      price,
      url,
      subscriptionDays,
      imageUrl,
      isActive,
    } = body;

    const targetId = id || bodyId;
    if (!targetId) {
      return NextResponse.json(
        { error: "Missing application id" },
        { status: 400 },
      );
    }

    // fetch before state for audit
    const before = await db
      .select()
      .from(applications)
      .where(eq(applications.id, targetId))
      .limit(1);

    const updated = await db
      .update(applications)
      .set({
        name,
        description,
        price,
        url,
        subscriptionDays,
        imageUrl,
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, targetId))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }

    // write audit log
    try {
      const { logAudit } = await import("@/lib/audit");
      await logAudit({
        userId: user.id,
        action: "update",
        entityType: "application",
        entityId: targetId,
        details: { before: before[0], after: updated[0] },
      });
    } catch (e) {
      console.error("Failed to write audit for application update", e);
    }

    return NextResponse.json({ application: updated[0] }, { status: 200 });
  } catch (error) {
    console.error("Update application error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE application
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await hasPermission(user.id, "manage_applications");
    if (!hasAccess) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // allow id from body if route param missing
    const body = await request.json().catch(() => ({}));
    const targetId = id || (body as any).id;
    if (!targetId) {
      return NextResponse.json(
        { error: "Missing application id" },
        { status: 400 },
      );
    }
    // audit before delete
    try {
      const before = await db
        .select()
        .from(applications)
        .where(eq(applications.id, targetId))
        .limit(1);
      const { logAudit } = await import("@/lib/audit");
      await logAudit({
        userId: user.id,
        action: "delete",
        entityType: "application",
        entityId: targetId,
        details: { before: before[0] },
      });
    } catch (e) {
      console.error("Failed to write audit for application delete", e);
    }

    await db.delete(applications).where(eq(applications.id, targetId));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete application error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
