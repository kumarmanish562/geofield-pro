import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, EmptyState, LoadingView, Screen } from "../components/ui.js";
import { getMyAssignment } from "../services/apiClient.js";

export function AssignmentDetailsScreen({ route, navigation }) {
  const [assignment, setAssignment] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getMyAssignment(route.params.id)
      .then((response) => active && setAssignment(response.data))
      .catch((reason) => active && setError(reason.message));
    return () => {
      active = false;
    };
  }, [route.params.id]);
  if (!assignment && !error)
    return <LoadingView label="Loading assignment..." />;
  if (error)
    return (
      <Screen>
        <EmptyState title="Assignment unavailable" description={error} />
      </Screen>
    );

  const target = Number(assignment.targetCount) || 0;
  const completed = Number(assignment.completedCount) || 0;
  const progress = target ? Math.min(100, Math.round((completed / target) * 100)) : null;
  const startSurvey = () =>
    navigation.getParent()?.navigate("ReportsTab", {
      screen: "Survey",
      params: { assignmentId: assignment.id },
    });
  const openMap = () => navigation.getParent()?.navigate("MapTab");

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>FIELD ASSIGNMENT</Text>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{assignment.name}</Text>
          <View style={styles.statusPill}><Text style={styles.statusText}>{assignment.status?.replaceAll("_", " ")}</Text></View>
        </View>
        <Text style={styles.description}>{assignment.description || "No additional instructions were provided for this assignment."}</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.cardEyebrow}>ASSIGNED WORK AREA</Text>
          <Text style={styles.area}>{assignment.workArea || "Work area not specified"}</Text>
          <View style={styles.detailLine} />
          <InfoRow label="Start date" value={assignment.startDate ? new Date(assignment.startDate).toLocaleDateString() : "Not specified"} />
          <InfoRow label="Due date" value={assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : "Not specified"} />
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeading}>
            <Text style={styles.progressTitle}>Survey progress</Text>
            <Text style={styles.progressPercent}>{progress === null ? "—" : `${progress}%`}</Text>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress ?? 0}%` }]} /></View>
          <Text style={styles.progressCaption}>
            {progress === null ? "No numeric target is configured for this assignment." : `${completed} of ${target} surveys recorded`}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Next steps</Text>
        <Button onPress={startSurvey}>Create field survey  →</Button>
        <View style={{ marginTop: 2 }}>
          <Button variant="secondary" onPress={openMap}>View assigned villages</Button>
        </View>
      </ScrollView>
    </Screen>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0, backgroundColor: "#f4f6ff" },
  content: { padding: 16, paddingBottom: 28, gap: 13 },
  eyebrow: { color: "#087c72", fontSize: 10, fontWeight: "900", letterSpacing: 1.3, marginTop: 5 },
  titleRow: { gap: 8 },
  title: { color: "#06432f", fontSize: 24, lineHeight: 30, fontWeight: "800" },
  statusPill: { alignSelf: "flex-start", backgroundColor: "#d7f8f1", borderRadius: 30, paddingHorizontal: 9, paddingVertical: 5 },
  statusText: { color: "#075f55", fontFamily: "monospace", fontSize: 9, fontWeight: "800" },
  description: { color: "#536579", fontSize: 13, lineHeight: 19 },
  summaryCard: { backgroundColor: "#fff", borderRadius: 15, borderWidth: 1, borderColor: "#e0e7f1", padding: 15 },
  cardEyebrow: { color: "#087c72", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  area: { color: "#0b1c30", fontSize: 16, lineHeight: 23, fontWeight: "800", marginTop: 8 },
  detailLine: { height: 1, backgroundColor: "#e8edf5", marginVertical: 12 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: 10, paddingVertical: 5 },
  infoLabel: { color: "#536579", fontSize: 11 },
  infoValue: { color: "#0b1c30", fontSize: 11, fontWeight: "700" },
  progressCard: { backgroundColor: "#edf3ff", borderRadius: 14, padding: 14 },
  progressHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  progressTitle: { color: "#0b1c30", fontSize: 13, fontWeight: "800" },
  progressPercent: { color: "#06432f", fontSize: 16, fontWeight: "800" },
  progressTrack: { height: 8, borderRadius: 10, backgroundColor: "#dce8ff", overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 10, backgroundColor: "#087c72" },
  progressCaption: { color: "#536579", fontSize: 10, marginTop: 8 },
  sectionTitle: { color: "#0b1c30", fontSize: 15, fontWeight: "800", marginTop: 4 },
});
