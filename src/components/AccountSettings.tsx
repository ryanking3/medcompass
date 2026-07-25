"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AccountSettingsProps = {
  userId: string;
  email: string;
  fullName: string | null;
  onProfileUpdated: (nextProfile: { email?: string; fullName?: string | null }) => void;
  onSignOut: () => void;
};

type Feedback = { type: "success" | "error"; message: string } | null;

function errorMessage(message: string) {
  if (message.toLowerCase().includes("same password")) return "Choose a new password rather than reusing your current one.";
  return message;
}

export function AccountSettings({ userId, email, fullName, onProfileUpdated, onSignOut }: AccountSettingsProps) {
  const [nameValue, setNameValue] = useState(fullName ?? "");
  const [emailValue, setEmailValue] = useState(email);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileFeedback, setProfileFeedback] = useState<Feedback>(null);
  const [emailFeedback, setEmailFeedback] = useState<Feedback>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null);
  const [saving, setSaving] = useState<"profile" | "email" | "password" | null>(null);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving("profile");
    setProfileFeedback(null);
    const supabase = createClient();
    const nextName = nameValue.trim() || null;
    const [{ error: profileError }, { error: userError }] = await Promise.all([
      supabase.from("profiles").upsert({ id: userId, full_name: nextName }),
      supabase.auth.updateUser({ data: { full_name: nextName } }),
    ]);

    setSaving(null);
    if (profileError || userError) {
      setProfileFeedback({ type: "error", message: errorMessage(profileError?.message ?? userError?.message ?? "We couldn’t save your profile.") });
      return;
    }

    onProfileUpdated({ fullName: nextName });
    setProfileFeedback({ type: "success", message: "Your name has been saved." });
  }

  async function changeEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextEmail = emailValue.trim().toLowerCase();
    if (nextEmail === email.toLowerCase()) {
      setEmailFeedback({ type: "error", message: "Enter a different email address to change it." });
      return;
    }

    setSaving("email");
    setEmailFeedback(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.updateUser({ email: nextEmail });
    setSaving(null);

    if (error) {
      setEmailFeedback({ type: "error", message: errorMessage(error.message) });
      return;
    }

    if (data.user.email === nextEmail) {
      onProfileUpdated({ email: nextEmail });
      setEmailFeedback({ type: "success", message: "Your email address has been updated." });
      return;
    }

    setEmailFeedback({ type: "success", message: "Check your inboxes to confirm this email change. Your current email stays active until confirmation is complete." });
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setPasswordFeedback({ type: "error", message: "Use a password with at least 8 characters." });
      return;
    }
    if (password !== confirmPassword) {
      setPasswordFeedback({ type: "error", message: "Your passwords don’t match." });
      return;
    }

    setSaving("password");
    setPasswordFeedback(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(null);

    if (error) {
      setPasswordFeedback({ type: "error", message: errorMessage(error.message) });
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setPasswordFeedback({ type: "success", message: "Your password has been updated." });
  }

  return (
    <div className="page settings-page">
      <header className="page-header settings-header">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Settings</h1>
          <p>Manage your MedCompass account and how you sign in.</p>
        </div>
      </header>

      <div className="settings-layout">
        <section className="settings-card">
          <div className="settings-card-heading"><div><p className="eyebrow">Profile</p><h2>Your details</h2></div><span className="settings-badge">Private</span></div>
          <form className="settings-form" onSubmit={saveProfile}>
            <label htmlFor="full-name">Name</label>
            <input id="full-name" value={nameValue} onChange={(event) => setNameValue(event.target.value)} placeholder="How should MedCompass address you?" maxLength={100} disabled={saving === "profile"} />
            <p className="settings-help">Used only to personalise your workspace. It is never shared with other students.</p>
            <button className="button primary" type="submit" disabled={saving === "profile"}>{saving === "profile" ? "Saving…" : "Save profile"}</button>
          </form>
          {profileFeedback && <p className={`settings-feedback ${profileFeedback.type}`} role={profileFeedback.type === "error" ? "alert" : "status"}>{profileFeedback.message}</p>}
        </section>

        <section className="settings-card">
          <div className="settings-card-heading"><div><p className="eyebrow">Sign-in email</p><h2>Email address</h2></div></div>
          <form className="settings-form" onSubmit={changeEmail}>
            <label htmlFor="account-email">Email address</label>
            <input id="account-email" type="email" autoComplete="email" value={emailValue} onChange={(event) => setEmailValue(event.target.value)} required disabled={saving === "email"} />
            <p className="settings-help">Changing your email may require confirmation from both your current and new inboxes.</p>
            <button className="button ghost" type="submit" disabled={saving === "email"}>{saving === "email" ? "Updating…" : "Change email"}</button>
          </form>
          {emailFeedback && <p className={`settings-feedback ${emailFeedback.type}`} role={emailFeedback.type === "error" ? "alert" : "status"}>{emailFeedback.message}</p>}
        </section>

        <section className="settings-card settings-card-wide">
          <div className="settings-card-heading"><div><p className="eyebrow">Security</p><h2>Set or change your password</h2></div><span className="settings-badge">Secure</span></div>
          <p className="settings-intro">A password lets you sign in directly. If you previously used only magic links, you can set your first password here.</p>
          <form className="settings-form password-settings-form" onSubmit={changePassword}>
            <div><label htmlFor="new-password">New password</label><input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} required disabled={saving === "password"} /></div>
            <div><label htmlFor="confirm-new-password">Confirm new password</label><input id="confirm-new-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat your password" required disabled={saving === "password"} /></div>
            <button className="button primary" type="submit" disabled={saving === "password"}>{saving === "password" ? "Updating…" : "Update password"}</button>
          </form>
          {passwordFeedback && <p className={`settings-feedback ${passwordFeedback.type}`} role={passwordFeedback.type === "error" ? "alert" : "status"}>{passwordFeedback.message}</p>}
        </section>

        <section className="settings-card settings-card-wide settings-signout-card">
          <div><p className="eyebrow">Session</p><h2>Sign out of MedCompass</h2><p>Use this on a shared or public device.</p></div>
          <button className="button ghost" type="button" onClick={onSignOut}>Sign out</button>
        </section>
      </div>
    </div>
  );
}
