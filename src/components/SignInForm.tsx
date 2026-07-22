"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
    setMessage("Check your inbox for your secure sign-in link.");
  }

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
          <p className="eyebrow">Welcome</p>
          <h2>Sign in to MedCompass</h2>
          <p className="auth-form-description">We’ll email you a secure link—no password to remember.</p>
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
              disabled={status === "sending"}
            />
            <button className="button primary auth-submit" type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Sending link…" : "Email me a sign-in link"}
            </button>
          </form>
          {message && <p className={`auth-message ${status}`} role={status === "error" ? "alert" : "status"}>{message}</p>}
          <p className="auth-footnote">MedCompass supports learning and revision. It is not a source of clinical advice.</p>
        </div>
      </section>
    </main>
  );
}
