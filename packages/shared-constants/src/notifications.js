export const NotificationType = Object.freeze({
  ASSIGNMENT_PUBLISHED: "ASSIGNMENT_PUBLISHED",
  ASSIGNMENT_UPDATED: "ASSIGNMENT_UPDATED",
  ASSIGNMENT_DEADLINE_APPROACHING: "ASSIGNMENT_DEADLINE_APPROACHING",
  SURVEY_APPROVED: "SURVEY_APPROVED",
  SURVEY_REJECTED: "SURVEY_REJECTED",
  SURVEY_CORRECTION_REQUESTED: "SURVEY_CORRECTION_REQUESTED",
  SYNC_FAILED: "SYNC_FAILED",
  ATTENDANCE_UPDATE: "ATTENDANCE_UPDATE",
});

export const NotificationCategory = Object.freeze({
  ASSIGNMENT: "ASSIGNMENT",
  SURVEY: "SURVEY",
  ATTENDANCE: "ATTENDANCE",
  SYNC: "SYNC",
  SYSTEM: "SYSTEM",
});

export function notificationCategory(type) {
  if (type.startsWith("ASSIGNMENT_")) return NotificationCategory.ASSIGNMENT;
  if (type.startsWith("SURVEY_")) return NotificationCategory.SURVEY;
  if (type.startsWith("ATTENDANCE_")) return NotificationCategory.ATTENDANCE;
  if (type.startsWith("SYNC_")) return NotificationCategory.SYNC;
  return NotificationCategory.SYSTEM;
}
