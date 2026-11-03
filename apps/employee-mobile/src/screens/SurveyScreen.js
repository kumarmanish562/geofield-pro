import { useCallback, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
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
  resubmitSurvey,
  submitSurvey,
  updateSurvey,
  uploadSurveyPhoto,
} from "../services/apiClient.js";
import { enqueueSurvey, getDrafts } from "../services/offlineStore";
import { synchronizeOfflineData } from "../services/syncEngine.js";
import { useNetwork } from "../context/NetworkContext.js";

const initialForm = {
  assignmentId: "",
  villageId: "",
  gatNumber: "",
  plotNumber: "",
  notes: "",
};

export function SurveyScreen({ navigation, route }) {
  const online = useNetwork();
  const [data, setData] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [location, setLocation] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState(null);

  const load = useCallback(() => {
    setError("");
    Promise.all([getSurveys(), getMyAssignments(), getAssignedVillages()])
      .then(([surveyResponse, assignmentResponse, villageResponse]) => {
        const nextData = {
          items: surveyResponse.data.items,
          assignments: assignmentResponse.data.items,
          villages: villageResponse.data.items,
        };
        setData(nextData);
        const existing = route?.params?.surveyId
          ? nextData.items.find((item) => item.id === route.params.surveyId)
          : null;
        if (existing) {
          setForm({
            assignmentId: existing.assignmentId,
            villageId: existing.villageId,
            gatNumber: existing.gatNumber,
            plotNumber: existing.plotNumber ?? "",
            notes: existing.notes ?? "",
          });
          setLocation(
            existing.latitude === null || existing.longitude === null
              ? null
              : {
                  latitude: existing.latitude,
                  longitude: existing.longitude,
                  gpsAccuracy: existing.gpsAccuracy,
                },
          );
          setDraft({ ...existing, serverSurveyId: existing.id });
          setCreating(true);
        }
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
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    setLocation({
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
      gpsAccuracy: current.coords.accuracy ?? 1,
    });
  }

  async function addPhoto(useCamera) {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert(
        "Photo permission required",
        "Allow photo access to attach survey evidence.",
      );
      return;
    }
    const picker = useCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;
    const picked = await picker({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: !useCamera,
      selectionLimit: 5 - photos.length,
    });
    if (!picked.canceled)
      setPhotos((current) =>
        [
          ...current,
          ...picked.assets.map((asset) => ({
            ...asset,
            clientAttachmentId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          })),
        ].slice(0, 5),
      );
  }

  async function saveDraft() {
    if (!form.assignmentId || !form.villageId || !form.gatNumber) {
      setError("Assignment, village, and Gat number are required.");
      return;
    }
    setWorking(true);
    setError("");
    try {
      const payload = {
        ...form,
        ...location,
        plotNumber: form.plotNumber || null,
        notes: form.notes || null,
      };
      if (draft?.serverSurveyId) {
        await updateSurvey(draft.serverSurveyId, payload);
        setDraft({ ...draft, ...payload });
        setResult(null);
        return;
      }
      const queued = enqueueSurvey(payload);
      setDraft({
        ...payload,
        id: queued.clientSurveyId,
        clientOnly: true,
        status: "PENDING_SYNC",
      });
      if (online) await synchronizeOfflineData();
      setResult(null);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setWorking(false);
    }
  }

  async function submitDraft() {
    if (!draft) return;
    if (!location) {
      setError("Capture a GPS location before submitting.");
      return;
    }
    Alert.alert(
      "Submit survey",
      "Submitted surveys cannot be edited. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          onPress: async () => {
            setWorking(true);
            setError("");
            try {
              let serverSurveyId = draft.serverSurveyId;
              if (draft.clientOnly) {
                await synchronizeOfflineData();
                const synced = getDrafts().find(
                  (item) => item.client_survey_id === draft.id,
                );
                serverSurveyId = synced?.server_survey_id;
              }
              if (!serverSurveyId)
                throw new Error(
                  "Connect to the internet and synchronize this draft before submitting.",
                );
              await updateSurvey(serverSurveyId, {
                latitude: location.latitude,
                longitude: location.longitude,
                gpsAccuracy: location.gpsAccuracy,
              });
              for (const photo of photos)
                await uploadSurveyPhoto(
                  serverSurveyId,
                  photo,
                  photo.clientAttachmentId,
                );
              const response =
                draft.status === "CORRECTION_REQUIRED"
                  ? await resubmitSurvey(serverSurveyId)
                  : await submitSurvey(serverSurveyId);
              setResult(response.data);
              setCreating(false);
              setDraft(null);
              setPhotos([]);
              setLocation(null);
              setForm(initialForm);
              load();
            } catch (reason) {
              setError(reason.message);
            } finally {
              setWorking(false);
            }
          },
        },
      ],
    );
  }

  if (!data && !error) return <LoadingView label="Loading surveys..." />;
  if (error && !data)
    return (
      <Screen>
        <EmptyState title="Surveys unavailable" description={error} />
      </Screen>
    );

  if (creating) {
    const selectedAssignment = data.assignments.find(
      (item) => item.id === form.assignmentId,
    );
    const selectedVillage = data.villages.find(
      (item) => item.id === form.villageId,
    );
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Screen>
          <Text
            style={{
              color: "#06432f",
              fontSize: 22,
              fontWeight: "700",
              marginBottom: 18,
            }}
          >
            New field survey
          </Text>
          <Text
            style={{ color: "#35465b", fontWeight: "700", marginBottom: 8 }}
          >
            Authorized assignment
          </Text>
          {data.assignments.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setForm({ ...form, assignmentId: item.id })}
              style={{
                padding: 12,
                marginBottom: 6,
                borderRadius: 9,
                backgroundColor:
                  item.id === form.assignmentId ? "#dcecdf" : "#fff",
              }}
            >
              <Text style={{ color: "#06432f" }}>{item.name}</Text>
            </Pressable>
          ))}
          <Text
            style={{ color: "#35465b", fontWeight: "700", marginVertical: 8 }}
          >
            Authorized village
          </Text>
          {data.villages.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setForm({ ...form, villageId: item.id })}
              style={{
                padding: 12,
                marginBottom: 6,
                borderRadius: 9,
                backgroundColor:
                  item.id === form.villageId ? "#dcecdf" : "#fff",
              }}
            >
              <Text style={{ color: "#06432f" }}>
                {item.name} ({item.code})
              </Text>
            </Pressable>
          ))}
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
          <View style={{ height: 10 }} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button onPress={() => addPhoto(true)} variant="secondary">
              Take photo
            </Button>
            <Button onPress={() => addPhoto(false)} variant="secondary">
              Choose photos
            </Button>
          </View>
          <ScrollView horizontal style={{ marginVertical: 12 }}>
            {photos.map((photo) => (
              <Image
                key={photo.uri}
                source={{ uri: photo.uri }}
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 8,
                  marginRight: 8,
                }}
              />
            ))}
          </ScrollView>
          {draft ? (
            <>
              <Text style={{ color: "#35465b", marginBottom: 8 }}>
                Draft saved: {draft.surveyNumber} ({draft.status})
              </Text>
              <Button onPress={submitDraft} loading={working}>
                Submit survey
              </Button>
            </>
          ) : (
            <Button onPress={saveDraft} loading={working}>
              Save draft
            </Button>
          )}
          <View style={{ height: 10 }} />
          <Button onPress={() => setCreating(false)} variant="secondary">
            Cancel
          </Button>
          {error ? (
            <Text style={{ color: "#b42318", marginTop: 12 }}>{error}</Text>
          ) : null}
          <Text style={{ color: "#536579", marginTop: 14 }}>
            Selected: {selectedAssignment?.name ?? "No assignment"} ·{" "}
            {selectedVillage?.name ?? "No village"}
          </Text>
        </Screen>
      </ScrollView>
    );
  }

  return (
    <Screen>
      {result ? (
        <View
          style={{
            backgroundColor: "#dcecdf",
            padding: 14,
            borderRadius: 10,
            marginBottom: 14,
          }}
        >
          <Text style={{ color: "#06432f", fontWeight: "700" }}>
            Survey submitted successfully
          </Text>
          <Text style={{ color: "#35465b", marginTop: 4 }}>
            {result.surveyNumber} · {result.status}
          </Text>
        </View>
      ) : null}
      <Button
        onPress={() => {
          setCreating(true);
          setError("");
        }}
      >
        Create survey draft
      </Button>
      <FlatList
        style={{ marginTop: 18 }}
        data={data?.items ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            title="No surveys yet"
            description="Create a draft when you begin field work."
          />
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 16,
              marginBottom: 10,
            }}
          >
            <Text style={{ color: "#06432f", fontWeight: "700" }}>
              {item.surveyNumber}
            </Text>
            <Text style={{ color: "#536579", marginTop: 5 }}>
              Gat {item.gatNumber} · {item.village?.name ?? "Village"}
            </Text>
            <Text style={{ color: "#087c72", marginTop: 5, fontWeight: "700" }}>
              {item.status}
            </Text>
            <Button
              onPress={() =>
                navigation.navigate("SurveyReview", { surveyId: item.id })
              }
              variant="secondary"
            >
              View review
            </Button>
          </View>
        )}
      />
    </Screen>
  );
}
