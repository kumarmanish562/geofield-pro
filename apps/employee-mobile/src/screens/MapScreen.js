import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";
import { Alert, ScrollView, Text, View } from "react-native";
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
    <Screen style={{ padding: 0, backgroundColor: "#f4f6ff" }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
      <Text style={{ color: "#087c72", fontSize: 10, fontWeight: "900", letterSpacing: 1.3 }}>GEOSPATIAL TOOLS</Text>
      <Text style={{ color: "#0b1c30", fontSize: 25, fontWeight: "800", marginTop: 4 }}>Field map</Text>
      <Text style={{ color: "#536579", lineHeight: 19, marginTop: 5 }}>Assigned village access and authorized location updates.</Text>
      <View style={{ backgroundColor: "#06432f", borderRadius: 16, padding: 16, marginTop: 16, marginBottom: 4 }}>
        <Text style={{ color: "#baf2e5", fontSize: 10, fontWeight: "900", letterSpacing: 1 }}>LOCATION COLLECTION</Text>
        <Text style={{ color: "#fff", fontSize: 17, fontWeight: "800", marginTop: 8 }}>{session ? "Authorized session available" : "No active tracking session"}</Text>
        <Text style={{ color: "#d5e9df", fontSize: 12, lineHeight: 18, marginTop: 5 }}>{session ? "A location update can be sent while this session remains active." : "Location is collected only during a supervisor-authorized session."}</Text>
      </View>
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
              borderWidth: 1,
              borderColor: "#e0e7f1",
            }}
          >
            <Text style={{ color: "#087c72", fontWeight: "800" }}>
              {village.name}
            </Text>
            <Text style={{ color: "#536579", marginTop: 4 }}>
              {village.code} · {village.district || "District unavailable"} ·{" "}
              {village.taluka || "Taluka unavailable"}
            </Text>
            <Text style={{ color: "#536579", marginTop: 4 }}>
              Village boundaries are supplied through the authorized assignment service.
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
          <Text style={{ color: "#0b1c30", fontSize: 19, fontWeight: "800", marginTop: 20 }}>
            Authorized tracking
          </Text>
          <Text style={{ color: "#536579", marginTop: 8 }}>
            Location is collected only while this session is active.
          </Text>
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 18,
              marginVertical: 22,
              borderWidth: 1,
              borderColor: "#e0e7f1",
            }}
          >
            <Text style={{ color: "#087c72", fontWeight: "800" }}>
              Session active
            </Text>
            <Text style={{ color: "#536579", marginTop: 8 }}>
              Permission: {permission ?? "not requested"}
            </Text>
            <Text style={{ color: "#536579", marginTop: 5 }}>
              Last update:{" "}
              {last
                ? new Date(last.receivedAt).toLocaleTimeString()
                : "Not sent"}
            </Text>
            {last?.accuracyMeters && (
              <Text style={{ color: "#536579", marginTop: 5 }}>
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
          <Text style={{ color: "#536579", marginTop: 18, lineHeight: 21 }}>
            This foreground update is optional and does not run after the app is
            suspended. Background tracking requires additional platform review
            and will be enabled only with explicit policy and permissions.
          </Text>
        </>
      )}
      </ScrollView>
    </Screen>
  );
}
