import { useState } from "react";
import { Check, KeyRound } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Button } from "../../components/ui/Button.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { acceptInvitation, getApiErrorMessage } from "../../services/apiClient.js";

export function InvitationActivationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [activated, setActivated] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (token.trim().length < 32) return setError("Enter the complete invitation token.");
    if (password.length < 12) return setError("Password must be at least 12 characters.");
    if (password !== confirmation) return setError("The passwords do not match.");
    setSubmitting(true);
    try {
      await acceptInvitation({ token: token.trim(), name: name.trim(), password });
      setActivated(true);
      toast.success("Your account is active. You can now sign in.");
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel activation-panel">
        <div className="brand-mark">GF</div>
        <p className="eyebrow">GEOFIELD PRO · ACCOUNT SETUP</p>
        {activated ? (
          <div className="activation-success">
            <div className="activation-success-icon"><Check size={23} /></div>
            <h1>Account activated</h1>
            <p className="muted">Your invitation was accepted. Sign in to access your organization workspace.</p>
            <Button fullWidth onClick={() => navigate("/login", { replace: true })}>Continue to sign in</Button>
          </div>
        ) : (
          <>
            <div className="activation-heading-icon"><KeyRound size={18} /></div>
            <h1>Activate your account</h1>
            <p className="muted">Use the invitation token provided by your organization to set up your account.</p>
            <form className="form-stack" onSubmit={submit}>
              <Input label="Invitation token" value={token} onChange={(event) => setToken(event.target.value)} required maxLength={512} autoComplete="one-time-code" />
              <Input label="Full name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={150} autoComplete="name" />
              <Input label="Create password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={12} maxLength={128} autoComplete="new-password" />
              <Input label="Confirm password" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required autoComplete="new-password" />
              {error ? <p className="form-error" role="alert">{error}</p> : null}
              <Button type="submit" fullWidth loading={submitting}>Activate account</Button>
            </form>
            <p className="activation-footer">Already activated? <Link className="text-link" to="/login">Sign in</Link></p>
          </>
        )}
      </section>
      <aside className="auth-aside">
        <p className="eyebrow">SECURE WORKSPACE ACCESS</p>
        <h2>Join your field operations team.</h2>
        <p>Your account is linked to the organization that issued this invitation.</p>
      </aside>
    </main>
  );
}
