import { useEffect, useState } from "react";
import { Activity, ClipboardCheck, MapPinned, Users } from "lucide-react";
import { toast } from "react-hot-toast";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import apiClient from "../services/apiClient.js";

const metrics = [
  [
    "Active employees",
    "—",
    "Connect an employee endpoint to populate this card.",
    Users,
  ],
  [
    "Open assignments",
    "—",
    "Assignment metrics will appear here.",
    ClipboardCheck,
  ],
  [
    "Villages mapped",
    "—",
    "Village data is ready for the GIS phase.",
    MapPinned,
  ],
  ["Submitted surveys", "—", "Survey activity will appear here.", Activity],
];

export function DashboardPage() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    apiClient
      .get("/admin/surveys/stats")
      .then(({ data }) => setStats(data.data))
      .catch(() => toast.error("Survey metrics are currently unavailable."));
  }, []);
  const values = {
    "Submitted surveys": stats?.submitted ?? "—",
  };
  return (
    <>
      <PageHeader
        title="Good morning"
        description="Here is the latest operational snapshot for your organization."
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
      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h3>Recent activity</h3>
              <p>Latest updates from your field operations.</p>
            </div>
          </div>
          <EmptyState
            title="No activity yet"
            description="Activity will appear when your team starts working."
          />
        </div>
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h3>Quick actions</h3>
              <p>Common workspace tasks.</p>
            </div>
          </div>
          <div className="quick-actions">
            <a href="/employees">Add employees</a>
            <a href="/assignments">Create assignment</a>
            <a href="/reports">View reports</a>
          </div>
        </div>
      </section>
    </>
  );
}
