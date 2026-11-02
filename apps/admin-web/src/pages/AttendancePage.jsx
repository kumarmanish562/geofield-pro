import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import apiClient, { getApiErrorMessage } from "../services/apiClient.js";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { LoadingState } from "../components/ui/LoadingState.jsx";

const cards = [
  ["totalEmployees", "Expected employees"],
  ["checkedIn", "Checked in"],
  ["onBreak", "On break"],
  ["completed", "Completed"],
  ["pendingCorrections", "Pending corrections"],
];

export function AttendancePage() {
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState(null);
  const [corrections, setCorrections] = useState([]);
  const [filters, setFilters] = useState({ status: "", search: "" });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [
        { data: summaryResponse },
        { data: recordsResponse },
        { data: correctionResponse },
      ] = await Promise.all([
        apiClient.get("/admin/attendance/summary"),
        apiClient.get("/admin/attendance", {
          params: {
            status: filters.status || undefined,
            search: filters.search || undefined,
            pageSize: 50,
          },
        }),
        apiClient.get("/admin/attendance/corrections"),
      ]);
      setSummary(summaryResponse.data);
      setRecords(recordsResponse.data);
      setCorrections(correctionResponse.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filters.status]);

  async function review(id, action) {
    try {
      await apiClient.post(`/admin/attendance/corrections/${id}/${action}`, {
        reviewComment: "Reviewed from attendance dashboard.",
      });
      toast.success(`Correction ${action}d.`);
      load();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Monitor attendance and review correction requests."
      />
      {summary && (
        <div className="metrics-grid">
          {cards.map(([key, label]) => (
            <div className="metric-card panel" key={key}>
              <span className="metric-label">{label}</span>
              <strong className="metric-value">{summary[key]}</strong>
            </div>
          ))}
        </div>
      )}
      <div className="toolbar panel">
        <input
          value={filters.search}
          onChange={(event) =>
            setFilters({ ...filters, search: event.target.value })
          }
          onKeyDown={(event) => event.key === "Enter" && load()}
          placeholder="Search employee"
          aria-label="Search employee attendance"
        />
        <select
          value={filters.status}
          onChange={(event) =>
            setFilters({ ...filters, status: event.target.value })
          }
          aria-label="Filter attendance status"
        >
          <option value="">All statuses</option>
          {["WORKING", "ON_BREAK", "COMPLETED"].map((value) => (
            <option value={value} key={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      {loading ? (
        <LoadingState label="Loading attendance..." />
      ) : records?.items.length === 0 ? (
        <div className="panel">
          <EmptyState
            title="No attendance records"
            description="Attendance records will appear after employees check in."
          />
        </div>
      ) : (
        <div className="panel table-panel">
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Check in</th>
                  <th>Check out</th>
                  <th>Break</th>
                  <th>Net time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records?.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.employee.name}</strong>
                      <span>{item.employee.email}</span>
                    </td>
                    <td>
                      {new Date(item.attendanceDate).toLocaleDateString()}
                    </td>
                    <td>
                      {item.checkedInAt
                        ? new Date(item.checkedInAt).toLocaleTimeString()
                        : "—"}
                    </td>
                    <td>
                      {item.checkedOutAt
                        ? new Date(item.checkedOutAt).toLocaleTimeString()
                        : "—"}
                    </td>
                    <td>{Math.floor(item.totalBreakSeconds / 60)} min</td>
                    <td>
                      {Math.floor(item.netSeconds / 3600)}h{" "}
                      {Math.floor((item.netSeconds % 3600) / 60)}m
                    </td>
                    <td>
                      <span
                        className={`status-badge status-${item.status.toLowerCase()}`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <section className="panel correction-panel">
        <h3>Pending corrections</h3>
        {corrections.length === 0 ? (
          <p className="form-help">No pending correction requests.</p>
        ) : (
          corrections.map((correction) => (
            <div className="correction-row" key={correction.id}>
              <div>
                <strong>{correction.employee.name}</strong>
                <span>{correction.reason}</span>
                <span>
                  Requested check-in:{" "}
                  {correction.requestedCheckInAt
                    ? new Date(correction.requestedCheckInAt).toLocaleString()
                    : "Unchanged"}
                </span>
                <span>
                  Requested check-out:{" "}
                  {correction.requestedCheckOutAt
                    ? new Date(correction.requestedCheckOutAt).toLocaleString()
                    : "Unchanged"}
                </span>
              </div>
              <div className="dialog-actions">
                <button onClick={() => review(correction.id, "approve")}>
                  Approve
                </button>
                <button onClick={() => review(correction.id, "reject")}>
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </section>
    </>
  );
}
