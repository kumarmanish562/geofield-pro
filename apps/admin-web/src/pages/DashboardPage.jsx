import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ClipboardCheck,
  MapPinned,
  Map as MapIcon,
  Users,
  ArrowUpRight,
  Wifi,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import apiClient from "../services/apiClient.js";

export function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [summary, setSummary] = useState(null);
  const [surveys, setSurveys] = useState([]);
  useEffect(() => {
    Promise.all([
      apiClient.get("/admin/surveys/stats"),
      apiClient.get("/reports/surveys/summary"),
      apiClient.get("/admin/surveys", {
        params: { page: 1, pageSize: 8, status: "SUBMITTED" },
      }),
    ])
      .then(([statsResponse, summaryResponse, surveysResponse]) => {
        setStats(statsResponse.data.data);
        setSummary(summaryResponse.data.data);
        setSurveys(surveysResponse.data.data.items);
      })
      .catch(() => toast.error("Some dashboard metrics are unavailable."));
  }, []);
  const metrics = [
    [
      "Total surveys",
      stats?.total ?? "—",
      "All recorded field submissions",
      Activity,
    ],
    [
      "Pending review",
      summary?.pending ?? "—",
      "Needs reviewer attention",
      ClipboardCheck,
    ],
    [
      "Approved surveys",
      summary?.approved ?? "—",
      "Accepted by reviewers",
      Users,
    ],
    [
      "Correction required",
      summary?.correctionRequired ?? "—",
      "Returned to employees",
      MapPinned,
    ],
  ];
  const points = useMemo(
    () =>
      surveys.filter(
        (survey) =>
          Number.isFinite(survey.latitude) && Number.isFinite(survey.longitude),
      ),
    [surveys],
  );
  return (
    <>
      <PageHeader
        title="Operations overview"
        description="Monitor field activity, survey quality, and review workload."
        action={
          <div className="dashboard-live-status">
            <Wifi size={15} /> Systems operational
          </div>
        }
      />
      <section className="metric-grid">
        {metrics.map(([label, value, hint, Icon]) => (
          <article className="metric-card" key={label}>
            <div className="metric-icon">
              <Icon size={19} />
            </div>
            <span>{label}</span>
            <strong>{values[label] ?? value}</strong>
            <small>{hint}</small>
          </article>
        ))}
      </section>
      <section className="dashboard-grid dashboard-grid-primary">
        <div className="panel map-preview-panel">
          <div className="panel-heading">
            <div>
              <h3>Survey coverage map</h3>
              <p>Latest submitted points across your organization.</p>
            </div>
            <Link className="panel-link" to="/live-map">
              Open GIS map <ArrowUpRight size={15} />
            </Link>
          </div>
          {points.length ? (
            <MapContainer
              center={[points[0].latitude, points[0].longitude]}
              zoom={11}
              className="dashboard-map"
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {points.map((survey) => (
                <CircleMarker
                  key={survey.id}
                  center={[survey.latitude, survey.longitude]}
                  radius={7}
                  pathOptions={{
                    color: "#2563eb",
                    fillColor: "#60a5fa",
                    fillOpacity: 0.8,
                  }}
                >
                  <Popup>
                    {survey.surveyNumber} · {survey.village?.name}
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          ) : (
            <EmptyState
              icon={MapIcon}
              title="No mapped survey points yet"
              description="GPS-enabled submissions will appear on the operational map."
            />
          )}
        </div>
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h3>Review queue</h3>
              <p>Submissions waiting for action.</p>
            </div>
            <Link className="panel-link" to="/surveys">
              View all <ArrowUpRight size={15} />
            </Link>
          </div>
          {surveys.length ? (
            surveys.slice(0, 5).map((survey) => (
              <Link
                className="review-row"
                to={`/surveys/${survey.id}`}
                key={survey.id}
              >
                <span className="review-dot" />
                <span>
                  <strong>{survey.surveyNumber}</strong>
                  <small>
                    {survey.employee?.name} · {survey.village?.name}
                  </small>
                </span>
                <ArrowUpRight size={15} />
              </Link>
            ))
          ) : (
            <EmptyState
              title="Queue is clear"
              description="New submissions will appear here."
            />
          )}
        </div>
      </section>
      <section className="dashboard-grid dashboard-grid-secondary">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h3>Village coverage</h3>
              <p>Survey volume by operational area.</p>
            </div>
            <Link className="panel-link" to="/reports">
              Reports <ArrowUpRight size={15} />
            </Link>
          </div>
          {summary?.villageWise?.length ? (
            summary.villageWise.slice(0, 6).map((row) => (
              <div className="progress-row" key={row.name}>
                <div>
                  <span>{row.name}</span>
                  <strong>{row.count}</strong>
                </div>
                <div className="progress-track">
                  <span
                    style={{ width: `${Math.min(100, row.count * 10)}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              title="No village activity"
              description="Village statistics will populate after survey submissions."
            />
          )}
        </div>
        <div className="panel quick-actions-panel">
          <div className="panel-heading">
            <div>
              <h3>Quick actions</h3>
              <p>Common operational tasks.</p>
            </div>
          </div>
          <Link to="/employees">
            <Users size={17} /> Manage employees <ArrowUpRight size={15} />
          </Link>
          <Link to="/assignments">
            <ClipboardCheck size={17} /> Create assignment{" "}
            <ArrowUpRight size={15} />
          </Link>
          <Link to="/reports">
            <Activity size={17} /> Open reports <ArrowUpRight size={15} />
          </Link>
        </div>
      </section>
    </>
  );
}
