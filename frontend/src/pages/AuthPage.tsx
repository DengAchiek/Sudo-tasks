import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, MapPinned, ShieldCheck, UserRound } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { BrandMark } from "../components/Brand";
import { useAuth } from "../auth/AuthContext";

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const { user, loading, signIn, signUp } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/analytics" replace />;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (isRegister) await signUp(name, email, password);
      else await signIn(email, password);
      const from = (location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from;
      const destination = from?.pathname?.startsWith("/analytics")
        ? `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`
        : "/analytics";
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We could not sign you in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return <main className="auth-page">
    <section className="auth-story" aria-label="About RoadLens">
      <Link className="brand brand-auth" to="/"><BrandMark />
      <span>
        <strong>RoadLens</strong>
        <small>NAIROBI ROAD INTELLIGENCE</small>
      </span></Link>
      <div className="auth-story-copy">
        <span className="auth-story-kicker"><MapPinned size={14} /> NAIROBI, KENYA</span>
        <h1>Insight for safer journeys.</h1>
        <p>Sign in to explore road safety patterns, historical hotspots, and response planning tools for Nairobi.</p>
        <div className="auth-story-note">
          <ShieldCheck size={17} />
          <span>
            <strong>Your workspace, in one place</strong>
            <small>Your account keeps dashboard access linked to your sign-in.</small>
          </span>
        </div>
      </div>
      <div className="auth-story-footer">
        <span>ROADLENS · DATA INTELLIGENCE</span>
        <Link to="/">Back to the public site <ArrowRight size={13} /></Link>
      </div>
    </section>
    <section className="auth-panel">
      <div className="auth-panel-top">
        <Link to="/" className="auth-back-link"><ArrowLeft size={14} /> Home</Link>
        <span>{isRegister ? "Already registered?" : "New to RoadLens?"} <Link to={isRegister ? "/login" : "/register"}>{isRegister ? "Sign in" : "Create an account"}</Link>
        </span>
      </div>
      <div className="auth-card-wrap">
        <div className="auth-card-heading">
          <span className="auth-lock-mark"><LockKeyhole size={19} /></span>
          <span className="auth-eyebrow">ROADLENS WORKSPACE</span>
          <h2>{isRegister ? "Create your account" : "Welcome back"}</h2>
          <p>{isRegister ? "Register to get access to the road safety dashboard." : "Sign in to continue to your Nairobi analytics dashboard."}</p>
        </div>
        <form className="auth-form" onSubmit={onSubmit}>
          {isRegister && <label className="auth-field">
            <span>Full name</span>
            <span className="auth-input-wrap">
              <UserRound size={16} />
              <input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" minLength={2} maxLength={80} required />
            </span>
            </label>}
          <label className="auth-field">
            <span>Email address</span>
            <span className="auth-input-wrap">
              <Mail size={16} />
              <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" maxLength={254} required />
              </span>
          </label>
          <div className="auth-field">
            <label htmlFor="auth-password">Password</label>
            <span className="auth-input-wrap">
            <LockKeyhole size={16} />
            <input id="auth-password" type={passwordVisible ? "text" : "password"} autoComplete={isRegister ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isRegister ? "At least 10 characters" : "Enter your password"} minLength={isRegister ? 10 : undefined} maxLength={128} required />
            <button className="auth-password-toggle" type="button" aria-label={passwordVisible ? "Hide password" : "Show password"} onClick={() => setPasswordVisible((visible) => !visible)}>{passwordVisible ? <EyeOff size={15} /> : <Eye size={15} />}</button></span></div>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="button button-primary auth-submit" type="submit" disabled={submitting || loading}>{submitting ? (isRegister ? "Creating account…" : "Signing in…") : (isRegister ? "Create account" : "Sign in to dashboard")}<ArrowRight size={15} /></button>
          {isRegister && <small className="auth-password-hint">Use 10–128 characters for your password.</small>}
        </form>
        <div className="auth-card-security">
          <LockKeyhole size={13} />
          <span>Protected sign-in with a private, HTTP-only session cookie.</span>
          </div>
      </div>
      <footer className="auth-panel-footer">© RoadLens Nairobi <span>·</span> For research and decision support</footer>
    </section>
  </main>;
}
