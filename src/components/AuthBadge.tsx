import { useState } from "react";
import { LogIn, LogOut, Cloud, CloudOff, Loader2 } from "lucide-react";
import { useFinanceStore } from "../store/useFinanceStore";

export function AuthBadge() {
  const isAuthed = useFinanceStore(s => s.isAuthed);
  const userEmail = useFinanceStore(s => s.userEmail);
  const authLoading = useFinanceStore(s => s.authLoading);
  const signOut = useFinanceStore(s => s.signOut);
  const signIn = useFinanceStore(s => s.signIn);

  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      setShowForm(false);
      setEmail("");
      setPassword("");
    } catch (err: any) {
      setError(err.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="auth-badge loading">
        <Loader2 size={14} className="spin" />
        <span>Connecting…</span>
      </div>
    );
  }

  if (isAuthed) {
    return (
      <div className="auth-badge signed-in">
        <Cloud size={14} />
        <span>Cloud save active</span>
        <button className="auth-action" onClick={signOut} title="Sign out">
          <LogOut size={14} />
        </button>
      </div>
    );
  }

  return (
    <>
      <button className="auth-badge signed-out" onClick={() => setShowForm(!showForm)}>
        <CloudOff size={14} />
        <span>Sign in to save permanently</span>
        <LogIn size={14} />
      </button>

      {showForm && (
        <div className="auth-dropdown">
          <form onSubmit={handleSignIn} className="auth-form">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
