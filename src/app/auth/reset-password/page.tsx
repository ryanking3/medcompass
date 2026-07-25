"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState<"checking" | "ready" | "saving" | "success" | "error">("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        window.location.replace("/");
        return;
      }
      setStatus("ready");
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setStatus("error");
      setMessage("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setStatus("error");
      setMessage("Your passwords don’t match.");
      return;
    }

    setStatus("saving");
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("success");
    setMessage("Your password has been updated. Taking you back to your workspace…");
    window.setTimeout(() => window.location.assign("/"), 1100);
  }

  return (
    <main className="auth-error-page">
      <section className="auth-error-card reset-password-card">
        <div className="auth-brand"><span className="brand-mark" aria-hidden="true">M</span><span>MedCompass</span></div>
        <p className="eyebrow">Account recovery</p>
        <h1>Choose a new password</h1>
        <p>Use a strong password with at least 8 characters. This link is only for your account.</p>
        {status === "checking" ? <p className="auth-message sent">Checking your secure reset link…</p> : <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="reset-password">New password</label>
          <input id="reset-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required disabled={status === "saving" || status === "success"} />
          <label htmlFor="reset-confirmation">Confirm new password</label>
          <input id="reset-confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required disabled={status === "saving" || status === "success"} />
          <button className="button primary auth-submit" type="submit" disabled={status === "saving" || status === "success"}>{status === "saving" ? "Updating…" : "Update password"}</button>
        </form>}
        {message && <p className={`auth-message ${status === "error" ? "error" : "sent"}`} role={status === "error" ? "alert" : "status"}>{message}</p>}
      </section>
    </main>
  );
}
