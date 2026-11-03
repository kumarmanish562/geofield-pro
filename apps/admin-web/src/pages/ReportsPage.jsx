import { useEffect, useState } from "react";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { ErrorState } from "../components/ui/ErrorState.jsx";
import { LoadingState } from "../components/ui/LoadingState.jsx";
import apiClient, { getApiErrorMessage } from "../services/apiClient.js";

export function ReportsPage() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  async function load() {
    try {
      setError("");
      const response = await apiClient.get("/reports/surveys/summary");
      setSummary(response.data.data);
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function download(format) {
    const response = await apiClient.get(`/reports/surveys/export/${format}`, {
      responseType: "blob",
    });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = `survey-report.${format === "csv" ? "csv" : "xls"}`;
    link.click();
    URL.revokeObjectURL(url);
  }
  if (error) return <ErrorState onRetry={load} />;
  if (!summary) return <LoadingState label="Loading reports..." />;
  return (
    <>
      <PageHeader
        title="Survey reports"
        description="Review operational survey outcomes and export authorized data."
        action={
          <div className="quick-actions">
            <button
              className="button button-secondary"
              onClick={() => download("csv")}
            >
              Export CSV
            </button>
            <button
              className="button button-secondary"
              onClick={() => download("excel")}
            >
              Export Excel
            </button>
          </div>
        }
      />
      <section className="metric-grid">
        {[
          ["Total surveys", summary.total],
          ["Approved", summary.approved],
          ["Pending", summary.pending],
          ["Rejected", summary.rejected],
          ["Correction required", summary.correctionRequired],
        ].map(([label, value]) => (
          <article className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <h3>Village-wise statistics</h3>
          {summary.villageWise.map((row) => (
            <p key={row.name}>
              {row.name}: <strong>{row.count}</strong>
            </p>
          ))}
        </section>
        <section className="panel">
          <h3>Employee-wise statistics</h3>
          {summary.employeeWise.map((row) => (
            <p key={row.name}>
              {row.name}: <strong>{row.count}</strong>
            </p>
          ))}
        </section>
      </div>
    </>
  );
}
