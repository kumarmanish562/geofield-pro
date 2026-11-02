import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";
import { Alert, Text, View } from "react-native";
import { Button, EmptyState, LoadingView, Screen } from "../components/ui.js";
import {
  getTrackingSession,
  getAssignedVillages,
  submitLocationObservation,
} from "../services/apiClient.js";

export function MapScreen() {
  const [session, setSession] = useState(null);
  const [permission, setPermission] = useState(null);
  const [last, setLast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [villages, setVillages] = useState([]);

  const load = useCallback(async () => {
    try {
      const [tracking, assigned] = await Promise.all([
        getTrackingSession(),
        getAssignedVillages(),
      ]);
      setSession(tracking.data);
      setVillages(assigned.data.items ?? []);
    } catch (error) {
      Alert.alert("Tracking unavailable", error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function requestPermission() {
    const result = await Location.requestForegroundPermissionsAsync();
    setPermission(result.status);
    if (result.status !== "granted")
      Alert.alert(
        "Location permission required",
        "Tracking stays off until you grant permission. Location is collected only during an authorized session.",
      );
  }

  async function capture() {
    setSending(true);
    try {
      if (!session) return;
      const currentPermission =
        permission ?? (await Location.getForegroundPermissionsAsync()).status;
      if (currentPermission !== "granted") return requestPermission();
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const eventId = `location-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const response = await submitLocationObservation({
        eventId,
        sessionId: session.id,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy ?? undefined,
        capturedAt: new Date(position.timestamp).toISOString(),
      });
      setLast(response.data);
    } catch (error) {
      Alert.alert("Location update failed", error.message);
    } finally {
      setSending(false);
    }
  }

  if (loading)
    return <LoadingView label="Checking tracking authorization..." />;
  return (
    <Screen>
      <Text style={{ color: "#17352f", fontSize: 26, fontWeight: "800" }}>
        Assigned villages
      </Text>
      {villages.length === 0 ? (
        <EmptyState
          title="No assigned villages"
          description="Published assignments determine which village boundaries you can access."
        />
      ) : (
        villages.map((village) => (
          <View
            key={village.id}
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 16,
              marginTop: 12,
            }}
          >
            <Text style={{ color: "#28564b", fontWeight: "800" }}>
              {village.name}
            </Text>
            <Text style={{ color: "#71837a", marginTop: 4 }}>
              {village.code} · {village.district || "District unavailable"} ·{" "}
              {village.taluka || "Taluka unavailable"}
            </Text>
            <Text style={{ color: "#71837a", marginTop: 4 }}>
              Boundary: available from the authorized village service
            </Text>
          </View>
        ))
      )}
      {!session ? (
        <View style={{ marginTop: 20 }}>
          <EmptyState
            title="Tracking is not active"
            description="Your supervisor must authorize an active tracking session before location collection can begin."
          />
        </View>
      ) : null}
      {!session ? null : (
        <>
          <Text style={{ color: "#17352f", fontSize: 26, fontWeight: "800" }}>
            Authorized tracking
          </Text>
          <Text style={{ color: "#71837a", marginTop: 8 }}>
            Location is collected only while this session is active.
          </Text>
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 18,
              marginVertical: 22,
            }}
          >
            <Text style={{ color: "#28564b", fontWeight: "800" }}>
              Session active
            </Text>
            <Text style={{ color: "#71837a", marginTop: 8 }}>
              Permission: {permission ?? "not requested"}
            </Text>
            <Text style={{ color: "#71837a", marginTop: 5 }}>
              Last update:{" "}
              {last
                ? new Date(last.receivedAt).toLocaleTimeString()
                : "Not sent"}
            </Text>
            {last?.accuracyMeters && (
              <Text style={{ color: "#71837a", marginTop: 5 }}>
                Accuracy: {last.accuracyMeters}m
              </Text>
            )}
          </View>
          <Button onPress={requestPermission} variant="secondary">
            Request permission
          </Button>
          <View style={{ marginTop: 12 }}>
            <Button loading={sending} onPress={capture}>
              Send current location
            </Button>
          </View>
          <Text style={{ color: "#71837a", marginTop: 18, lineHeight: 21 }}>
            This foreground update is optional and does not run after the app is
            suspended. Background tracking requires additional platform review
            and will be enabled only with explicit policy and permissions.
          </Text>
        </>
      )}
    </Screen>
  );
}
