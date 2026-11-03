import { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Button, EmptyState, LoadingView, Screen } from "../components/ui.js";
import {
  getSurveyReview,
  getSurveyReviewHistory,
  resubmitSurvey,
} from "../services/apiClient.js";

export function SurveyReviewScreen({ route, navigation }) {
  const { surveyId } = route.params;
  const [survey, setSurvey] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const load = useCallback(async () => {
    try {
      setError("");
      const [surveyResponse, historyResponse] = await Promise.all([
        getSurveyReview(surveyId),
        getSurveyReviewHistory(surveyId),
      ]);
      setSurvey(surveyResponse.data);
      setHistory(historyResponse.data);
    } catch (reason) {
      setError(reason.message);
    }
  }, [surveyId]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  if (error)
    return (
      <Screen>
        <EmptyState title="Review unavailable" description={error} />
      </Screen>
    );
  if (!survey) return <LoadingView label="Loading review..." />;
  async function resubmit() {
    Alert.alert("Resubmit survey", "Submit the corrected survey for review?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Resubmit",
        onPress: async () => {
          setWorking(true);
          try {
            await resubmitSurvey(survey.id);
            await load();
          } catch (reason) {
            setError(reason.message);
          } finally {
            setWorking(false);
          }
        },
      },
    ]);
  }
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <Screen style={styles.screen}>
        <Text style={styles.eyebrow}>FIELD REVIEW</Text>
        <Text style={styles.title}>
          {survey.surveyNumber}
        </Text>
        <Text style={styles.subtitle}>Review status and submission history</Text>
        <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>CURRENT STATUS</Text>
        <Text style={styles.status}>
          {survey.status}
        </Text>
        {survey.village?.name ? <Text style={styles.village}>{survey.village.name}{survey.gatNumber ? ` · Gat ${survey.gatNumber}` : ""}</Text> : null}
        </View>
        {survey.status === "CORRECTION_REQUIRED" ? (
          <View
            style={{
              backgroundColor: "#fff4df",
              padding: 14,
              borderRadius: 10,
              marginTop: 14,
              borderWidth: 1,
              borderColor: "#f1d6a8",
            }}
          >
            <Text style={{ color: "#7a4d16", fontWeight: "700" }}>
              Correction instructions
            </Text>
            <Text style={{ color: "#7a4d16", marginTop: 6 }}>
              {history
                .filter((item) => item.action === "REQUEST_CORRECTION")
                .at(-1)?.reviewNotes ?? "Review the comments below."}
            </Text>
            <Button
              onPress={() =>
                navigation.navigate("Survey", { surveyId: survey.id })
              }
              variant="secondary"
            >
              Edit survey
            </Button>
            <Button onPress={resubmit} loading={working}>
              Resubmit
            </Button>
          </View>
        ) : null}
        <View style={styles.historyHeading}><Text style={styles.sectionTitle}>Submission history</Text><Text style={styles.historyCount}>{history.length} events</Text></View>
        <View style={styles.historyCard}>
        {history.map((item) => (
          <View
            key={item.id}
            style={{
              backgroundColor: "#fff",
              padding: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#e8edf5",
            }}
          >
            <Text style={{ color: "#06432f", fontWeight: "700" }}>
              {item.action}
            </Text>
            <Text style={{ color: "#536579", marginTop: 4 }}>
              {item.previousStatus ?? "—"} →{" "}
              {item.newStatus ?? item.reviewStatus}
            </Text>
            <Text style={{ color: "#35465b", marginTop: 4 }}>
              {item.reviewNotes || "No comments."}
            </Text>
            <Text style={{ color: "#536579", marginTop: 4 }}>
              {item.reviewer?.name || "Employee"} ·{" "}
              {new Date(item.reviewedAt).toLocaleString()}
            </Text>
          </View>
        ))}
        {!history.length ? <Text style={styles.noHistory}>No review events are available yet.</Text> : null}
        </View>
      </Screen>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 14, backgroundColor: "#f4f6ff" },
  eyebrow: { color: "#087c72", fontSize: 10, fontWeight: "900", letterSpacing: 1.3 },
  title: { color: "#06432f", fontSize: 23, fontWeight: "800", marginTop: 4 },
  subtitle: { color: "#536579", fontSize: 11, marginTop: 4, marginBottom: 12 },
  statusCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e7f1", borderRadius: 14, padding: 14 },
  statusLabel: { color: "#536579", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  status: { color: "#087c72", fontSize: 15, fontWeight: "800", marginTop: 6 },
  village: { color: "#536579", fontSize: 10, marginTop: 5 },
  historyHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 8 },
  sectionTitle: { color: "#0b1c30", fontWeight: "800", fontSize: 15 },
  historyCount: { color: "#536579", fontSize: 9, fontFamily: "monospace" },
  historyCard: { overflow: "hidden", backgroundColor: "#fff", borderRadius: 13, borderWidth: 1, borderColor: "#e0e7f1" },
  noHistory: { color: "#536579", padding: 14, fontSize: 11 },
});
