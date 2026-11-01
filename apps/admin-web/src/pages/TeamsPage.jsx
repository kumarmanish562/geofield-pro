import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import apiClient, { getApiErrorMessage } from "../services/apiClient.js";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { Button } from "../components/ui/Button.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { LoadingState } from "../components/ui/LoadingState.jsx";

export function TeamsPage() {
  const [teams, setTeams] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState({});
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  async function load() {
    try {
      const [{ data: teamsResponse }, { data: employeesResponse }] =
        await Promise.all([
          apiClient.get("/workforce/teams"),
          apiClient.get("/workforce/employees", {
            params: { status: "ACTIVE", pageSize: 100 },
          }),
        ]);
      setTeams(teamsResponse.data);
      setEmployees(employeesResponse.data.items);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function create(event) {
    event.preventDefault();
    try {
      await apiClient.post("/workforce/teams", { name, description });
      setName("");
      setDescription("");
      toast.success("Team created.");
      load();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
    async function addMember(teamId) {
      const userId = selectedEmployee[teamId];
      if (!userId) return;
      try {
        await apiClient.post(`/workforce/teams/${teamId}/members`, { userId });
        toast.success("Employee assigned to team.");
        setSelectedEmployee({ ...selectedEmployee, [teamId]: "" });
        load();
      } catch (error) {
        toast.error(getApiErrorMessage(error));
      }
    }
    async function removeMember(teamId, userId) {
      try {
        await apiClient.delete(`/workforce/teams/${teamId}/members/${userId}`);
        toast.success("Employee removed from team.");
        load();
      } catch (error) {
        toast.error(getApiErrorMessage(error));
      }
    }
  }
  return (
    <>
      <PageHeader
        title="Teams"
        description="Organize employees and assign supervisors."
      />
      <div className="details-grid">
        <form className="panel form-stack" onSubmit={create}>
          <h3>Create team</h3>
          <label className="input-field">
            <span>Team name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <label className="input-field">
            <span>Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <Button type="submit">Create team</Button>
        </form>
        <div className="panel">
          {teams === null ? (
            <LoadingState label="Loading teams..." />
          ) : teams.length === 0 ? (
            <EmptyState
              title="No teams yet"
              description="Create the first operational team."
            />
          ) : (
            teams.map((team) => (
              <article className="team-row team-row-expanded" key={team.id}>
                <div>
                  <strong>{team.name}</strong>
                  <span>
                    {team.memberships.length} members ·{" "}
                    {team.supervisor?.name ?? "No supervisor"}
                  </span>
                  <div className="member-list">
                    {team.memberships.map(({ user }) => (
                      <span className="member-chip" key={user.id}>
                        {user.name}
                        <button
                          type="button"
                          onClick={() => removeMember(team.id, user.id)}
                          aria-label={`Remove ${user.name}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="member-controls">
                    <select
                      value={selectedEmployee[team.id] ?? ""}
                      onChange={(event) =>
                        setSelectedEmployee({
                          ...selectedEmployee,
                          [team.id]: event.target.value,
                        })
                      }
                    >
                      <option value="">Assign employee...</option>
                      {employees
                        .filter(
                          (employee) =>
                            !team.memberships.some(
                              ({ user }) => user.id === employee.id,
                            ),
                        )
                        .map((employee) => (
                          <option value={employee.id} key={employee.id}>
                            {employee.name}
                          </option>
                        ))}
                    </select>
                    <button type="button" onClick={() => addMember(team.id)}>
                      Assign
                    </button>
                  </div>
                </div>
                <span
                  className={`status-badge status-${team.status.toLowerCase()}`}
                >
                  {team.status}
                </span>
              </article>
            ))
          )}
        </div>
      </div>
    </>
  );
}
