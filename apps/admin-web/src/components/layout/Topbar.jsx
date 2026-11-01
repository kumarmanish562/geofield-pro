import { Menu, Bell, Search } from "lucide-react";
import { useLocation } from "react-router-dom";

const titles = {
  "/dashboard": ["Dashboard", "A clear view of your field operations."],
  "/employees": ["Employees", "Manage your field workforce."],
  "/teams": ["Teams", "Organize employees and supervisors."],
  "/attendance": ["Attendance", "Track team availability and work sessions."],
  "/assignments": ["Assignments", "Plan and monitor field work."],
  "/villages": ["Villages", "Manage village boundaries and spatial data."],
  "/live-map": [
    "Live map",
    "A real-time field overview will be available in a later GIS phase.",
  ],
  "/surveys": ["Surveys", "Review field survey submissions."],
  "/analytics": ["Analytics", "Understand progress across your organization."],
  "/reports": ["Reports", "Generate operational reports."],
  "/settings": ["Settings", "Configure your organization workspace."],
};

export function Topbar({ onMenu }) {
  const location = useLocation();
  const [title, subtitle] = titles[location.pathname] ?? ["GeoField Pro", ""];
  return (
    <header className="topbar">
      <button
        className="icon-button mobile-only"
        onClick={onMenu}
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>
      <div className="page-heading">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="topbar-actions">
        <div className="search-box">
          <Search size={17} />
          <input placeholder="Search workspace" aria-label="Search workspace" />
        </div>
        <button className="icon-button" aria-label="Notifications">
          <Bell size={19} />
        </button>
      </div>
    </header>
  );
}
