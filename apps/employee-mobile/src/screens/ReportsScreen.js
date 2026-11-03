import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Button, EmptyState, LoadingView, Screen } from "../components/ui.js";
import { getSurveys } from "../services/apiClient.js";

export function ReportsScreen({ navigation }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    setError("");
    getSurveys({ pageSize: "10" })
      .then((response) => setItems(response.data.items ?? []))
      .catch((reason) => setError(reason.message ?? "Surveys could not be loaded."));
  }, []);
  useFocusEffect(useCallback(() => load(), [load]));

  if (!items && !error) return <LoadingView label="Loading field reports..." />;
  const recentNeedsReview = (items ?? []).filter((item) =>
    ["SUBMITTED", "PENDING_REVIEW"].includes(item.status),
  ).length;

  return (
    <Screen style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>FIELD RECORDS</Text>
        <Text style={styles.title}>Reports & surveys</Text>
        <Text style={styles.subtitle}>Review your recent field submissions or start a new survey.</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryValue}>{items?.length ?? "—"}</Text>
            <Text style={styles.summaryLabel}>Recent records</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCell}>
            <Text style={styles.summaryValue}>{items ? recentNeedsReview : "—"}</Text>
            <Text style={styles.summaryLabel}>Awaiting review*</Text>
          </View>
        </View>
        <Text style={styles.disclaimer}>*Count covers the latest 10 records loaded from the server.</Text>
        <Button onPress={() => navigation.navigate("Survey")}>＋  Create field survey</Button>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent submissions</Text>
          <Text onPress={() => navigation.navigate("Survey")} style={styles.viewAll}>View all  ›</Text>
        </View>
        {error ? <EmptyState title="Reports unavailable" description={error} /> : null}
        {!error && items?.length === 0 ? (
          <EmptyState title="No survey records yet" description="Create a survey when you begin field work." />
        ) : null}
        {(items ?? []).slice(0, 5).map((item) => (
          <Pressable
            key={item.id}
            onPress={() => navigation.navigate("SurveyReview", { surveyId: item.id })}
            style={({ pressed }) => [styles.record, pressed && { opacity: 0.8 }]}
          >
            <View style={styles.recordIcon}><Text style={styles.recordGlyph}>⌖</Text></View>
            <View style={styles.recordMain}>
              <Text style={styles.recordTitle}>{item.surveyNumber ?? `Survey ${item.gatNumber ?? ""}`}</Text>
              <Text style={styles.recordMeta}>
                {item.village?.name ?? "Village unavailable"} · {item.gatNumber ? `Gat ${item.gatNumber}` : "Gat unavailable"}
              </Text>
              <Text style={styles.recordDate}>
                {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : "Not submitted"}
              </Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>{item.status?.replaceAll("_", " ") ?? "UNKNOWN"}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0, backgroundColor: "#f4f6ff" },
  content: { padding: 16, gap: 12 },
  eyebrow: { color: "#087c72", fontSize: 10, fontWeight: "900", letterSpacing: 1.3, marginTop: 4 },
  title: { color: "#0b1c30", fontSize: 25, fontWeight: "800", marginTop: -5 },
  subtitle: { color: "#536579", fontSize: 13, lineHeight: 19, marginTop: -5 },
  summaryCard: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 15, borderWidth: 1, borderColor: "#e0e7f1", padding: 16, marginTop: 4 },
  summaryCell: { flex: 1, alignItems: "center" },
  summaryValue: { color: "#06432f", fontSize: 24, fontWeight: "800" },
  summaryLabel: { color: "#536579", fontSize: 10, marginTop: 4, textAlign: "center" },
  summaryDivider: { width: 1, backgroundColor: "#e0e7f1", marginHorizontal: 12 },
  disclaimer: { color: "#718096", fontSize: 10, marginTop: -7 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 },
  sectionTitle: { color: "#0b1c30", fontSize: 16, fontWeight: "800" },
  viewAll: { color: "#087c72", fontSize: 12, fontWeight: "800", padding: 6 },
  record: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 13, borderWidth: 1, borderColor: "#e0e7f1", padding: 12, gap: 10 },
  recordIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#d7f8f1", alignItems: "center", justifyContent: "center" },
  recordGlyph: { color: "#087c72", fontSize: 19, fontWeight: "800" },
  recordMain: { flex: 1 },
  recordTitle: { color: "#0b1c30", fontSize: 13, fontWeight: "800" },
  recordMeta: { color: "#536579", fontSize: 10, marginTop: 3 },
  recordDate: { color: "#718096", fontSize: 10, marginTop: 4 },
  statusPill: { backgroundColor: "#e5efff", paddingHorizontal: 7, paddingVertical: 5, borderRadius: 20, maxWidth: 85 },
  statusText: { color: "#06432f", fontSize: 8, fontWeight: "900", textAlign: "center" },
});
