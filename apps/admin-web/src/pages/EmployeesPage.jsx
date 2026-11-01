import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, UserRound } from "lucide-react";
import { toast } from "react-hot-toast";

import apiClient, { getApiErrorMessage } from "../services/apiClient.js";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { Button } from "../components/ui/Button.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { ErrorState } from "../components/ui/ErrorState.jsx";
import { LoadingState } from "../components/ui/LoadingState.jsx";

export function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [state, setState] = useState("loading");
  const [inviteOpen, setInviteOpen] = useState(false);

  async function load() {
    setState("loading");
    try {
      const { data } = await apiClient.get("/workforce/employees", {
        params: {
          search: query || undefined,
          status: status || undefined,
          page,
          pageSize: 25,
        },
      });
      setEmployees(data.data.items);
      setPagination(data.data.pagination);
      setState("ready");
    } catch (error) {
      setState("error");
      toast.error(getApiErrorMessage(error));
    }
  }

  useEffect(() => {
    load();
  }, [page, status]);

  function submitSearch(event) {
    event.preventDefault();
    setPage(1);
    load();
  }

  return (
    <>
      <PageHeader
        title="Employees"
        description="Manage workforce profiles, supervisors and account status."
        action={
          <Button onClick={() => setInviteOpen(true)}>
            <Plus size={16} /> Invite employee
          </Button>
        }
      />
      <div className="toolbar panel">
        <form className="directory-search" onSubmit={submitSearch}>
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email or employee code"
          />
          <button type="submit">Search</button>
        </form>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="DISABLED">Disabled</option>
          <option value="LOCKED">Locked</option>
        </select>
      </div>
      {state === "loading" && <LoadingState label="Loading employees..." />}
      {state === "error" && <ErrorState onRetry={load} />}
      {state === "ready" && employees.length === 0 && (
        <div className="panel">
          <EmptyState
            icon={UserRound}
            title="No employees found"
            description="Invite an employee or change your search filters."
          />
        </div>
      )}
      {state === "ready" && employees.length > 0 && (
        <div className="panel table-panel">
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Team</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <strong>{employee.name}</strong>
                      <span>{employee.email}</span>
                    </td>
                    <td>{employee.role}</td>
                    <td>
                      <span
                        className={`status-badge status-${employee.status.toLowerCase()}`}
                      >
                        {employee.status}
                      </span>
                    </td>
                    <td>
                      {employee.teamMemberships
                        ?.map(({ team }) => team.name)
                        .join(", ") || "Unassigned"}
                    </td>
                    <td>
                      <Link
                        className="table-link"
                        to={`/employees/${employee.id}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>{pagination?.total ?? 0} employees</span>
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <span>
              Page {page} of {pagination?.totalPages || 1}
            </span>
            <button
              disabled={!pagination || page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
      {inviteOpen && (
        <InviteDialog
          onClose={() => setInviteOpen(false)}
          onCreated={() => {
            setInviteOpen(false);
            load();
          }}
        />
      )}
    </>
  );
}

function InviteDialog({ onClose, onCreated }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await apiClient.post(
        "/workforce/employees/invitations",
        { email, role },
      );
      setToken(data.data.invitationToken ?? "");
      toast.success("Invitation created.");
      if (!data.data.invitationToken) onCreated();
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
            <h3>Invite employee</h3>
            <p>
              Invitation delivery is development-only until email is configured.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {token ? (
          <>
            <p className="form-help">
              Copy this development token and send it through a secure channel.
            </p>
            <textarea className="token-box" readOnly value={token} />
            <Button onClick={onCreated}>Done</Button>
          </>
        ) : (
          <form className="form-stack" onSubmit={submit}>
            <label className="input-field">
              <span>Work email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="input-field">
              <span>Role</span>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="GIS_ANALYST">GIS analyst</option>
              </select>
            </label>
            <div className="dialog-actions">
              <Button type="button" onClick={onClose} variant="secondary">
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Create invitation
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
