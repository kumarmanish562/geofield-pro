export function openNotificationTarget(navigation, notification) {
  const { eventType, resourceId, resourceType } = notification ?? {};
  if (!navigation || !eventType) return false;
  if (
    eventType.startsWith("ASSIGNMENT_") &&
    resourceType === "ASSIGNMENT" &&
    resourceId
  ) {
    navigation.navigate("AssignmentsTab", {
      screen: "AssignmentDetails",
      params: { id: resourceId },
    });
    return true;
  }
  if (
    eventType.startsWith("SURVEY_") &&
    resourceType === "SURVEY" &&
    resourceId
  ) {
    navigation.navigate("ReportsTab", {
      screen: "Survey",
      params: { surveyId: resourceId },
    });
    return true;
  }
  if (eventType === "SYNC_FAILED") {
    navigation.navigate("HomeTab", { screen: "OfflineSync" });
    return true;
  }
  if (eventType.startsWith("ATTENDANCE_") && resourceType === "ATTENDANCE") {
    navigation.navigate("HomeTab", { screen: "Attendance" });
    return true;
  }
  return false;
}
