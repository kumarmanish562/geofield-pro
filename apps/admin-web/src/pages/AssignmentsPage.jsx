import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ClipboardList } from "lucide-react";
import { toast } from "react-hot-toast";
import apiClient, { getApiErrorMessage } from "../services/apiClient.js";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { Button } from "../components/ui/Button.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { LoadingState } from "../components/ui/LoadingState.jsx";

export function AssignmentsPage() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  async function load() {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/assignments", {
        params: { status: status || undefined, pageSize: 50 },
      });
      setItems(data.data.items);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [status]);
  return (
    <>
      <PageHeader
        title="Assignments"
        description="Plan, publish and monitor field work."
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> New assignment
          </Button>
        }
      />
      <div className="toolbar panel">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter assignments"
        >
          <option value="">All statuses</option>
          {["DRAFT", "PUBLISHED", "PAUSED", "COMPLETED", "CANCELLED"].map(
            (value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ),
          )}
        </select>
      </div>
      {loading ? (
        <LoadingState label="Loading assignments..." />
      ) : items.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon={ClipboardList}
            title="No assignments found"
            description="Create a draft assignment to begin planning field work."
          />
        </div>
      ) : (
        <div className="panel table-panel">
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Assignment</th>
                  <th>Work area</th>
                  <th>Supervisor</th>
                  <th>Schedule</th>
                  <th>Employees</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      <span>{item.id}</span>
                    </td>
                    <td>{item.workArea || "Not specified"}</td>
                    <td>{item.supervisor.name}</td>
                    <td>
                      {new Date(item.startDate).toLocaleDateString()} –{" "}
                      {new Date(item.dueDate).toLocaleDateString()}
                    </td>
                    <td>{item.employees.length}</td>
                    <td>
                      <span
                        className={`status-badge status-${item.status.toLowerCase()}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <Link
                        className="table-link"
                        to={`/assignments/${item.id}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {createOpen && (
        <CreateAssignmentDialog
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            load();
          }}
        />
      )}
    </>
  );
}

function CreateAssignmentDialog({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    workArea: "",
    startDate: "",
    dueDate: "",
    employeeIds: [],
  });
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    apiClient
      .get("/workforce/employees", {
        params: { status: "ACTIVE", pageSize: 100 },
      })
      .then(({ data }) => setEmployees(data.data.items))
      .catch((error) => toast.error(getApiErrorMessage(error)));
  }, []);
  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await apiClient.post("/assignments", {
        ...form,
        startDate: new Date(`${form.startDate}T00:00:00`),
        dueDate: new Date(`${form.dueDate}T00:00:00`),
        surveyRequirements: {},
        targets: {},
      });
      toast.success("Assignment draft created.");
      onCreated();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="dialog-backdrop">
      <section className="dialog" role="dialog" aria-modal="true">
        <div className="dialog-header">
          <div>
            <h3>New assignment</h3>
            <p>Create a draft, then publish it when the workforce is ready.</p>
          </div>
          <button onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form className="form-stack" onSubmit={submit}>
          <label className="input-field">
            <span>Name</span>
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </label>
          <label className="input-field">
            <span>Description</span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </label>
          <label className="input-field">
            <span>Work area</span>
            <input
              value={form.workArea}
              onChange={(event) =>
                setForm({ ...form, workArea: event.target.value })
              }
            />
          </label>
          <div className="form-grid">
            <label className="input-field">
              <span>Start date</span>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(event) =>
                  setForm({ ...form, startDate: event.target.value })
                }
              />
            </label>
            <label className="input-field">
              <span>Due date</span>
              <input
                type="date"
                required
                value={form.dueDate}
                onChange={(event) =>
                  setForm({ ...form, dueDate: event.target.value })
                }
              />
            </label>
          </div>
          <label className="input-field">
            <span>Employees</span>
            <select
              multiple
              value={form.employeeIds}
              onChange={(event) =>
                setForm({
                  ...form,
                  employeeIds: [...event.target.selectedOptions].map(
                    (option) => option.value,
                  ),
                })
              }
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>
          <div className="dialog-actions">
            <Button type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create draft
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
