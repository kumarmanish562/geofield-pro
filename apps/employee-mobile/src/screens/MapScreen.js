import { useCallback, useEffect, useMemo, useState } from "react";
import * as Location from "expo-location";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button, EmptyState, LoadingView, Screen } from "../components/ui.js";
import {
  getTrackingSession,
  getAssignedVillages,
  getAssignedVillageBoundary,
  submitLocationObservation,
} from "../services/apiClient.js";

export function MapScreen() {
  const [session, setSession] = useState(null);
  const [permission, setPermission] = useState(null);
  const [last, setLast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [boundaryLoading, setBoundaryLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [villages, setVillages] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [boundary, setBoundary] = useState(null);
  const [boundaryError, setBoundaryError] = useState("");

  const load = useCallback(async () => {
    try {
      const [tracking, assigned] = await Promise.all([
        getTrackingSession(),
        getAssignedVillages(),
      ]);
      setSession(tracking.data);
      const nextVillages = assigned.data.items ?? [];
      setVillages(nextVillages);
      setSelectedId((current) =>
        current && nextVillages.some((village) => village.id === current)
          ? current
          : nextVillages[0]?.id ?? "",
      );
    } catch (error) {
      if (error.status !== 403 && error.status !== 404)
        Alert.alert("Field map unavailable", error.message);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let active = true;
    if (!selectedId) {
      setBoundary(null);
      setBoundaryError("");
      return undefined;
    }
    setBoundaryLoading(true);
    setBoundaryError("");
    getAssignedVillageBoundary(selectedId)
      .then((result) => {
        if (active) setBoundary(result.data);
      })
      .catch((error) => {
        if (!active) return;
        setBoundary(null);
        setBoundaryError(error.message ?? "Village boundary could not be loaded.");
      })
      .finally(() => active && setBoundaryLoading(false));
    return () => {
      active = false;
    };
  }, [selectedId]);

  async function requestPermission() {
    const result = await Location.requestForegroundPermissionsAsync();
    setPermission(result.status);
    if (result.status !== "granted")
      Alert.alert(
        "Location permission required",
        "Location updates remain off until you grant permission. Collection is limited to an authorized work session.",
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
      setLast({
        ...response.data,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy ?? null,
      });
    } catch (error) {
      Alert.alert("Location update failed", error.message);
    } finally {
      setSending(false);
    }
  }

  const selectedVillage = villages.find((village) => village.id === selectedId);
  if (loading)
    return <LoadingView label="Checking assigned map access..." />;
  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>GEOSPATIAL TOOLS</Text>
        <Text style={styles.title}>Field map</Text>
        <Text style={styles.subtitle}>Assigned village boundaries and authorized location updates.</Text>

        <View style={styles.mapHeader}>
          <View style={styles.mapStatus}>
            <View style={[styles.statusDot, last && styles.statusDotLive]} />
            <Text style={styles.mapStatusText}>{last ? "LOCATION SENT" : "NO NEW LOCATION"}</Text>
          </View>
          {last?.accuracyMeters != null ? (
            <Text style={styles.accuracy}>{Math.round(last.accuracyMeters)} m accuracy</Text>
          ) : null}
        </View>

        {villages.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.villageTabs}>
            {villages.map((village) => (
              <Pressable
                key={village.id}
                onPress={() => setSelectedId(village.id)}
                style={[styles.villageTab, selectedId === village.id && styles.villageTabSelected]}
              >
                <Text style={[styles.villageTabText, selectedId === village.id && styles.villageTabTextSelected]} numberOfLines={1}>
                  {village.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {selectedVillage ? (
          <View style={styles.mapCard}>
            <View style={styles.mapTitleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.mapEyebrow}>ASSIGNED VILLAGE</Text>
                <Text style={styles.villageTitle}>{selectedVillage.name}</Text>
                <Text style={styles.villageMeta}>
                  {[selectedVillage.code, selectedVillage.taluka, selectedVillage.district].filter(Boolean).join(" · ") || "Area details unavailable"}
                </Text>
              </View>
              <Text style={styles.mapNorth}>N ↑</Text>
            </View>
            {boundaryLoading ? (
              <View style={styles.mapLoading}><LoadingView label="Loading village boundary..." /></View>
            ) : boundary?.boundary?.geometry ? (
              <BoundaryPreview
                geometry={boundary.boundary.geometry}
                location={last && { latitude: last.latitude, longitude: last.longitude }}
              />
            ) : (
              <View style={styles.mapEmpty}>
                <View style={styles.mapGrid} />
                <Text style={styles.mapEmptyIcon}>⌖</Text>
                <Text style={styles.mapEmptyTitle}>Boundary geometry unavailable</Text>
                <Text style={styles.mapEmptyText}>{boundaryError || "This assigned village has no boundary geometry to draw."}</Text>
              </View>
            )}
            <View style={styles.legend}>
              <View style={styles.legendItem}><View style={styles.legendLine} /><Text style={styles.legendText}>Village boundary</Text></View>
              {last ? <View style={styles.legendItem}><View style={styles.legendPoint} /><Text style={styles.legendText}>Last submitted location</Text></View> : null}
            </View>
            <Text style={styles.mapFoot}>Boundary from the authorized village record · WGS84 coordinates</Text>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <EmptyState title="No assigned villages" description="Published assignments determine which village records you can access." />
          </View>
        )}

        <View style={styles.sessionCard}>
          <View style={styles.sessionTop}>
            <Text style={styles.sessionTitle}>Location collection</Text>
            <View style={[styles.sessionPill, session ? styles.pillActive : styles.pillInactive]}>
              <Text style={[styles.sessionPillText, session ? styles.pillActiveText : styles.pillInactiveText]}>{session ? "AUTHORIZED" : "NOT ACTIVE"}</Text>
            </View>
          </View>
          <Text style={styles.sessionDescription}>
            {session
              ? "A foreground location update can be sent while this authorized session is active."
              : "A supervisor-authorized tracking session is required before location can be sent."}
          </Text>
          {last ? (
            <View style={styles.locationFacts}>
              <Text style={styles.coordinate}>{Number(last.latitude).toFixed(5)}, {Number(last.longitude).toFixed(5)}</Text>
              <Text style={styles.factMeta}>
                {last.receivedAt ? new Date(last.receivedAt).toLocaleTimeString() : "Submitted just now"}
              </Text>
            </View>
          ) : null}
          <Button onPress={requestPermission} variant="secondary" disabled={!session}>
            {permission === "granted" ? "Location permission granted" : "Allow location access"}
          </Button>
          <View style={{ marginTop: 9 }}>
            <Button loading={sending} onPress={capture} disabled={!session}>
              Send current location  →
            </Button>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function BoundaryPreview({ geometry, location }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const rings = useMemo(() => {
    if (geometry?.type === "Polygon") return geometry.coordinates.slice(0, 1);
    if (geometry?.type === "MultiPolygon")
      return geometry.coordinates.map((polygon) => polygon[0]).filter(Boolean);
    return [];
  }, [geometry]);
  const polygons = useMemo(() => {
    const sampledRings = rings.map((ring) => {
      const step = Math.max(1, Math.ceil(ring.length / 180));
      return ring.filter((_, index) => index % step === 0);
    });
    const all = sampledRings.flat().filter(
      (point) =>
        Array.isArray(point) &&
        Number.isFinite(Number(point[0])) &&
        Number.isFinite(Number(point[1])),
    );
    if (all.length < 3) return null;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const point of all) {
      const longitude = Number(point[0]);
      const latitude = Number(point[1]);
      minX = Math.min(minX, longitude);
      maxX = Math.max(maxX, longitude);
      minY = Math.min(minY, latitude);
      maxY = Math.max(maxY, latitude);
    }
    if (location && Number.isFinite(location.longitude) && Number.isFinite(location.latitude)) {
      minX = Math.min(minX, location.longitude);
      maxX = Math.max(maxX, location.longitude);
      minY = Math.min(minY, location.latitude);
      maxY = Math.max(maxY, location.latitude);
    }
    const spanX = Math.max(maxX - minX, 0.00001);
    const spanY = Math.max(maxY - minY, 0.00001);
    const width = Math.max(1, size.width - 40);
    const height = Math.max(1, size.height - 40);
    const scale = Math.min(width / spanX, height / spanY);
    const usedWidth = spanX * scale;
    const usedHeight = spanY * scale;
    const offsetX = (size.width - usedWidth) / 2;
    const offsetY = (size.height - usedHeight) / 2;
    const project = ([longitude, latitude]) => ({
      x: offsetX + (Number(longitude) - minX) * scale,
      y: size.height - offsetY - (Number(latitude) - minY) * scale,
    });
    const segments = sampledRings.flatMap((sampled, ringIndex) => {
      const points = sampled.map(project);
      if (points.length < 3) return [];
      const closed = [...points, points[0]];
      return closed.slice(1).map((point, index) => {
        const start = closed[index];
        const dx = point.x - start.x;
        const dy = point.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        return {
          id: `${ringIndex}-${index}`,
          left: (point.x + start.x) / 2 - length / 2,
          top: (point.y + start.y) / 2,
          width: length,
          angle: `${(Math.atan2(dy, dx) * 180) / Math.PI}deg`,
        };
      });
    });
    return { segments, project, locationPoint: location ? project([location.longitude, location.latitude]) : null };
  }, [location, rings, size.height, size.width]);

  return (
    <View style={styles.mapCanvas} onLayout={(event) => setSize(event.nativeEvent.layout)}>
      <View pointerEvents="none" style={styles.gridVertical} />
      <View pointerEvents="none" style={styles.gridHorizontal} />
      {polygons?.segments.map((segment) => (
        <View
          key={segment.id}
          style={[
            styles.boundarySegment,
            {
              left: segment.left,
              top: segment.top,
              width: segment.width,
              transform: [{ rotate: segment.angle }],
            },
          ]}
        />
      ))}
      {polygons?.locationPoint ? (
        <View style={[styles.locationMarker, { left: polygons.locationPoint.x - 6, top: polygons.locationPoint.y - 6 }]} />
      ) : null}
      <View style={styles.mapCorner}><Text style={styles.mapCornerText}>WGS84</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0, backgroundColor: "#f4f6ff" },
  content: { padding: 16, paddingBottom: 28, gap: 12 },
  eyebrow: { color: "#087c72", fontSize: 10, fontWeight: "900", letterSpacing: 1.3, marginTop: 4 },
  title: { color: "#06432f", fontSize: 25, fontWeight: "800", marginTop: -5 },
  subtitle: { color: "#536579", fontSize: 12, lineHeight: 18, marginTop: -5 },
  mapHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 2 },
  mapStatus: { flexDirection: "row", alignItems: "center", gap: 7 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#94a3b8" },
  statusDotLive: { backgroundColor: "#087c72" },
  mapStatusText: { color: "#536579", fontFamily: "monospace", fontSize: 9, fontWeight: "800" },
  accuracy: { color: "#075f55", fontFamily: "monospace", fontSize: 9, fontWeight: "700" },
  villageTabs: { gap: 8, paddingRight: 6, paddingVertical: 3 },
  villageTab: { minHeight: 36, maxWidth: 180, justifyContent: "center", borderRadius: 20, backgroundColor: "#e5ebf6", paddingHorizontal: 12 },
  villageTabSelected: { backgroundColor: "#06432f" },
  villageTabText: { color: "#536579", fontSize: 10, fontWeight: "700" },
  villageTabTextSelected: { color: "#fff" },
  mapCard: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e0e7f1", padding: 12 },
  mapTitleRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 3, paddingBottom: 11 },
  mapEyebrow: { color: "#087c72", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  villageTitle: { color: "#0b1c30", fontSize: 16, fontWeight: "800", marginTop: 3 },
  villageMeta: { color: "#536579", fontSize: 10, marginTop: 4 },
  mapNorth: { color: "#075f55", fontFamily: "monospace", fontSize: 10, fontWeight: "800" },
  mapLoading: { height: 280, alignItems: "center", justifyContent: "center", backgroundColor: "#edf3ff", borderRadius: 11 },
  mapCanvas: { height: 280, overflow: "hidden", borderRadius: 11, backgroundColor: "#edf3ff" },
  gridVertical: { ...StyleSheet.absoluteFillObject, borderLeftWidth: 1, borderRightWidth: 1, borderColor: "#dce8ff", marginHorizontal: "12%" },
  gridHorizontal: { ...StyleSheet.absoluteFillObject, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#dce8ff", marginVertical: "12%" },
  boundarySegment: { position: "absolute", height: 2, backgroundColor: "#087c72", opacity: 0.9 },
  locationMarker: { position: "absolute", width: 12, height: 12, borderRadius: 7, borderWidth: 2, borderColor: "#fff", backgroundColor: "#c2410c" },
  mapCorner: { position: "absolute", right: 8, bottom: 8, backgroundColor: "#fff", borderRadius: 4, paddingHorizontal: 7, paddingVertical: 5 },
  mapCornerText: { color: "#536579", fontFamily: "monospace", fontSize: 8, fontWeight: "700" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 13, paddingHorizontal: 4, paddingTop: 11 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendLine: { width: 16, height: 2, backgroundColor: "#087c72" },
  legendPoint: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#c2410c" },
  legendText: { color: "#536579", fontSize: 9 },
  mapFoot: { color: "#718096", fontFamily: "monospace", fontSize: 8, lineHeight: 13, marginTop: 8, paddingHorizontal: 4 },
  mapEmpty: { height: 250, justifyContent: "center", alignItems: "center", overflow: "hidden", borderRadius: 11, backgroundColor: "#edf3ff", padding: 20 },
  mapGrid: { ...StyleSheet.absoluteFillObject, borderWidth: 1, borderColor: "#dce8ff", margin: 16 },
  mapEmptyIcon: { color: "#087c72", fontSize: 30, marginBottom: 8 },
  mapEmptyTitle: { color: "#0b1c30", fontSize: 13, fontWeight: "800", textAlign: "center" },
  mapEmptyText: { color: "#536579", fontSize: 10, lineHeight: 15, textAlign: "center", marginTop: 5 },
  emptyCard: { borderRadius: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e7f1" },
  sessionCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e7f1", borderRadius: 15, padding: 14 },
  sessionTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  sessionTitle: { color: "#0b1c30", fontSize: 14, fontWeight: "800" },
  sessionPill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 5 },
  pillActive: { backgroundColor: "#d7f8f1" },
  pillInactive: { backgroundColor: "#e5ebf6" },
  sessionPillText: { fontFamily: "monospace", fontSize: 8, fontWeight: "900" },
  pillActiveText: { color: "#075f55" },
  pillInactiveText: { color: "#536579" },
  sessionDescription: { color: "#536579", fontSize: 11, lineHeight: 16, marginTop: 7, marginBottom: 12 },
  locationFacts: { backgroundColor: "#edf3ff", borderRadius: 9, padding: 10, marginBottom: 12, gap: 4 },
  coordinate: { color: "#0b1c30", fontFamily: "monospace", fontSize: 11, fontWeight: "700" },
  factMeta: { color: "#536579", fontSize: 9 },
});
