import { useCallback, useState } from "react";
import * as Location from "expo-location";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  Button,
  EmptyState,
  Field,
  LoadingView,
  Screen,
} from "../components/ui.js";
import {
  createSurvey,
  getAssignedVillages,
  getMyAssignments,
  getSurveys,
} from "../services/apiClient.js";

export function SurveyScreen() {
  const [surveys, setSurveys] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    assignmentId: "",
    villageId: "",
    gatNumber: "",
    plotNumber: "",
    notes: "",
  });
  const [location, setLocation] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    Promise.all([getSurveys(), getMyAssignments(), getAssignedVillages()])
      .then(([surveyResponse, assignmentResponse, villageResponse]) => {
        setSurveys({
          items: surveyResponse.data.items,
          assignments: assignmentResponse.data.items,
          villages: villageResponse.data.items,
        });
      })
      .catch((reason) => setError(reason.message));
  }, []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function captureLocation() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert(
        "Location permission required",
        "Enable location access to capture a survey coordinate.",
      );
      return;
    }
    const result = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    setLocation({
      latitude: result.coords.latitude,
      longitude: result.coords.longitude,
      gpsAccuracy: result.coords.accuracy ?? 1,
    });
  }

  async function saveDraft() {
    if (!form.assignmentId || !form.villageId || !form.gatNumber || !location) {
      setError(
        "Assignment, village, Gat number, and GPS location are required.",
      );
      return;
    }
    try {
      await createSurvey({
        ...form,
        ...location,
        plotNumber: form.plotNumber || null,
        notes: form.notes || null,
      });
      setCreating(false);
      setForm({
        assignmentId: "",
        villageId: "",
        gatNumber: "",
        plotNumber: "",
        notes: "",
      });
      setLocation(null);
      load();
    } catch (reason) {
      setError(reason.message);
    }
  }

  if (!surveys && !error) return <LoadingView label="Loading surveys..." />;
  if (error && !surveys)
    return (
      <Screen>
        <EmptyState title="Surveys unavailable" description={error} />
      </Screen>
    );
  if (creating)
    return (
      <Screen>
        <Text
          style={{
            color: "#17352f",
            fontSize: 22,
            fontWeight: "700",
            marginBottom: 18,
          }}
        >
          New field survey
        </Text>
        <Field
          label="Assignment ID"
          value={form.assignmentId}
          onChangeText={(value) => setForm({ ...form, assignmentId: value })}
          autoCapitalize="none"
        />
        <Field
          label="Village ID"
          value={form.villageId}
          onChangeText={(value) => setForm({ ...form, villageId: value })}
          autoCapitalize="none"
        />
        <Field
          label="Gat number"
          value={form.gatNumber}
          onChangeText={(value) => setForm({ ...form, gatNumber: value })}
        />
        <Field
          label="Plot number (optional)"
          value={form.plotNumber}
          onChangeText={(value) => setForm({ ...form, plotNumber: value })}
        />
        <Field
          label="Field notes (optional)"
          value={form.notes}
          onChangeText={(value) => setForm({ ...form, notes: value })}
          multiline
        />
        <Button onPress={captureLocation} variant="secondary">
          {location
            ? `GPS captured (${location.gpsAccuracy.toFixed(1)}m)`
            : "Capture GPS location"}
        </Button>
        <View style={{ height: 12 }} />
        <Button onPress={saveDraft}>Save draft</Button>
        <View style={{ height: 12 }} />
        <Button onPress={() => setCreating(false)} variant="secondary">
          Cancel
        </Button>
        {error ? (
          <Text style={{ color: "#b43e35", marginTop: 12 }}>{error}</Text>
        ) : null}
      </Screen>
    );
  return (
    <Screen>
      <Button onPress={() => setCreating(true)}>Create survey draft</Button>
      <FlatList
        style={{ marginTop: 18 }}
        data={surveys?.items ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            title="No surveys yet"
            description="Create a draft when you begin field work."
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 16,
              marginBottom: 10,
            }}
          >
            <Text style={{ color: "#17352f", fontWeight: "700" }}>
              {item.surveyNumber}
            </Text>
            <Text style={{ color: "#71837a", marginTop: 5 }}>
              Gat {item.gatNumber} · {item.village?.name ?? "Village"}
            </Text>
            <Text style={{ color: "#d26935", marginTop: 5, fontWeight: "700" }}>
              {item.status}
            </Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}
