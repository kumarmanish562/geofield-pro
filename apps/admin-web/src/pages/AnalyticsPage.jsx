import { useEffect, useMemo, useState } from "react";
import { Download, BarChart3, MapPinned, ClipboardCheck, Clock3, Activity } from "lucide-react";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import apiClient from "../services/apiClient.js";

function downloadCsv(name, rows) {
  if (!rows.length) return toast.error("There is no data on this page to export.");
  const columns = Object.keys(rows[0]);
  const csv = [columns, ...rows.map((row) => columns.map((key) => row[key] ?? ""))].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
}
function Chart({ title, description, rows, label, values }) {
  const max = Math.max(1, ...rows.map((row) => values(row)));
  return <section className="panel analytics-panel"><div className="panel-heading"><div><h3>{title}</h3><p>{description}</p></div></div>{rows.length ? <div className="analytics-bars">{rows.map((row) => <div className="analytics-bar-row" key={label(row)}><span title={label(row)}>{label(row)}</span><div className="progress-track"><span style={{ width: `${Math.max(1, values(row) / max * 100)}%` }} /></div><strong>{values(row)}</strong></div>)}</div> : <p className="analytics-empty">No matching records for this period.</p>}</section>;
}

export function AnalyticsPage() {
  const [filters, setFilters] = useState({ startDate: "", endDate: "", teamId: "" });
  const [teams, setTeams] = useState([]);
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  useEffect(() => { apiClient.get("/workforce/teams").then((response) => setTeams(response.data.data.items ?? response.data.data ?? [])).catch(() => {}); }, []);
  useEffect(() => {
    const params = { page, pageSize: 20, ...(filters.startDate ? { startDate: new Date(`${filters.startDate}T00:00:00`).toISOString() } : {}), ...(filters.endDate ? { endDate: new Date(`${filters.endDate}T23:59:59.999`).toISOString() } : {}), ...(filters.teamId ? { teamId: filters.teamId } : {}) };
    setLoading(true);
    Promise.all(["attendance", "assignments", "surveys", "village-coverage", "locations"].map((path) => apiClient.get(`/analytics/${path}`, { params })))
      .then(([attendance, assignments, surveys, coverage, locations]) => setData({ attendance: attendance.data.data, assignments: assignments.data.data, surveys: surveys.data.data, coverage: coverage.data.data, locations: locations.data.data }))
      .catch(() => toast.error("Analytics could not be loaded."))
      .finally(() => setLoading(false));
  }, [filters, page]);
  const assignments = data?.assignments.items ?? [];
  const villages = data?.coverage.items ?? [];
  const surveyVillages = data?.surveys.byVillage ?? [];
  const surveyRows = useMemo(() => data?.surveys.items ?? [], [data]);
  return <>
    <PageHeader title="Analytics" description="Operational trends calculated from persisted, organization-scoped records." action={<button className="button button-small" disabled={!data} onClick={() => downloadCsv("geofield-analytics.csv", assignments)}><Download size={15} /> Export page</button>} />
    <section className="panel analytics-filters"><label>From<input type="date" value={filters.startDate} onChange={(event) => { setPage(1); setFilters({ ...filters, startDate: event.target.value }); }} /></label><label>To<input type="date" value={filters.endDate} onChange={(event) => { setPage(1); setFilters({ ...filters, endDate: event.target.value }); }} /></label><label>Team<select value={filters.teamId} onChange={(event) => { setPage(1); setFilters({ ...filters, teamId: event.target.value }); }}><option value="">All teams</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label><span>{loading ? "Updating…" : "Filters apply to the current page and charts."}</span></section>
    <div className="analytics-chart-grid">
      <Chart title="Attendance trend" description="Attendance records by day and current status." rows={data?.attendance.trend ?? []} label={(row) => row.date} values={(row) => row.working + row.onBreak + row.completed} />
      <Chart title="Survey submissions by village" description="Persisted surveys matching the date and team filters." rows={surveyVillages.slice(0, 10)} label={(row) => row.village} values={(row) => row.submissions} />
      <Chart title="Village activity coverage" description={data?.coverage.definition ?? "Active villages with matching survey activity."} rows={villages.slice(0, 10)} label={(row) => row.name} values={(row) => row.surveyCount} />
      <section className="panel analytics-panel"><div className="panel-heading"><div><h3>Survey approval rate</h3><p>Approved / (approved + rejected); pending reviews excluded.</p></div><ClipboardCheck size={20} /></div><strong className="analytics-highlight">{data?.surveys.approval.ratePercent == null ? "—" : `${data.surveys.approval.ratePercent}%`}</strong><p className="analytics-empty">{data?.surveys.approval.decided ?? 0} decided surveys</p></section>
      <section className="panel analytics-panel"><div className="panel-heading"><div><h3>Employee work-session duration</h3><p>Recorded check-in to check-out, less recorded breaks.</p></div><Clock3 size={20} /></div><strong className="analytics-highlight">{data?.attendance.workSessionDuration.averageMinutes == null ? "—" : `${data.attendance.workSessionDuration.averageMinutes} min`}</strong><p className="analytics-empty">{data?.attendance.workSessionDuration.completedSessions ?? 0} completed sessions; open sessions are excluded.</p></section>
      <section className="panel analytics-panel"><div className="panel-heading"><div><h3>Location data quality</h3><p>Persisted observations; delayed sync and freshness are reported separately.</p></div><MapPinned size={20} /></div><div className="analytics-location-stats"><strong>{data?.locations.quality.missingAccuracy ?? "—"}<small>Missing accuracy</small></strong><strong>{data?.locations.quality.poorAccuracyOver100m ?? "—"}<small>Accuracy over 100 m</small></strong><strong>{data?.locations.delayedOfflineUploads ?? "—"}<small>Delayed uploads (&gt;5 min)</small></strong><strong>{data?.locations.stalePagination.total ?? "—"}<small>Stale employees (&gt;5 min)</small></strong></div><div className="analytics-stale-list">{(data?.locations.staleEmployees ?? []).slice(0, 5).map((employee) => <Link key={employee.employeeId} to={`/employees/${employee.employeeId}`}>{employee.name}<small>Last update {new Date(employee.lastReceivedAt).toLocaleString()}</small></Link>)}</div><p className="analytics-empty">A delayed upload indicates a gap between capture and receipt. Stale observations do not confirm a device is offline.</p></section>
      <section className="panel analytics-panel"><div className="panel-heading"><div><h3>Assignment progress</h3><p>Persisted survey count compared with configured numeric targets.</p></div><Activity size={20} /></div>{assignments.length ? assignments.slice(0, 6).map((row) => <div className="progress-row" key={row.id}><div><Link to={`/assignments/${row.id}`}>{row.name}</Link><strong>{row.completionPercent == null ? `${row.submittedSurveys} surveys · no target` : `${row.completionPercent}%`}</strong></div><div className="progress-track"><span style={{ width: `${row.completionPercent ?? 0}%` }} /></div></div>) : <p className="analytics-empty">No assignments in this scope.</p>}</section>
    </div>
    <section className="panel analytics-panel"><div className="panel-heading"><div><h3>Survey drill-down</h3><p>Current page of matching records, capped at 20 per request.</p></div><button className="button button-small" onClick={() => downloadCsv("geofield-surveys-page.csv", surveyRows.map((row) => ({ surveyNumber: row.surveyNumber, status: row.status, submittedAt: row.submittedAt, village: row.village?.name, employee: row.employee?.name })))}><Download size={15} /> Export surveys</button></div><div className="responsive-table"><table><thead><tr><th>Survey</th><th>Village</th><th>Employee</th><th>Status</th><th>Submitted</th></tr></thead><tbody>{surveyRows.map((row) => <tr key={row.id}><td><Link to={`/surveys/${row.id}`}>{row.surveyNumber}</Link></td><td>{row.village?.name ?? "—"}</td><td>{row.employee?.name ?? "—"}</td><td>{row.status}</td><td>{row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : "Draft / not submitted"}</td></tr>)}</tbody></table></div><div className="pagination"><button disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} · {data?.surveys.pagination.total ?? 0} surveys</span><button disabled={loading || page >= (data?.surveys.pagination.totalPages ?? 1)} onClick={() => setPage(page + 1)}>Next</button></div></section>
  </>;
}
