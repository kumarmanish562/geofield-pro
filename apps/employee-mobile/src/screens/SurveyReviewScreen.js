import { useCallback, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
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
      <Screen>
        <Text style={{ color: "#06432f", fontSize: 22, fontWeight: "700" }}>
          {survey.surveyNumber}
        </Text>
        <Text style={{ color: "#087c72", fontWeight: "700", marginTop: 8 }}>
          {survey.status}
        </Text>
        {survey.status === "CORRECTION_REQUIRED" ? (
          <View
            style={{
              backgroundColor: "#fff4df",
              padding: 14,
              borderRadius: 10,
              marginTop: 14,
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
        <Text style={{ color: "#35465b", fontWeight: "700", marginTop: 20 }}>
          Submission history
        </Text>
        {history.map((item) => (
          <View
            key={item.id}
            style={{
              backgroundColor: "#fff",
              borderRadius: 10,
              padding: 12,
              marginTop: 8,
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
      </Screen>
    </ScrollView>
  );
}
