"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "password" | "signup" | "magic";
type Status = "idle" | "submitting" | "sent" | "success" | "error";

function readableAuthError(message: string) {
  if (message.toLowerCase().includes("invalid login credentials")) {
    return "That email or password doesn’t match an account. Try again, reset your password, or use a magic link.";
  }

  return message;
}

export function SignInForm() {
  const [mode, setMode] = useState<AuthMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const isSubmitting = status === "submitting";

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    setStatus("idle");
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    const supabase = createClient();

    if (mode === "magic") {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
        },
      });

      if (error) {
        setStatus("error");
        setMessage(readableAuthError(error.message));
        return;
      }

      setStatus("sent");
      setMessage("Check your inbox for your secure sign-in link.");
      return;
    }

    if (mode === "signup") {
      if (password.length < 8) {
        setStatus("error");
        setMessage("Use a password with at least 8 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setStatus("error");
        setMessage("Your passwords don’t match.");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
        },
      });

      if (error) {
        setStatus("error");
        setMessage(readableAuthError(error.message));
        return;
      }

      if (data.session) {
        window.location.assign("/");
        return;
      }

      setStatus("sent");
      setMessage("Check your inbox to confirm your account, then return here to sign in.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus("error");
      setMessage(readableAuthError(error.message));
      return;
    }

    window.location.assign("/");
  }

  async function sendPasswordReset() {
    if (!email) {
      setStatus("error");
      setMessage("Enter your email address first, then choose password reset.");
      return;
    }

    setStatus("submitting");
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });

    if (error) {
      setStatus("error");
      setMessage(readableAuthError(error.message));
      return;
    }

    setStatus("sent");
    setMessage("If that address has an account, we’ve sent a secure password-reset link.");
  }

  const copy = mode === "signup"
    ? { eyebrow: "Create your workspace", heading: "Start with your own account", description: "Use an email and password. We’ll ask you to confirm your email before you begin." }
    : mode === "magic"
      ? { eyebrow: "Password-free sign in", heading: "Use a secure email link", description: "We’ll send a one-time link to your inbox. No password needed." }
      : { eyebrow: "Welcome back", heading: "Sign in to MedCompass", description: "Use your email and password, or choose a secure email link instead." };

  return (
    <main className="auth-page">
      <section className="auth-intro" aria-label="MedCompass introduction">
        <div className="auth-brand"><span className="brand-mark" aria-hidden="true">M</span><span>MedCompass</span></div>
        <div className="auth-intro-copy">
          <p className="eyebrow">Your study workspace</p>
          <h1>Stay close to the sources that matter.</h1>
          <p>Read your textbooks, turn the important parts into notes and cards, and keep every answer grounded in context.</p>
        </div>
        <div className="auth-intro-card">
          <span className="auth-card-kicker">Built for medical study</span>
          <strong>One calm place for textbooks, notes and recall.</strong>
          <div aria-hidden="true"><i /><i /><i /></div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="auth-mode-switch" role="tablist" aria-label="Authentication options">
            <button type="button" role="tab" aria-selected={mode === "password"} className={mode === "password" ? "active" : ""} onClick={() => changeMode("password")}>Sign in</button>
            <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "active" : ""} onClick={() => changeMode("signup")}>Create account</button>
          </div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2>{copy.heading}</h2>
          <p className="auth-form-description">{copy.description}</p>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={isSubmitting}
            />
            {mode !== "magic" && <>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={mode === "signup" ? 8 : undefined}
                disabled={isSubmitting}
              />
            </>}
            {mode === "signup" && <>
              <label htmlFor="confirm-password">Confirm password</label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                disabled={isSubmitting}
              />
            </>}
            <button className="button primary auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Please wait…" : mode === "signup" ? "Create account" : mode === "magic" ? "Email me a sign-in link" : "Sign in"}
            </button>
          </form>
          {mode === "password" && <button className="auth-text-button" type="button" onClick={sendPasswordReset} disabled={isSubmitting}>Forgot your password?</button>}
          <div className="auth-alternative">
            {mode === "magic" ? <button type="button" onClick={() => changeMode("password")}>Use your password instead</button> : <button type="button" onClick={() => changeMode("magic")}>Email me a magic link instead</button>}
          </div>
          {message && <p className={`auth-message ${status === "error" ? "error" : "sent"}`} role={status === "error" ? "alert" : "status"}>{message}</p>}
          <p className="auth-footnote">MedCompass supports learning and revision. It is not a source of clinical advice.</p>
        </div>
      </section>
    </main>
  );
}
