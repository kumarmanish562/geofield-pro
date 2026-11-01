import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import apiClient, { getApiErrorMessage } from "../services/apiClient.js";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { Button } from "../components/ui/Button.jsx";
import { ErrorState } from "../components/ui/ErrorState.jsx";
import { LoadingState } from "../components/ui/LoadingState.jsx";

export function EmployeeDetailsPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [supervisors, setSupervisors] = useState([]);
  const [state, setState] = useState("loading");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  async function load() {
    setState("loading");
    try {
      const [{ data }, { data: workforce }] = await Promise.all([
        apiClient.get(`/workforce/employees/${userId}`),
        apiClient.get("/workforce/employees", {
          params: { status: "ACTIVE", pageSize: 100 },
        }),
      ]);
      setEmployee(data.data);
      setSupervisors(
        workforce.data.items.filter(
          (item) =>
            ["ADMIN", "SUPERVISOR"].includes(item.role) && item.id !== userId,
        ),
      );
      setForm({
        name: data.data.name,
        status: data.data.status,
        employeeCode: data.data.employeeProfile?.employeeCode ?? "",
        jobTitle: data.data.employeeProfile?.jobTitle ?? "",
        phone: data.data.employeeProfile?.phone ?? "",
        supervisorId: data.data.employeeProfile?.supervisor?.id ?? "",
      });
      setState("ready");
    } catch (error) {
      setState("error");
      toast.error(getApiErrorMessage(error));
    }
  }
  useEffect(() => {
    load();
  }, [userId]);
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await apiClient.patch(
        `/workforce/employees/${userId}`,
        form,
      );
      setEmployee(data.data);
      toast.success("Employee updated.");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }
  if (state === "loading") return <LoadingState label="Loading employee..." />;
  if (state === "error") return <ErrorState onRetry={load} />;
  return (
    <>
      <PageHeader
        title={employee.name}
        description={`${employee.email} · ${employee.role}`}
        action={
          <Link className="text-link" to="/employees">
            Back to employees
          </Link>
        }
      />
      <div className="details-grid">
        <form className="panel form-stack" onSubmit={save}>
          <h3>Profile and account</h3>
          <label className="input-field">
            <span>Name</span>
            <input
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              required
            />
          </label>
          <label className="input-field">
            <span>Employee code</span>
            <input
              value={form.employeeCode}
              onChange={(event) =>
                setForm({ ...form, employeeCode: event.target.value })
              }
            />
          </label>
          <label className="input-field">
            <span>Job title</span>
            <input
              value={form.jobTitle}
              onChange={(event) =>
                setForm({ ...form, jobTitle: event.target.value })
              }
            />
          </label>
          <label className="input-field">
            <span>Phone</span>
            <input
              value={form.phone}
              onChange={(event) =>
                setForm({ ...form, phone: event.target.value })
              }
            />
          </label>
          <label className="input-field">
            <span>Account status</span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value })
              }
            >
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </label>
          <label className="input-field">
            <span>Supervisor</span>
            <select
              value={form.supervisorId}
              onChange={(event) =>
                setForm({ ...form, supervisorId: event.target.value })
              }
            >
              <option value="">No supervisor</option>
              {supervisors.map((supervisor) => (
                <option value={supervisor.id} key={supervisor.id}>
                  {supervisor.name}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" loading={saving}>
            Save changes
          </Button>
        </form>
        <aside className="panel details-summary">
          <h3>Access boundaries</h3>
          <p>
            Role: <strong>{employee.role}</strong>
          </p>
          <p>
            Organization: <strong>{employee.organizationId}</strong>
          </p>
          <p>
            Supervisor:{" "}
            <strong>
              {employee.employeeProfile?.supervisor?.name ?? "Not assigned"}
            </strong>
          </p>
          <p>
            Teams:{" "}
            <strong>
              {employee.teamMemberships
                ?.map(({ team }) => team.name)
                .join(", ") || "Unassigned"}
            </strong>
          </p>
          <Button variant="secondary" onClick={() => navigate("/teams")}>
            Manage teams
          </Button>
        </aside>
      </div>
    </>
  );
}
