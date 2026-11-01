import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout.jsx";
import { ForgotPasswordPage } from "../features/auth/ForgotPasswordPage.jsx";
import { LoginPage } from "../features/auth/LoginPage.jsx";
import { ProtectedRoute } from "../features/auth/ProtectedRoute.jsx";
import {
  AnalyticsPage,
  AssignmentsPage,
  AttendancePage,
  LiveMapPage,
  ReportsPage,
  SettingsPage,
  SurveysPage,
  VillagesPage,
} from "../pages/modulePages.jsx";
import { DashboardPage } from "../pages/DashboardPage.jsx";
import { NotFoundPage } from "../pages/NotFoundPage.jsx";
import { EmployeesPage } from "../pages/EmployeesPage.jsx";
import { EmployeeDetailsPage } from "../pages/EmployeeDetailsPage.jsx";
import { TeamsPage } from "../pages/TeamsPage.jsx";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/employees/:userId" element={<EmployeeDetailsPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/assignments" element={<AssignmentsPage />} />
          <Route path="/villages" element={<VillagesPage />} />
          <Route path="/live-map" element={<LiveMapPage />} />
          <Route path="/surveys" element={<SurveysPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
