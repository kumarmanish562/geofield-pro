import { useCallback, useState } from "react";
import { Alert, ScrollView, Switch, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Button, LoadingView, Screen } from "../components/ui.js";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "../services/apiClient.js";
import { NotificationType } from "@geofield/shared-constants";

const titles = {
  ASSIGNMENT_PUBLISHED: "Assignment published",
  ASSIGNMENT_UPDATED: "Assignment updated",
  ASSIGNMENT_DEADLINE_APPROACHING: "Deadline reminder",
  SURVEY_APPROVED: "Survey approved",
  SURVEY_REJECTED: "Survey rejected",
  SURVEY_CORRECTION_REQUESTED: "Survey correction requested",
  SYNC_FAILED: "Sync needs attention",
  ATTENDANCE_UPDATE: "Attendance update",
};
const mandatoryInApp = new Set([
  NotificationType.ASSIGNMENT_PUBLISHED,
  NotificationType.SURVEY_REJECTED,
  NotificationType.SURVEY_CORRECTION_REQUESTED,
  NotificationType.SYNC_FAILED,
  NotificationType.ATTENDANCE_UPDATE,
]);
export function SettingsScreen() {
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getNotificationPreferences();
      setPreferences(response.data);
    } catch (reason) {
      setError(reason.message ?? "Settings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  function toggle(eventType, channel) {
    setPreferences((items) =>
      items.map((row) =>
        row.eventType === eventType
          ? { ...row, [channel]: !row[channel] }
          : row,
      ),
    );
  }
  async function save() {
    setSaving(true);
    try {
      await updateNotificationPreferences(preferences);
      Alert.alert("Saved", "Notification preferences were updated.");
    } catch (reason) {
      Alert.alert("Could not save", reason.message ?? "Try again later.");
    } finally {
      setSaving(false);
    }
  }
  if (loading) return <LoadingView label="Loading preferences…" />;
  return (
    <Screen>
      <Text
        style={{
          color: "#17352f",
          fontSize: 24,
          fontWeight: "800",
          marginBottom: 8,
        }}
      >
        Notification preferences
      </Text>
      <Text style={{ color: "#71837a", marginBottom: 16 }}>
        Choose how you receive field updates. Critical updates stay in-app.
      </Text>
      {error ? (
        <View>
          <Text style={{ color: "#b43e35", marginBottom: 12 }}>{error}</Text>
          <Button variant="secondary" onPress={refresh}>
            Try again
          </Button>
        </View>
      ) : (
        <>
          <ScrollView>
            {preferences.map((item) => (
              <View
                key={item.eventType}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: "#e4ebe3",
                }}
              >
                <Text style={{ color: "#17352f", flex: 1, fontWeight: "600" }}>
                  {titles[item.eventType] ?? item.eventType}
                </Text>
                <View style={{ alignItems: "center", width: 62 }}>
                  <Text style={{ color: "#71837a", fontSize: 10 }}>IN-APP</Text>
                  <Switch
                    value={
                      mandatoryInApp.has(item.eventType) || item.inAppEnabled
                    }
                    disabled={mandatoryInApp.has(item.eventType)}
                    onValueChange={() => toggle(item.eventType, "inAppEnabled")}
                  />
                </View>
                <View style={{ alignItems: "center", width: 62 }}>
                  <Text style={{ color: "#71837a", fontSize: 10 }}>PUSH</Text>
                  <Switch
                    value={item.pushEnabled}
                    onValueChange={() => toggle(item.eventType, "pushEnabled")}
                  />
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={{ marginTop: 12 }}>
            <Button onPress={save} loading={saving}>
              Save preferences
            </Button>
          </View>
        </>
      )}
    </Screen>
  );
}
