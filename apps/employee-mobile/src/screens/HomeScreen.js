import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useEffect, useState } from "react";
import { Screen, styles as ui } from "../components/ui.js";
import { NetworkBanner } from "../components/NetworkBanner.js";
import { useAuth } from "../context/AuthContext.js";
import {
  getAttendanceCurrent,
  getMyAssignments,
  getSyncStatus,
} from "../services/apiClient.js";

export function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const today = new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
  }).format(new Date());
  useEffect(() => {
    Promise.allSettled([
      getAttendanceCurrent(),
      getMyAssignments({ status: "PUBLISHED" }),
      getSyncStatus(),
    ]).then(([attendanceResult, assignmentResult, syncResult]) => {
      if (attendanceResult.status === "fulfilled")
        setAttendance(attendanceResult.value.data);
      if (assignmentResult.status === "fulfilled")
        setAssignment(assignmentResult.value.data.items?.[0] ?? null);
      if (syncResult.status === "fulfilled")
        setSyncStatus(syncResult.value.data);
    });
  }, []);
  return (
    <Screen style={styles.screen}>
      <NetworkBanner />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => {}} />
        }
        contentContainerStyle={styles.content}
      >
        <Text style={styles.eyebrow}>
          FIELD WORKSPACE · {user?.employeeCode ?? "EMPLOYEE"}
        </Text>
        <Text style={styles.title}>
          Good morning, {user?.name?.split(" ")[0] ?? "there"}.
        </Text>
        <Text style={ui.muted}>{today}</Text>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>Today&apos;s attendance</Text>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>GPS READY</Text>
            </View>
          </View>
          <Text style={styles.cardTitle}>
            {attendance?.status ?? "Not checked in"}
          </Text>
          <Text style={ui.muted}>
            {attendance?.startedAt
              ? `Started ${new Date(attendance.startedAt).toLocaleTimeString()}`
              : "Check in to start an authorized work session."}
          </Text>
          <Text
            style={styles.cardAction}
            onPress={() => navigation.getParent()?.navigate("ProfileTab")}
          >
            Open attendance →
          </Text>
        </View>
        <View style={styles.assignmentCard}>
          <Text style={styles.cardLabelDark}>TODAY&apos;S ASSIGNMENT</Text>
          <Text style={styles.assignmentTitle}>
            {assignment?.name ?? "No assignment published"}
          </Text>
          <Text style={ui.muted}>
            {assignment?.workArea ??
              "Your assigned village and survey area will appear here."}
          </Text>
          <View style={styles.assignmentStats}>
            <Stat label="Target" value={assignment?.targetCount ?? "—"} />
            <Stat label="Completed" value={assignment?.completedCount ?? "0"} />
            <Stat label="Pending sync" value={syncStatus?.pending ?? "0"} />
          </View>
        </View>
        <Text style={styles.section}>Quick actions</Text>
        <View style={styles.actions}>
          <Action
            title="My assignments"
            onPress={() => navigation.getParent()?.navigate("AssignmentsTab")}
          />
          <Action
            title="Open map"
            onPress={() => navigation.getParent()?.navigate("MapTab")}
          />
          <Action
            title="Offline sync"
            onPress={() => navigation.navigate("OfflineSync")}
          />
        </View>
        <Text style={styles.section}>Field status</Text>
        <View style={styles.statusGrid}>
          <StatusCard label="Network" value="Connected" tone="good" />
          <StatusCard label="Location" value="Authorized" tone="good" />
          <StatusCard
            label="Sync queue"
            value={`${syncStatus?.pending ?? 0} pending`}
            tone={syncStatus?.pending ? "warn" : "good"}
          />
          <StatusCard label="Review" value="Open reports" tone="neutral" />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Action({ title, onPress }) {
  return (
    <Text style={styles.action} onPress={onPress}>
      {title}
    </Text>
  );
}
function Stat({ label, value }) {
  return (
    <View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}
function StatusCard({ label, value, tone }) {
  return (
    <View style={styles.statusCard}>
      <View
        style={[
          styles.statusIndicator,
          tone === "warn" && styles.statusIndicatorWarn,
        ]}
      />
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusValue}>{value}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0, paddingTop: 0 },
  content: { padding: 22 },
  eyebrow: {
    color: "#d26935",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginTop: 20,
  },
  title: {
    color: "#17352f",
    fontSize: 30,
    fontWeight: "800",
    marginTop: 8,
    marginBottom: 6,
  },
  card: {
    backgroundColor: "#10233f",
    borderRadius: 14,
    marginTop: 28,
    padding: 20,
  },
  cardLabel: { color: "#aec8b5", fontSize: 13 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: "#1d3760",
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ade80" },
  liveText: { color: "#bfdbfe", fontSize: 9, fontWeight: "800" },
  cardTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    marginVertical: 8,
  },
  cardAction: { color: "#93c5fd", fontWeight: "800", marginTop: 16 },
  assignmentCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginTop: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e1e8f0",
  },
  cardLabelDark: {
    color: "#71839b",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  assignmentTitle: {
    color: "#172b4d",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 8,
  },
  assignmentStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#edf1f7",
  },
  statLabel: { color: "#8090a7", fontSize: 11 },
  statValue: {
    color: "#172b4d",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 4,
  },
  section: {
    color: "#17352f",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 28,
    marginBottom: 12,
  },
  actions: { flexDirection: "row", gap: 10 },
  action: {
    backgroundColor: "#e5eee6",
    borderRadius: 10,
    color: "#28564b",
    flex: 1,
    fontWeight: "700",
    padding: 16,
    textAlign: "center",
  },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statusCard: {
    width: "47%",
    minHeight: 82,
    padding: 13,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e1e8f0",
  },
  statusIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#22c55e",
    marginBottom: 8,
  },
  statusIndicatorWarn: { backgroundColor: "#f59e0b" },
  statusLabel: { color: "#8090a7", fontSize: 11 },
  statusValue: {
    color: "#172b4d",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
  },
});
