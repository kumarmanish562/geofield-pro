import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import apiClient, { getApiErrorMessage } from "../services/apiClient.js";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { Button } from "../components/ui/Button.jsx";
import { LoadingState } from "../components/ui/LoadingState.jsx";

export function AssignmentDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  async function load() {
    try {
      const { data } = await apiClient.get(`/assignments/${id}`);
      setAssignment(data.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }
  useEffect(() => {
    load();
  }, [id]);
  async function transition(action) {
    try {
      await apiClient.post(`/assignments/${id}/${action}`);
      toast.success(`Assignment ${action}ed.`);
      load();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }
  if (!assignment) return <LoadingState label="Loading assignment..." />;
  return (
    <>
      <PageHeader
        title={assignment.name}
        description={assignment.description || "Assignment details"}
        action={<Button onClick={() => navigate("/assignments")}>Back</Button>}
      />
      <div className="details-grid">
        <section className="panel form-stack">
          <h3>Assignment overview</h3>
          <p>
            <strong>Status:</strong> {assignment.status}
          </p>
          <p>
            <strong>Work area:</strong> {assignment.workArea || "Not specified"}
          </p>
          <p>
            <strong>Supervisor:</strong> {assignment.supervisor.name}
          </p>
          <p>
            <strong>Schedule:</strong>{" "}
            {new Date(assignment.startDate).toLocaleDateString()} –{" "}
            {new Date(assignment.dueDate).toLocaleDateString()}
          </p>
          <div className="dialog-actions">
            {assignment.status === "DRAFT" && (
              <Button onClick={() => transition("publish")}>Publish</Button>
            )}
            {assignment.status === "PUBLISHED" && (
              <Button onClick={() => transition("pause")}>Pause</Button>
            )}
            {assignment.status === "PAUSED" && (
              <Button onClick={() => transition("resume")}>Resume</Button>
            )}
            {["PUBLISHED", "PAUSED"].includes(assignment.status) && (
              <Button onClick={() => transition("complete")}>Complete</Button>
            )}
            {["DRAFT", "PUBLISHED", "PAUSED"].includes(assignment.status) && (
              <Button onClick={() => transition("cancel")}>Cancel</Button>
            )}
          </div>
        </section>
        <section className="panel">
          <h3>Assigned employees</h3>
          {assignment.employees.map(({ employee }) => (
            <div className="team-row" key={employee.id}>
              <div>
                <strong>{employee.name}</strong>
                <span>{employee.email}</span>
              </div>
              <span>{employee.status}</span>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
