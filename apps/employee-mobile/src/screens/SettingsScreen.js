import { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
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
    <Screen style={styles.screen}>
      <Text style={styles.eyebrow}>FIELD UPDATES</Text>
      <Text style={styles.title}>Notification preferences</Text>
      <Text style={styles.subtitle}>
        Choose how you receive field updates. Critical updates stay in-app.
      </Text>
      {error ? (
        <View>
          <Text style={{ color: "#b42318", marginBottom: 12 }}>{error}</Text>
          <Button variant="secondary" onPress={refresh}>
            Try again
          </Button>
        </View>
      ) : (
        <>
          <ScrollView style={styles.preferenceList}>
            {preferences.map((item) => (
              <View
                key={item.eventType}
                style={styles.preferenceRow}
              >
                <Text style={styles.preferenceTitle}>
                  {titles[item.eventType] ?? item.eventType.replaceAll("_", " ").toLowerCase()}
                </Text>
                <View style={styles.channel}>
                  <Text style={styles.channelLabel}>IN-APP</Text>
                  <Switch
                    value={
                      mandatoryInApp.has(item.eventType) || item.inAppEnabled
                    }
                    disabled={mandatoryInApp.has(item.eventType)}
                    onValueChange={() => toggle(item.eventType, "inAppEnabled")}
                    trackColor={{ false: "#cbd5e1", true: "#87dcca" }}
                    thumbColor={mandatoryInApp.has(item.eventType) || item.inAppEnabled ? "#06432f" : "#fff"}
                  />
                </View>
                <View style={styles.channel}>
                  <Text style={styles.channelLabel}>PUSH</Text>
                  <Switch
                    value={item.pushEnabled}
                    onValueChange={() => toggle(item.eventType, "pushEnabled")}
                    trackColor={{ false: "#cbd5e1", true: "#87dcca" }}
                    thumbColor={item.pushEnabled ? "#06432f" : "#fff"}
                  />
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={styles.save}>
            <Button onPress={save} loading={saving}>
              Save preferences
            </Button>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, backgroundColor: "#f4f6ff" },
  eyebrow: { color: "#087c72", fontSize: 10, fontWeight: "900", letterSpacing: 1.3, marginTop: 4 },
  title: { color: "#06432f", fontSize: 24, fontWeight: "800", marginTop: 5 },
  subtitle: { color: "#536579", fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 16 },
  preferenceList: { flex: 1, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e0e7f1", paddingHorizontal: 12 },
  preferenceRow: { minHeight: 74, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#e8edf5", gap: 5 },
  preferenceTitle: { color: "#0b1c30", flex: 1, fontSize: 12, fontWeight: "700" },
  channel: { alignItems: "center", width: 60 },
  channelLabel: { color: "#536579", fontFamily: "monospace", fontSize: 8, fontWeight: "700" },
  save: { marginTop: 12 },
});
