import { NavLink } from "react-router-dom";
import {
  BarChart3,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Map,
  MapPinned,
  Settings,
  UserRound,
  Users,
  X,
  CalendarCheck,
} from "lucide-react";

import { useAuth } from "../../features/auth/AuthContext.jsx";

const navigation = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/employees", label: "Employees", icon: Users },
  { to: "/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/assignments", label: "Assignments", icon: ClipboardList },
  { to: "/villages", label: "Villages", icon: MapPinned },
  { to: "/live-map", label: "Live map", icon: Map },
  { to: "/surveys", label: "Surveys", icon: FileText },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  return (
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="sidebar-header">
        <div className="brand-mark brand-mark-small">GF</div>
        <div>
          <strong>GeoField</strong>
          <span>PRO</span>
        </div>
        <button
          className="icon-button mobile-only"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        <p className="nav-label">Workspace</p>
        {navigation.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <Icon size={18} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
        <p className="nav-label nav-label-spaced">System</p>
        <NavLink
          to="/reports"
          onClick={onClose}
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <FileText size={18} />
          <span>Reports</span>
        </NavLink>
        <NavLink
          to="/settings"
          onClick={onClose}
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <Settings size={18} />
          <span>Settings</span>
        </NavLink>
      </nav>
      <div className="sidebar-footer">
        <div className="user-summary">
          <div className="avatar">
            {user?.name?.slice(0, 1).toUpperCase() ?? "U"}
          </div>
          <div>
            <strong>{user?.name ?? "User"}</strong>
            <span>{user?.role?.toLowerCase() ?? "member"}</span>
          </div>
        </div>
        <button className="logout-button" onClick={logout}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
