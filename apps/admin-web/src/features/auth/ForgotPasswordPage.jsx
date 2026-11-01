import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";

import { Button } from "../../components/ui/Button.jsx";
import { Input } from "../../components/ui/Input.jsx";
import {
  getApiErrorMessage,
  requestPasswordReset,
} from "../../services/apiClient.js";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await requestPasswordReset(email);
      setSubmitted(true);
      toast.success("If an account exists, reset instructions are on the way.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page auth-page-centered">
      <section className="auth-panel">
        <div className="brand-mark">GF</div>
        <p className="eyebrow">Account recovery</p>
        <h1>Reset your password.</h1>
        <p className="muted">
          {submitted
            ? "If an account exists for that email, you will receive reset instructions."
            : "Enter your work email and we will send the next steps."}
        </p>
        {!submitted && (
          <form className="form-stack" onSubmit={submit}>
            <Input
              label="Work email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" fullWidth loading={loading}>
              Send reset instructions
            </Button>
          </form>
        )}
        <Link className="text-link" to="/login">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
