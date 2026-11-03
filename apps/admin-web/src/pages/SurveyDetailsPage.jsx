import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { ErrorState } from "../components/ui/ErrorState.jsx";
import { LoadingState } from "../components/ui/LoadingState.jsx";
import apiClient, { getApiErrorMessage } from "../services/apiClient.js";

export function SurveyDetailsPage() {
  const { id } = useParams();
  const [survey, setSurvey] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [working, setWorking] = useState(false);

  async function load() {
    try {
      const response = await apiClient.get(`/admin/surveys/${id}`);
      setSurvey(response.data.data);
      const historyResponse = await apiClient.get(
        `/survey-reviews/${id}/history`,
      );
      setHistory(historyResponse.data.data);
      try {
        const attachmentResponse = await apiClient.get(
          `/admin/surveys/${id}/attachments`,
        );
        setAttachments(attachmentResponse.data.data);
      } catch {
        setAttachments([]);
      }
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    }
  }
  useEffect(() => {
    load();
  }, [id]);

  if (error) return <ErrorState onRetry={load} />;
  if (!survey) return <LoadingState label="Loading survey..." />;
  const hasLocation =
    Number.isFinite(survey.latitude) && Number.isFinite(survey.longitude);
  return (
    <>
      <PageHeader
        title={survey.surveyNumber}
        description="Complete field survey record and review evidence."
        action={
          <Link className="button button-secondary" to="/surveys">
            Back to surveys
          </Link>
        }
      />
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Survey information</h3>
              <p className="status-pill">{survey.status}</p>
            </div>
          </div>
          <dl className="details-list">
            <dt>Employee</dt>
            <dd>
              {survey.employee?.name} ({survey.employee?.email})
            </dd>
            <dt>Assignment</dt>
            <dd>{survey.assignment?.name}</dd>
            <dt>Village</dt>
            <dd>
              {survey.village?.name} ({survey.village?.code})
            </dd>
            <dt>Gat / plot</dt>
            <dd>
              {survey.gatNumber}
              {survey.plotNumber ? ` / ${survey.plotNumber}` : ""}
            </dd>
            <dt>GPS</dt>
            <dd>
              {hasLocation
                ? `${survey.latitude}, ${survey.longitude} (${survey.gpsAccuracy}m accuracy)`
                : "Not captured"}
            </dd>
            <dt>Captured</dt>
            <dd>{new Date(survey.capturedAt).toLocaleString()}</dd>
            <dt>Submitted</dt>
            <dd>
              {survey.submittedAt
                ? new Date(survey.submittedAt).toLocaleString()
                : "Not submitted"}
            </dd>
          </dl>
          <h4>Field notes</h4>
          <p>{survey.notes || "No field notes."}</p>
          {["SUBMITTED", "UNDER_REVIEW"].includes(survey.status) ? (
            <div className="quick-actions">
              <button
                className="button button-secondary"
                disabled={working}
                onClick={async () => {
                  setWorking(true);
                  try {
                    await apiClient.post(`/survey-reviews/${id}/approve`, {
                      comments: "",
                    });
                    await load();
                  } catch (reason) {
                    setError(getApiErrorMessage(reason));
                  } finally {
                    setWorking(false);
                  }
                }}
              >
                Approve
              </button>
              <button
                className="button button-danger"
                disabled={working}
                onClick={async () => {
                  const comments = window.prompt("Rejection reason");
                  if (!comments) return;
                  setWorking(true);
                  try {
                    await apiClient.post(`/survey-reviews/${id}/reject`, {
                      comments,
                    });
                    await load();
                  } catch (reason) {
                    setError(getApiErrorMessage(reason));
                  } finally {
                    setWorking(false);
                  }
                }}
              >
                Reject
              </button>
              <button
                className="button button-secondary"
                disabled={working}
                onClick={async () => {
                  const comments = window.prompt("Correction instructions");
                  if (!comments) return;
                  setWorking(true);
                  try {
                    await apiClient.post(
                      `/survey-reviews/${id}/request-correction`,
                      { comments },
                    );
                    await load();
                  } catch (reason) {
                    setError(getApiErrorMessage(reason));
                  } finally {
                    setWorking(false);
                  }
                }}
              >
                Request correction
              </button>
            </div>
          ) : null}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Review history</h3>
              <p>Immutable workflow actions and reviewer comments.</p>
            </div>
          </div>
          {history.length ? (
            <div className="timeline">
              {history.map((item) => (
                <article className="timeline-item" key={item.id}>
                  <strong>{item.action}</strong>
                  <span>
                    {item.previousStatus ?? "—"} →{" "}
                    {item.newStatus ?? item.reviewStatus}
                  </span>
                  <p>{item.reviewNotes || "No comments."}</p>
                  <small>
                    {item.reviewer?.name} ·{" "}
                    {new Date(item.reviewedAt).toLocaleString()}
                  </small>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No review history"
              description="Review actions will appear here."
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Survey location</h3>
              <p>WGS84 coordinates captured by the employee.</p>
            </div>
          </div>
          {hasLocation ? (
            <MapContainer
              center={[survey.latitude, survey.longitude]}
              zoom={15}
              style={{ height: 320, borderRadius: 10 }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[survey.latitude, survey.longitude]}>
                <Popup>
                  {survey.surveyNumber}
                  <br />
                  {survey.village?.name}
                </Popup>
              </Marker>
            </MapContainer>
          ) : (
            <EmptyState
              title="No location captured"
              description="This draft has no valid GPS coordinates."
            />
          )}
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Photographs</h3>
            <p>Securely signed previews from object storage.</p>
          </div>
        </div>
        {attachments.length ? (
          <div className="survey-photo-grid">
            {attachments.map((attachment) => (
              <a
                href={attachment.previewUrl}
                target="_blank"
                rel="noreferrer"
                key={attachment.id}
              >
                <img
                  src={attachment.previewUrl}
                  alt={attachment.originalFileName}
                />
                <span>{attachment.originalFileName}</span>
              </a>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No uploaded photographs"
            description="Completed attachments will appear here."
          />
        )}
      </section>
    </>
  );
}
