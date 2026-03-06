import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { logActivity, type ActivityType } from "@/lib/activity-log";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, page, target, details } = body;

    if (!action || !page) {
      return NextResponse.json(
        { error: "Missing required fields: action, page" },
        { status: 400 },
      );
    }

    // Log the activity
    await logActivity({
      userId: user.id,
      action: action as ActivityType,
      page,
      target,
      details,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Log activity error:", error);
    // Don't fail the user request - this is background logging
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
