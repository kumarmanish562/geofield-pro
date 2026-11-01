import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

import { useAuth } from "./AuthContext.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { getApiErrorMessage } from "../../services/apiClient.js";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success("Welcome back.");
      navigate(location.state?.from?.pathname ?? "/dashboard", {
        replace: true,
      });
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="brand-mark">GF</div>
        <p className="eyebrow">GeoField Pro</p>
        <h1>Coordinate field work with confidence.</h1>
        <p className="muted">
          Sign in to manage your teams, assignments and surveys.
        </p>
        <form className="form-stack" onSubmit={submit}>
          <Input
            label="Work email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
          />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" fullWidth loading={submitting}>
            Sign in
          </Button>
        </form>
        <Link className="text-link" to="/forgot-password">
          Forgot your password?
        </Link>
      </section>
      <aside className="auth-aside">
        <p className="eyebrow">Operations overview</p>
        <h2>Make every field visit count.</h2>
        <p>
          One clear workspace for people, places and progress across your
          organization.
        </p>
      </aside>
    </main>
  );
}
