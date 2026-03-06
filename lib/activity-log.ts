import { logAudit } from "./audit";

export type ActivityType =
  | "page_view"
  | "button_click"
  | "sidebar_click"
  | "form_submit"
  | "data_view"
  | "export_data"
  | "delete_record"
  | "create_record"
  | "update_record"
  | "login"
  | "logout";

export interface ActivityLog {
  userId: string;
  action: ActivityType;
  page: string;
  target?: string; // Button name, sidebar link, etc
  details?: any;
}

/**
 * Log user activity (page views, clicks, etc)
 */
export async function logActivity(activity: ActivityLog) {
  try {
    await logAudit({
      userId: activity.userId,
      action: activity.action,
      entityType: "user_activity",
      entityId: activity.userId,
      details: {
        page: activity.page,
        target: activity.target,
        timestamp: new Date().toISOString(),
        ...activity.details,
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
    // Activity logging failure should not affect user experience
  }
}
