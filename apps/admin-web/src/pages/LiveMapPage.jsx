import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import apiClient, {
  getAccessToken,
  getApiErrorMessage,
} from "../services/apiClient.js";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { LoadingState } from "../components/ui/LoadingState.jsx";
import { toast } from "react-hot-toast";

const apiBase =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1";
const socketBase = apiBase.replace(/\/api\/v1$/, "");

export function LiveMapPage() {
  const [locations, setLocations] = useState([]);
  const [connection, setConnection] = useState("disconnected");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  async function load() {
    try {
      const { data } = await apiClient.get("/admin/locations/latest");
      setLocations(data.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const socket = io(socketBase, {
      auth: { token: getAccessToken() },
      transports: ["websocket"],
    });
    socket.on("connect", () => setConnection("connected"));
    socket.on("disconnect", () => setConnection("disconnected"));
    socket.on("connect_error", () => setConnection("reconnecting"));
    socket.on("location:observation.created.v1", (location) =>
      setLocations((current) => [
        location,
        ...current.filter((item) => item.employeeId !== location.employeeId),
      ]),
    );
    return () => socket.disconnect();
  }, []);

  const filtered = useMemo(
    () =>
      locations.filter((item) =>
        item.employeeName?.toLowerCase().includes(query.toLowerCase()),
      ),
    [locations, query],
  );
  const active = locations.filter((item) => item.freshness === "ACTIVE").length;
  const stale = locations.filter((item) => item.freshness === "STALE").length;
  const center = filtered[0]
    ? [Number(filtered[0].latitude), Number(filtered[0].longitude)]
    : [21.2514, 81.6296];

  return (
    <>
      <PageHeader
        title="Live map"
        description="Monitor authorized employee locations and freshness."
      />
      <div className="metrics-grid live-metrics">
        <div className="metric-card panel">
          <span className="metric-label">Recent locations</span>
          <strong className="metric-value">{active}</strong>
        </div>
        <div className="metric-card panel">
          <span className="metric-label">Stale locations</span>
          <strong className="metric-value">{stale}</strong>
        </div>
        <div className="metric-card panel">
          <span className="metric-label">Connection</span>
          <strong className="metric-value">{connection}</strong>
        </div>
      </div>
      <div className="live-map-layout">
        <section className="panel map-panel">
          {loading ? (
            <LoadingState label="Loading locations..." />
          ) : (
            <MapContainer center={center} zoom={13} className="live-map">
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filtered.map((item) => (
                <CircleMarker
                  key={item.id}
                  center={[Number(item.latitude), Number(item.longitude)]}
                  radius={item.freshness === "ACTIVE" ? 9 : 7}
                  pathOptions={{
                    color: item.freshness === "ACTIVE" ? "#247449" : "#b43e35",
                  }}
                >
                  <Popup>
                    <strong>{item.employeeName}</strong>
                    <br />
                    {item.freshness}
                    <br />
                    Accuracy: {item.accuracyMeters ?? "unknown"}m
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          )}
        </section>
        <aside className="panel location-sidebar">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search employees"
            aria-label="Search employees"
          />
          {filtered.length === 0 ? (
            <EmptyState
              title="No locations"
              description="Authorized location observations will appear here."
            />
          ) : (
            filtered.map((item) => (
              <div className="location-item" key={item.id}>
                <strong>{item.employeeName}</strong>
                <span>
                  {item.freshness} · {item.freshnessAgeSeconds}s ago
                </span>
                <span>
                  {Number(item.latitude).toFixed(5)},{" "}
                  {Number(item.longitude).toFixed(5)}
                </span>
              </div>
            ))
          )}
        </aside>
      </div>
    </>
  );
}
