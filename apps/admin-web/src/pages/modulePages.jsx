import { AnalyticsPage } from "./AnalyticsPage.jsx";
import { SettingsPage } from "./SettingsPage.jsx";
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
  ReportsPage: [
    "Reports",
    "Generate operational reports for your organization.",
  ],
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
  ReportsPage,
} = modulePages;
export { AnalyticsPage, SettingsPage };
