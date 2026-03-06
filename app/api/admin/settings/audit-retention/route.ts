import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { eq, sql } from "drizzle-orm";

const KEY = "audit_retention_days";

export async function GET() {
  try {
    let row;
    try {
      row = await db
        .select()
        .from(settings)
        .where(eq(settings.key, KEY))
        .limit(1);
    } catch (innerErr: any) {
      if (innerErr?.code === "42P01") {
        // settings table missing; return default
        return NextResponse.json({ days: "30" }, { status: 200 });
      }
      throw innerErr;
    }
    if (row && row.length > 0) {
      return NextResponse.json({ days: row[0].value }, { status: 200 });
    }
    // default fallback
    return NextResponse.json({ days: "30" }, { status: 200 });
  } catch (err) {
    console.error("Get audit retention setting error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ok = await hasPermission(user.id, "manage_roles");
    if (!ok)
      return NextResponse.json(
        { error: "Permission denied", requiredPermission: "manage_roles" },
        { status: 403 },
      );

    const body = await request.json().catch(() => ({}));
    const { days } = body as { days?: string };
    if (!days) {
      return NextResponse.json({ error: "days required" }, { status: 400 });
    }
    const daysNum = parseInt(days, 10);
    if (isNaN(daysNum) || daysNum < 0) {
      return NextResponse.json({ error: "invalid days" }, { status: 400 });
    }

    // upsert
    // upsert, defend against missing table
    let existing: any[] = [];
    try {
      existing = await db
        .select()
        .from(settings)
        .where(eq(settings.key, KEY))
        .limit(1);
    } catch (innerErr: any) {
      if (innerErr?.code === "42P01") {
        // table doesn't exist yet; create it manually
        await db.execute(
          sql`CREATE TABLE IF NOT EXISTS settings (key VARCHAR(255) PRIMARY KEY, value TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
        );
        existing = [];
      } else {
        throw innerErr;
      }
    }
    if (existing && existing.length > 0) {
      await db
        .update(settings)
        .set({ value: days })
        .where(eq(settings.key, KEY));
    } else {
      await db.insert(settings).values({ key: KEY, value: days });
    }

    return NextResponse.json({ success: true, days }, { status: 200 });
  } catch (err) {
    console.error("Set audit retention setting error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
