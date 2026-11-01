import { ModulePlaceholderPage } from "./ModulePlaceholderPage.jsx";
const pages = {
  AttendancePage: ["Attendance", "Track team availability and work sessions."],
  AssignmentsPage: ["Assignments", "Plan and monitor field work."],
  VillagesPage: ["Villages", "Manage village boundaries and spatial data."],
  LiveMapPage: [
    "Live map",
    "Review field locations when the GIS module is enabled.",
  ],
  SurveysPage: ["Surveys", "Review and manage field survey submissions."],
  AnalyticsPage: ["Analytics", "Understand progress across your organization."],
  ReportsPage: [
    "Reports",
    "Generate operational reports for your organization.",
  ],
  SettingsPage: ["Settings", "Configure your organization workspace."],
};
export const modulePages = Object.fromEntries(
  Object.entries(pages).map(([name, [title, description]]) => [
    name,
    function ModulePage() {
      return <ModulePlaceholderPage title={title} description={description} />;
    },
  ]),
);
export const {
  AttendancePage,
  AssignmentsPage,
  VillagesPage,
  LiveMapPage,
  SurveysPage,
  AnalyticsPage,
  ReportsPage,
  SettingsPage,
} = modulePages;
