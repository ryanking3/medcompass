import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="auth-error-page">
      <div className="auth-error-card">
        <div className="auth-brand"><span className="brand-mark" aria-hidden="true">M</span><span>MedCompass</span></div>
        <p className="eyebrow">Sign-in link expired</p>
        <h1>Let’s try that again.</h1>
        <p>Your sign-in link may have expired or already been used. Request a fresh one and you’ll be back in your workspace.</p>
        <Link className="button primary" href="/">Return to sign in</Link>
      </div>
    </main>
  );
}
