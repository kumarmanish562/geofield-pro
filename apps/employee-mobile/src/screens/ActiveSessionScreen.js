import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, EmptyState, LoadingView, Screen } from "../components/ui.js";
import { getAttendanceCurrent, getTrackingSession } from "../services/apiClient.js";

export function ActiveSessionScreen({ navigation }) {
  const [attendance, setAttendance] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const refresh = useCallback(async () => {
    const [attendanceResult, trackingResult] = await Promise.allSettled([
      getAttendanceCurrent(),
      getTrackingSession(),
    ]);
    if (attendanceResult.status === "fulfilled")
      setAttendance(attendanceResult.value.data);
    if (trackingResult.status === "fulfilled")
      setTracking(trackingResult.value.data);
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (loading) return <LoadingView label="Checking current work session..." />;
  const isWorking = attendance?.status === "WORKING";
  const start = attendance?.checkedInAt ? Date.parse(attendance.checkedInAt) : null;
  const elapsed = start ? Math.max(0, Math.floor((now - start) / 1000)) : null;
  const duration = elapsed === null
    ? "—"
    : [
        String(Math.floor(elapsed / 3600)).padStart(2, "0"),
        String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0"),
        String(elapsed % 60).padStart(2, "0"),
      ].join(":");

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>CURRENT SHIFT</Text>
        <Text style={styles.title}>Work session</Text>
        <View style={styles.liveBanner}>
          <View style={[styles.dot, isWorking ? styles.dotOn : styles.dotOff]} />
          <View style={styles.liveTextWrap}>
            <Text style={styles.liveTitle}>{isWorking ? "Attendance confirmed as working" : attendance?.status === "ON_BREAK" ? "Attendance confirmed as on break" : "No active work session"}</Text>
            <Text style={styles.liveCopy}>{tracking ? "An authorized location session is available." : "Location session is not active."}</Text>
          </View>
        </View>

        {attendance?.checkedInAt ? (
          <View style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <Text style={styles.sessionLabel}>ELAPSED SINCE RECORDED CHECK-IN</Text>
              <View style={styles.statusTag}><Text style={styles.statusTagText}>{attendance.status?.replaceAll("_", " ")}</Text></View>
            </View>
            <Text style={styles.timer}>{duration}</Text>
            <Text style={styles.timerCaption}>Elapsed clock time; recorded breaks are shown separately.</Text>
            <View style={styles.sessionFacts}>
              <Fact label="Check-in recorded" value={new Date(attendance.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} />
              <Fact label="Recorded breaks" value={String(Math.floor((attendance.totalBreakSeconds ?? 0) / 60)) + " min"} />
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <EmptyState title="No shift is active" description="Check in before beginning an authorized work session." />
          </View>
        )}

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Session information</Text>
          <Text style={styles.sectionMeta}>CURRENT DEVICE</Text>
        </View>
        <View style={styles.infoCard}>
          <Fact label="Attendance state" value={attendance?.status?.replaceAll("_", " ") ?? "Not checked in"} />
          <View style={styles.divider} />
          <Fact label="Location authorization" value={tracking ? "Available for this session" : "Not active"} />
          <View style={styles.divider} />
          <Fact label="Location update" value={tracking?.lastReceivedAt ? new Date(tracking.lastReceivedAt).toLocaleTimeString() : "No update reported"} />
        </View>

        <Text style={styles.note}>The timer is derived from the server-recorded check-in time. It is not an approved payroll duration.</Text>
        <Button onPress={() => navigation.navigate("Attendance")}>Manage attendance  →</Button>
        <View><Button variant="secondary" onPress={() => navigation.getParent()?.navigate("MapTab")}>Open field map</Button></View>
      </ScrollView>
    </Screen>
  );
}

function Fact({ label, value }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0, backgroundColor: "#f4f6ff" },
  content: { padding: 16, paddingBottom: 28, gap: 13 },
  eyebrow: { color: "#087c72", fontSize: 10, fontWeight: "900", letterSpacing: 1.3, marginTop: 4 },
  title: { color: "#06432f", fontSize: 25, fontWeight: "800", marginTop: -5 },
  liveBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#06432f", borderRadius: 13, padding: 14 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  dotOn: { backgroundColor: "#30c5a7" },
  dotOff: { backgroundColor: "#f59e0b" },
  liveTextWrap: { flex: 1, gap: 3 },
  liveTitle: { color: "#fff", fontSize: 12, fontWeight: "800" },
  liveCopy: { color: "#d5e9df", fontSize: 10, lineHeight: 15 },
  sessionCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e7f1", borderRadius: 16, padding: 16 },
  sessionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  sessionLabel: { color: "#087c72", fontFamily: "monospace", fontSize: 9, fontWeight: "800", flex: 1 },
  statusTag: { backgroundColor: "#d7f8f1", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 5 },
  statusTagText: { color: "#075f55", fontSize: 8, fontWeight: "900" },
  timer: { color: "#06432f", fontFamily: "monospace", fontSize: 42, fontWeight: "700", marginTop: 13 },
  timerCaption: { color: "#536579", fontSize: 10, lineHeight: 15, marginTop: 2 },
  sessionFacts: { backgroundColor: "#edf3ff", borderRadius: 11, padding: 12, gap: 11, marginTop: 15 },
  fact: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  factLabel: { color: "#536579", fontSize: 10 },
  factValue: { color: "#0b1c30", fontSize: 11, fontWeight: "800", textAlign: "right" },
  sectionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  sectionTitle: { color: "#0b1c30", fontSize: 15, fontWeight: "800" },
  sectionMeta: { color: "#536579", fontFamily: "monospace", fontSize: 8 },
  infoCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e7f1", borderRadius: 14, padding: 13, gap: 11 },
  divider: { height: 1, backgroundColor: "#e8edf5" },
  note: { color: "#536579", fontSize: 10, lineHeight: 15 },
  emptyCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e7f1", borderRadius: 14 },
});
