import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import "./styles.css";
import { apiRequest, restoreSession, setAccessToken } from "./api.js";

function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [mode, setMode] = useState("login");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession()
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function submit(event) {
    event.preventDefault();
    setNotice("");
    try {
      const path =
        mode === "forgot"
          ? "/auth/forgot-password"
          : mode === "reset"
            ? "/auth/reset-password"
            : mode === "invite"
              ? "/auth/accept-invitation"
              : "/auth/login";
      const body =
        mode === "forgot"
          ? { email }
          : mode === "reset"
            ? { token, password }
            : mode === "invite"
              ? { token, name: email, password, clientType: "web" }
              : { email, password, clientType: "web" };
      const response = await apiRequest(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (mode !== "login") {
        setNotice(response.data.message ?? "Request completed.");
        setMode("login");
        return;
      }
      setAccessToken(response.data.accessToken);
      setUser(response.data.user);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function logout() {
    await apiRequest("/auth/logout", { method: "POST", body: "{}" });
    setAccessToken(null);
    setUser(null);
  }

  if (loading) return <main className="shell">Restoring session…</main>;
  if (user) {
    return (
      <main className="shell">
        <p className="eyebrow">GeoField Pro Admin</p>
        <h1>Welcome, {user.name}.</h1>
        <p className="intro">Signed in as {user.role.toLowerCase()}.</p>
        <button onClick={logout}>Sign out</button>
      </main>
    );
  }

  return (
    <main className="shell">
      <p className="eyebrow">GeoField Pro Admin</p>
      <h1>
        {mode === "login"
          ? "Sign in to field operations."
          : mode === "forgot"
            ? "Recover your password."
            : mode === "reset"
              ? "Choose a new password."
              : "Accept your invitation."}
      </h1>
      <form className="auth-form" onSubmit={submit}>
        {mode !== "reset" && (
          <label>
            {mode === "invite" ? "Your name" : "Email"}
            <input
              type={mode === "invite" ? "text" : "email"}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
        )}
        {mode !== "forgot" && (
          <label>
            {mode === "invite" || mode === "reset"
              ? "New password"
              : "Password"}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
        )}
        {(mode === "reset" || mode === "invite") && (
          <label>
            Invitation or reset token
            <input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              required
            />
          </label>
        )}
        {mode === "login" && (
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
        )}
        {notice && <p className="error">{notice}</p>}
        <button type="submit">
          {mode === "login" ? "Sign in" : "Continue"}
        </button>
      </form>
      <nav className="auth-links">
        <button type="button" onClick={() => setMode("forgot")}>
          Forgot password
        </button>
        <button type="button" onClick={() => setMode("reset")}>
          Reset password
        </button>
        <button type="button" onClick={() => setMode("invite")}>
          Accept invitation
        </button>
      </nav>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
