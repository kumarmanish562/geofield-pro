import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { ErrorState } from "../components/ui/ErrorState.jsx";
import { LoadingState } from "../components/ui/LoadingState.jsx";
import apiClient, { getApiErrorMessage } from "../services/apiClient.js";

export function SurveysPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [reviewing, setReviewing] = useState(null);

  async function load() {
    setError("");
    try {
      const response = await apiClient.get("/admin/surveys", {
        params: { page: 1, pageSize: 50, status: filter || undefined },
      });
      setData(response.data.data);
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    }
  }
  useEffect(() => {
    load();
  }, [filter]);

  async function review(id, reviewStatus) {
    const reviewNotes =
      reviewStatus === "REJECTED"
        ? window.prompt("Rejection reason")
        : window.prompt("Review notes (optional)") || "";
    if (reviewStatus === "REJECTED" && !reviewNotes) return;
    setReviewing(id);
    try {
      await apiClient.patch(`/admin/surveys/${id}/review`, {
        reviewStatus,
        reviewNotes,
      });
      await load();
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    } finally {
      setReviewing(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Field surveys"
        description="Review field submissions, locations, and survey status."
      />
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Survey submissions</h3>
            <p>{data?.pagination?.total ?? 0} records</p>
          </div>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter survey status"
          >
            <option value="">All statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        {error ? <ErrorState onRetry={load} /> : null}
        {!data && !error ? <LoadingState /> : null}
        {data?.items?.length === 0 ? (
          <EmptyState
            title="No surveys found"
            description="Submitted surveys will appear here."
          />
        ) : null}
        {data?.items?.length ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Survey</th>
                  <th>Employee</th>
                  <th>Village</th>
                  <th>Gat / plot</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((survey) => (
                  <tr key={survey.id}>
                    <td>
                      <Link to={`/surveys/${survey.id}`}>
                        <strong>{survey.surveyNumber}</strong>
                      </Link>
                      <br />
                      <small>
                        {new Date(survey.createdAt).toLocaleString()}
                      </small>
                    </td>
                    <td>{survey.employee?.name ?? "—"}</td>
                    <td>{survey.village?.name ?? "—"}</td>
                    <td>
                      {survey.gatNumber}
                      {survey.plotNumber ? ` / ${survey.plotNumber}` : ""}
                      <br />
                      <small>
                        {survey.latitude}, {survey.longitude}
                      </small>
                    </td>
                    <td>
                      <span className="status-pill">{survey.status}</span>
                    </td>
                    <td>
                      {["SUBMITTED", "UNDER_REVIEW"].includes(survey.status) ? (
                        <>
                          <button
                            className="button button-secondary"
                            disabled={reviewing === survey.id}
                            onClick={() => review(survey.id, "APPROVED")}
                          >
                            Approve
                          </button>{" "}
                          <button
                            className="button button-danger"
                            disabled={reviewing === survey.id}
                            onClick={() => review(survey.id, "REJECTED")}
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </>
  );
}
