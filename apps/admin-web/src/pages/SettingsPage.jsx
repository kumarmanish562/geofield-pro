import { Bell, Building2, CircleUserRound, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { useAuth } from "../features/auth/AuthContext.jsx";

export function SettingsPage() {
  const { user } = useAuth();
  const initials = user?.name
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="settings-page">
      <PageHeader
        title="Workspace settings"
        description="Manage your account details and notification preferences."
      />
      <section className="settings-profile panel">
        <div className="settings-avatar">{initials || <CircleUserRound size={24} />}</div>
        <div className="settings-profile-copy">
          <span className="settings-eyebrow">SIGNED IN ACCOUNT</span>
          <h3>{user?.name || "Administrator"}</h3>
          <p>{user?.email || "Email address unavailable"}</p>
        </div>
        <span className="settings-role">{user?.role?.replaceAll("_", " ") || "Account"}</span>
      </section>

      <div className="settings-grid">
        <section className="settings-card panel">
          <div className="settings-card-icon"><Bell size={19} /></div>
          <div>
            <span className="settings-eyebrow">COMMUNICATION</span>
            <h3>Notification preferences</h3>
            <p>Choose in-app and push channels for operational events.</p>
          </div>
          <Link className="button button-secondary" to="/settings/notifications">Manage preferences</Link>
        </section>
        <section className="settings-card panel">
          <div className="settings-card-icon"><Building2 size={19} /></div>
          <div>
            <span className="settings-eyebrow">DATA SCOPE</span>
            <h3>Organization workspace</h3>
            <p>Admin records are scoped by your signed-in organization access.</p>
          </div>
          <div className="settings-readonly"><ShieldCheck size={15} /> Organization-scoped access</div>
        </section>
      </div>
      <p className="settings-footnote">Workspace and account details are managed by your organization administrator.</p>
    </div>
  );
}
