"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="app-state-page">
      <section>
        <span className="app-state-icon">!</span>
        <p className="eyebrow">Something went sideways</p>
        <h1>We couldn’t open this workspace cleanly.</h1>
        <p>Try again, or refresh the page. Your study data stays private in Supabase; this screen is just MedCompass failing safely.</p>
        {error.digest && <small>Error reference: {error.digest}</small>}
        <button className="button primary" onClick={reset}>Try again</button>
      </section>
    </main>
  );
}
