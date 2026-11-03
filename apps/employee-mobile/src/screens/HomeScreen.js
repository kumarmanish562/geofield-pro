import { useCallback, useState } from "react";
import {
  RefreshControl,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Screen } from "../components/ui.js";
import { NetworkBanner } from "../components/NetworkBanner.js";
import { useAuth } from "../context/AuthContext.js";
import { useNetwork } from "../context/NetworkContext.js";
import {
  getAttendanceCurrent,
  getMyAssignments,
  getSyncStatus,
} from "../services/apiClient.js";

const colors = {
  ink: "#0b1c30",
  muted: "#536579",
  green: "#06432f",
  teal: "#087c72",
  canvas: "#f4f6ff",
  pale: "#edf3ff",
  border: "#e0e7f1",
};

export function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const online = useNetwork();
  const [attendance, setAttendance] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const today = new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(
    new Date(),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const [attendanceResult, assignmentResult, syncResult] =
      await Promise.allSettled([
        getAttendanceCurrent(),
        getMyAssignments({ status: "PUBLISHED" }),
        getSyncStatus(),
      ]);
    if (attendanceResult.status === "fulfilled")
      setAttendance(attendanceResult.value.data);
    if (assignmentResult.status === "fulfilled")
      setAssignment(assignmentResult.value.data.items?.[0] ?? null);
    if (syncResult.status === "fulfilled") setSyncStatus(syncResult.value.data);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const working = attendance?.status === "WORKING";

  return (
    <Screen style={styles.screen}>
      <NetworkBanner />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topbar}>
          <View style={styles.brandMark}><Text style={styles.brandLetters}>GF</Text></View>
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>GeoField Pro</Text>
            <Text style={styles.brandCaption}>FIELD WORKSPACE</Text>
          </View>
          <View style={[styles.onlinePill, !online && styles.offlinePill]}>
            <View style={[styles.dot, !online && styles.offlineDot]} />
            <Text style={[styles.onlineText, !online && styles.offlineText]}>
              {online ? "Online" : "Offline"}
            </Text>
          </View>
          <Text
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
            onPress={() => navigation.navigate("Notifications")}
            style={styles.bell}
          >
            {"\uD83D\uDD14"}
          </Text>
        </View>

        <View style={styles.welcomeCard}>
          <View style={styles.rowBetween}>
            <View style={styles.flex}>
              <Text style={styles.greeting}>Good day, {firstName}</Text>
              <Text style={styles.date}>{today}</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{firstName.slice(0, 1).toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.attendanceStrip}>
            <View style={[styles.dot, { backgroundColor: colors.teal }]} />
            <Text style={styles.attendanceText}>
              {attendance?.startedAt
                ? `${attendance.status === "ON_BREAK" ? "On break" : "Checked in"} at ${new Date(attendance.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "You are not checked in"}
            </Text>
            <Text style={styles.attendanceMeta}>
              {attendance?.status === "WORKING" ? "ACTIVE" : attendance?.status ?? "TODAY"}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <ActionButton
            title={working ? "Work session" : "Attendance"}
            icon={working ? "●" : "▶"}
            onPress={() => navigation.navigate("Attendance")}
            primary
          />
          <ActionButton
            title="Break / status"
            icon="Ⅱ"
            onPress={() => navigation.navigate("Attendance")}
          />
        </View>

        <View style={styles.assignmentCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.eyebrow}>CURRENT ASSIGNMENT</Text>
            <Text style={styles.code}>{assignment?.code ?? "FIELD TASK"}</Text>
          </View>
          <Text style={styles.assignmentTitle}>
            {assignment?.name ?? "No assignment published"}
          </Text>
          <Text style={styles.assignmentArea}>
            {assignment?.workArea ?? "Your assigned village and survey area will appear here."}
          </Text>
          <View style={styles.progressHeader}>
            <Text style={styles.muted}>Survey completion</Text>
            <Text style={styles.progressValue}>
              {assignment?.targetCount
                ? `${Math.min(100, Math.round(((assignment.completedCount ?? 0) / assignment.targetCount) * 100))}%`
                : "—"}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${assignment?.targetCount ? Math.min(100, Math.round(((assignment.completedCount ?? 0) / assignment.targetCount) * 100)) : 0}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressCaption}>
            {assignment
              ? `${assignment.completedCount ?? 0} of ${assignment.targetCount ?? "—"} completed`
              : "Assignment progress is unavailable"}
          </Text>
          <ActionButton
            title={assignment ? "View assignment" : "Browse assignments"}
            icon="→"
            onPress={() => navigation.getParent()?.navigate("AssignmentsTab")}
            primary
            full
          />
        </View>

        <Text style={styles.sectionTitle}>Today at a glance</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="⚑" label="Daily target" value={assignment?.targetCount ?? "—"} detail="Assigned plots" />
          <StatCard icon="✓" label="Completed" value={assignment?.completedCount ?? "—"} detail="Confirmed work" />
          <StatCard icon="↥" label="Pending sync" value={syncStatus?.pending ?? 0} detail={online ? "Waiting to upload" : "Saved on device"} />
          <StatCard icon="⌖" label="Location" value="Check" detail="Open field map" onPress={() => navigation.getParent()?.navigate("MapTab")} />
        </View>

        <Text style={styles.sectionTitle}>Quick access</Text>
        <View style={styles.quickLinks}>
          <QuickLink title="Open field map" icon="⌖" onPress={() => navigation.getParent()?.navigate("MapTab")} />
          <QuickLink title="Create survey" icon="＋" onPress={() => navigation.getParent()?.navigate("ReportsTab", { screen: "Survey" })} />
          <QuickLink title="Offline sync" icon="↻" onPress={() => navigation.navigate("OfflineSync")} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function ActionButton({ title, icon, onPress, primary, full }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.actionButton, primary && styles.actionPrimary, full && styles.actionFull]}
    >
      <Text style={[styles.actionIcon, primary && styles.actionIconPrimary]}>{icon}</Text>
      <Text style={[styles.actionLabel, primary && styles.actionLabelPrimary]}>{title}</Text>
    </Pressable>
  );
}

function StatCard({ icon, label, value, detail, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statDetail}>{detail}</Text>
    </Pressable>
  );
}

function QuickLink({ title, icon, onPress }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.quickLink}>
      <Text style={styles.quickIcon}>{icon}</Text>
      <Text style={styles.quickText}>{title}</Text>
      <Text style={styles.quickArrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28, gap: 14 },
  topbar: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 9 },
  brandMark: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" },
  brandLetters: { color: "#fff", fontSize: 14, fontWeight: "900" },
  brandCopy: { flex: 1 },
  brandName: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  brandCaption: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1.4, marginTop: 2 },
  onlinePill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#d9f7f1", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 7 },
  offlinePill: { backgroundColor: "#ffeadc" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#078577" },
  offlineDot: { backgroundColor: "#c56824" },
  onlineText: { color: "#075f55", fontSize: 12, fontWeight: "700" },
  offlineText: { color: "#874515" },
  bell: { minWidth: 40, minHeight: 40, textAlign: "center", textAlignVertical: "center", color: colors.green, fontSize: 22, fontWeight: "800" },
  welcomeCard: { backgroundColor: "#fff", borderRadius: 18, padding: 17, borderWidth: 1, borderColor: colors.border },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  flex: { flex: 1 },
  greeting: { color: colors.green, fontSize: 21, lineHeight: 27, fontWeight: "800" },
  date: { color: colors.muted, fontSize: 12, marginTop: 4 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#bfebd7", alignItems: "center", justifyContent: "center", marginLeft: 10 },
  avatarText: { color: colors.green, fontSize: 17, fontWeight: "800" },
  attendanceStrip: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#dbfaf5", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, marginTop: 16 },
  attendanceText: { color: colors.ink, fontWeight: "700", fontSize: 12, flex: 1 },
  attendanceMeta: { color: colors.teal, fontWeight: "800", fontFamily: "monospace", fontSize: 10 },
  actions: { flexDirection: "row", gap: 10 },
  actionButton: { flex: 1, minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#dce8ff", borderRadius: 14, paddingHorizontal: 9, textAlign: "center", textAlignVertical: "center" },
  actionPrimary: { backgroundColor: colors.green },
  actionFull: { marginTop: 16, width: "100%" },
  actionIcon: { color: colors.green, fontSize: 15, fontWeight: "900" },
  actionIconPrimary: { color: "#fff" },
  actionLabel: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  actionLabelPrimary: { color: "#fff" },
  assignmentCard: { backgroundColor: "#fff", borderRadius: 18, padding: 17, borderWidth: 1, borderColor: colors.border },
  eyebrow: { color: colors.teal, fontSize: 10, fontWeight: "900", letterSpacing: 1.2, backgroundColor: "#d7f8f1", overflow: "hidden", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20 },
  code: { color: colors.teal, fontSize: 11, fontFamily: "monospace" },
  assignmentTitle: { color: colors.ink, fontSize: 19, lineHeight: 25, fontWeight: "800", marginTop: 12 },
  assignmentArea: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", marginTop: 18, marginBottom: 8 },
  muted: { color: colors.muted, fontSize: 12 },
  progressValue: { color: colors.green, fontSize: 13, fontWeight: "800" },
  progressTrack: { height: 9, borderRadius: 9, backgroundColor: "#dce8ff", overflow: "hidden" },
  progressFill: { height: 9, borderRadius: 9, backgroundColor: colors.teal },
  progressCaption: { color: colors.muted, fontSize: 11, marginTop: 7 },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: "800", marginTop: 3 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { width: "48%", minHeight: 105, backgroundColor: "#fff", borderRadius: 15, padding: 13, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  statIcon: { color: colors.teal, fontSize: 14, fontWeight: "900" },
  statLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  statValue: { color: colors.ink, fontSize: 22, fontWeight: "800", marginTop: 4 },
  statDetail: { color: colors.muted, fontSize: 10, marginTop: 1 },
  quickLinks: { gap: 8 },
  quickLink: { flexDirection: "row", alignItems: "center", minHeight: 50, gap: 11, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border },
  quickIcon: { color: colors.teal, fontSize: 18, fontWeight: "800" },
  quickText: { color: colors.ink, fontSize: 13, fontWeight: "700", flex: 1 },
  quickArrow: { color: colors.muted, fontSize: 22 },
});
