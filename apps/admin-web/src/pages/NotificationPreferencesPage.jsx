import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { LoadingState } from "../components/ui/LoadingState.jsx";
import { ErrorState } from "../components/ui/ErrorState.jsx";
import apiClient from "../services/apiClient.js";
import { NotificationType } from "@geofield/shared-constants";

const labels = {
  ASSIGNMENT_PUBLISHED: "Assignment published",
  ASSIGNMENT_UPDATED: "Assignment updated",
  ASSIGNMENT_DEADLINE_APPROACHING: "Assignment deadline reminder",
  SURVEY_APPROVED: "Survey approved",
  SURVEY_REJECTED: "Survey rejected",
  SURVEY_CORRECTION_REQUESTED: "Survey correction requested",
  ATTENDANCE_UPDATE: "Attendance update",
  SYNC_FAILED: "Sync needs attention",
};
const mandatoryInApp = new Set([
  NotificationType.ASSIGNMENT_PUBLISHED,
  NotificationType.SURVEY_REJECTED,
  NotificationType.SURVEY_CORRECTION_REQUESTED,
  NotificationType.SYNC_FAILED,
  NotificationType.ATTENDANCE_UPDATE,
]);
export function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  async function load() {
    setLoading(true);
    setError(false);
    try {
      const { data } = await apiClient.get("/notification-preferences");
      setPreferences(data.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  function toggle(type, key) {
    setPreferences((items) =>
      items.map((row) =>
        row.eventType === type ? { ...row, [key]: !row[key] } : row,
      ),
    );
  }
  async function save() {
    setSaving(true);
    try {
      await apiClient.put("/notification-preferences", { preferences });
      toast.success("Notification preferences saved.");
    } catch {
      toast.error("Preferences could not be saved.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Notification preferences"
        description="Choose in-app and push channels for each operational event."
      />
      {loading ? (
        <section className="panel">
          <LoadingState />
        </section>
      ) : error ? (
        <section className="panel">
          <ErrorState onRetry={load} />
        </section>
      ) : (
        <>
          <section className="panel preference-panel">
            <div className="preference-heading">
              <span>Notification type</span>
              <span>In-app</span>
              <span>Push</span>
            </div>
            {preferences.map((item) => (
              <div className="preference-row" key={item.eventType}>
                <strong>{labels[item.eventType] ?? item.eventType}</strong>
                <label>
                  <input
                    type="checkbox"
                    checked={
                      mandatoryInApp.has(item.eventType) || item.inAppEnabled
                    }
                    disabled={mandatoryInApp.has(item.eventType)}
                    onChange={() => toggle(item.eventType, "inAppEnabled")}
                    aria-label={`${labels[item.eventType]} in-app`}
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={item.pushEnabled}
                    onChange={() => toggle(item.eventType, "pushEnabled")}
                    aria-label={`${labels[item.eventType]} push`}
                  />
                </label>
              </div>
            ))}
            <p className="analytics-empty">
              Critical assignment, survey, sync and attendance notices always
              remain in-app. Push delivery requires a registered device and
              server push configuration.
            </p>
          </section>
          <button className="button" disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save preferences"}
          </button>
        </>
      )}
    </>
  );
}
