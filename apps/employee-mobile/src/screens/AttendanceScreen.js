import { useCallback, useEffect, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Button,
  EmptyState,
  Field,
  LoadingView,
  Screen,
} from "../components/ui.js";
import { useNetwork } from "../context/NetworkContext.js";
import {
  getAttendanceCurrent,
  getPendingAttendanceEvents,
  getAttendanceHistory,
  queueAttendanceEvent,
  requestAttendanceCorrection,
  submitAttendanceEvent,
  synchronizeAttendanceEvents,
} from "../services/apiClient.js";

export function AttendanceScreen() {
  const online = useNetwork();
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [correction, setCorrection] = useState(null);
  const [reason, setReason] = useState("");
  const load = useCallback(async () => {
    try {
      const [currentResponse, historyResponse, queued] = await Promise.all([
        getAttendanceCurrent(),
        getAttendanceHistory(),
        getPendingAttendanceEvents(),
      ]);
      setCurrent(currentResponse.data);
      setHistory(historyResponse.data.items ?? []);
      setPending(queued.length);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);
  useEffect(() => {
    if (!online) return;
    synchronizeAttendanceEvents()
      .then(load)
      .catch(() => {});
  }, [online, load]);

  async function action(type) {
    setWorking(true);
    try {
      if (!online) {
        setPending(await queueAttendanceEvent(type));
        Alert.alert(
          "Saved offline",
          "This event is pending synchronization and is not server-confirmed.",
        );
      } else {
        await submitAttendanceEvent(type);
        await load();
      }
    } catch (error) {
      if (error.code === "NETWORK_ERROR") {
        setPending(await queueAttendanceEvent(type));
        Alert.alert("Saved offline", "The event will sync when connected.");
      } else Alert.alert("Attendance failed", error.message);
    } finally {
      setWorking(false);
    }
  }

  async function submitCorrection() {
    if (!correction || reason.trim().length < 10) {
      Alert.alert("Reason required", "Please provide at least 10 characters.");
      return;
    }
    try {
      await requestAttendanceCorrection(correction.id, {
        requestedCheckInAt: correction.checkedInAt ?? undefined,
        requestedCheckOutAt: correction.checkedOutAt ?? undefined,
        reason: reason.trim(),
      });
      setCorrection(null);
      setReason("");
      Alert.alert("Submitted", "Your correction request is pending review.");
    } catch (error) {
      Alert.alert("Correction failed", error.message);
    }
  }

  if (loading) return <LoadingView label="Loading attendance..." />;
  const nextAction = !current
    ? ["CHECK_IN", "Check in"]
    : current.status === "WORKING"
      ? ["BREAK_START", "Start break"]
      : current.status === "ON_BREAK"
        ? ["BREAK_END", "End break"]
        : null;
  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>FIELD OPERATIONS</Text>
        <Text style={styles.title}>Attendance</Text>
        <Text style={styles.subtitle}>
          {online ? "Connected" : "Offline"} · {pending} pending event{pending === 1 ? "" : "s"}
        </Text>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>TODAY&apos;S SHIFT</Text>
            <View style={[styles.pill, current?.status === "WORKING" ? styles.goodPill : styles.neutralPill]}>
              <View style={[styles.dot, current?.status !== "WORKING" && styles.neutralDot]} />
              <Text style={styles.pillText}>{current?.status?.replaceAll("_", " ") ?? "NOT STARTED"}</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>
            {current?.status === "WORKING"
              ? "Work session active"
              : current?.status === "ON_BREAK"
                ? "Break in progress"
                : "Ready to check in?"}
          </Text>
          <Text style={styles.heroText}>
            {current?.checkedInAt
              ? `Server recorded check-in at ${new Date(current.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "Start your attendance session when you begin field work."}
          </Text>
          {current?.checkedInAt ? (
            <View style={styles.factBox}>
              <Text style={styles.factLabel}>RECORDED BREAK TIME</Text>
              <Text style={styles.factValue}>
                {Math.floor((current.totalBreakSeconds ?? 0) / 60)} min
              </Text>
            </View>
          ) : null}
        </View>
        {nextAction ? (
          <Button loading={working} onPress={() => action(nextAction[0])}>
            {nextAction[1]}
          </Button>
        ) : null}
        {current?.status === "WORKING" ? (
          <View style={{ marginTop: 10 }}>
            <Button variant="secondary" loading={working} onPress={() => action("CHECK_OUT")}>
              End work session
            </Button>
          </View>
        ) : null}
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Recent history</Text>
          <Text style={styles.sectionHint}>Server records</Text>
        </View>
        {history.length ? history.slice(0, 8).map((item) => (
          <View key={item.id} style={styles.historyCard}>
            <View style={styles.historyTop}>
              <Text style={styles.historyDate}>{new Date(item.attendanceDate).toLocaleDateString()}</Text>
              <Text style={styles.historyStatus}>{item.status?.replaceAll("_", " ")}</Text>
            </View>
            <Text style={styles.historyTime}>
              {item.checkedInAt ? new Date(item.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "No recorded check-in"}
              {item.checkedOutAt ? ` — ${new Date(item.checkedOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
            </Text>
            {item.status === "COMPLETED" ? (
              <Text onPress={() => setCorrection(item)} style={styles.correctionLink}>
                Request correction  ›
              </Text>
            ) : null}
          </View>
        )) : (
          <EmptyState title="No attendance history" description="Completed attendance records will appear here." />
        )}
      </ScrollView>
      <Modal visible={Boolean(correction)} transparent animationType="slide" onRequestClose={() => setCorrection(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Request correction</Text>
            <Text style={styles.modalText}>Explain what should be corrected. Your request will be reviewed by an administrator.</Text>
            <Field label="Reason" value={reason} onChangeText={setReason} multiline placeholder="Enter at least 10 characters" />
            <Button onPress={submitCorrection}>Submit request</Button>
            <View style={{ marginTop: 10 }}>
              <Button variant="secondary" onPress={() => setCorrection(null)}>Cancel</Button>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0, backgroundColor: "#f4f6ff" },
  content: { padding: 16, paddingBottom: 26, gap: 12 },
  eyebrow: { color: "#087c72", fontSize: 10, fontWeight: "900", letterSpacing: 1.3, marginTop: 4 },
  title: { color: "#0b1c30", fontSize: 26, fontWeight: "800", marginTop: -6 },
  subtitle: { color: "#536579", fontSize: 12, marginTop: -5 },
  hero: { backgroundColor: "#06432f", borderRadius: 18, padding: 18, marginVertical: 6 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroLabel: { color: "#baf2e5", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 6 },
  goodPill: { backgroundColor: "#d9f7f1" },
  neutralPill: { backgroundColor: "#dce8ff" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#078577" },
  neutralDot: { backgroundColor: "#536579" },
  pillText: { color: "#06432f", fontSize: 9, fontWeight: "900" },
  heroTitle: { color: "#fff", fontSize: 21, fontWeight: "800", marginTop: 18 },
  heroText: { color: "#d5e9df", fontSize: 13, lineHeight: 20, marginTop: 7 },
  factBox: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,.18)", marginTop: 17, paddingTop: 13, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  factLabel: { color: "#baf2e5", fontSize: 10, fontWeight: "700" },
  factValue: { color: "#fff", fontSize: 16, fontWeight: "800" },
  sectionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 13 },
  sectionTitle: { color: "#0b1c30", fontSize: 17, fontWeight: "800" },
  sectionHint: { color: "#536579", fontSize: 10 },
  historyCard: { backgroundColor: "#fff", borderRadius: 13, borderWidth: 1, borderColor: "#e0e7f1", padding: 14 },
  historyTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  historyDate: { color: "#0b1c30", fontSize: 13, fontWeight: "800" },
  historyStatus: { color: "#087c72", fontSize: 10, fontWeight: "900" },
  historyTime: { color: "#536579", fontSize: 12, marginTop: 6 },
  correctionLink: { color: "#06432f", fontWeight: "800", fontSize: 12, marginTop: 12 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(11,28,48,.38)" },
  modalCard: { backgroundColor: "#f4f6ff", padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { color: "#0b1c30", fontSize: 20, fontWeight: "800", marginBottom: 7 },
  modalText: { color: "#536579", fontSize: 13, lineHeight: 19, marginBottom: 16 },
});
