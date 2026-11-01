import { UnavailableScreen } from "./UnavailableScreen.js";

export function AttendanceScreen() {
  return (
    <UnavailableScreen
      title="Attendance unavailable"
      description="Check-in and check-out endpoints are not available in the current API. No local attendance record is created."
    />
  );
}
