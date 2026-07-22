"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { StudyDocument } from "@/components/types";

type DocumentReaderProps = {
  document: StudyDocument;
  onBack: () => void;
  onDocumentUpdated: (document: StudyDocument) => void;
};

export function DocumentReader({ document, onBack, onDocumentUpdated }: DocumentReaderProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isPreparing, setIsPreparing] = useState(false);
  const [preparationError, setPreparationError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDocument() {
      setSignedUrl(null);
      setError("");
      const supabase = createClient();
      const { data, error: signedUrlError } = await supabase.storage
        .from("study-sources")
        .createSignedUrl(document.storagePath, 60 * 60);

      if (cancelled) return;
      if (signedUrlError || !data?.signedUrl) {
        setError("We couldn’t open this PDF. Please return to your library and try again.");
        return;
      }

      setSignedUrl(data.signedUrl);
    }

    loadDocument();
    return () => { cancelled = true; };
  }, [document.storagePath]);

  async function prepareSource() {
    setIsPreparing(true);
    setPreparationError("");
    const response = await fetch(`/api/documents/${document.id}/extract`, { method: "POST" });
    const result = await response.json();
    setIsPreparing(false);

    if (!response.ok) {
      setPreparationError(result.error ?? "We couldn’t prepare this source.");
      return;
    }

    onDocumentUpdated(result.document as StudyDocument);
  }

  return (
    <div className="document-reader">
      <header className="document-reader-header">
        <button className="back-link" onClick={onBack}>← <span>Library</span></button>
        <div className="document-reader-title"><strong>{document.title}</strong><span>Private PDF · signed access</span></div>
        {signedUrl ? <a className="reader-open-link" href={signedUrl} target="_blank" rel="noreferrer">Open in new tab ↗</a> : <span />}
      </header>

      <div className="document-reader-layout">
        <aside className="document-reader-aside">
          <p className="eyebrow">Source</p>
          <div className="reader-file-icon">PDF</div>
          <strong>{document.title}</strong>
          <small>{document.originalFilename}</small>
          <div className="reader-source-meta"><span>Private to you</span><span>{document.pageCount ? `${document.pageCount} pages` : "Page count pending"}</span></div>
        </aside>

        <main className="document-reader-canvas">
          {!signedUrl && !error && <div className="reader-loading"><div /><h1>Opening your PDF</h1><p>Generating a secure, temporary reading link.</p></div>}
          {error && <div className="reader-loading reader-error"><span>!</span><h1>Couldn’t open this PDF</h1><p>{error}</p><button className="button primary" onClick={onBack}>Return to library</button></div>}
          {signedUrl && <iframe className="document-frame" src={signedUrl} title={`Reader for ${document.title}`} />}
        </main>

        <aside className="document-reader-next">
          <p className="eyebrow">Prepare this source</p>
          <h2>Make this PDF studyable</h2>
          <p>Extract its pages now, then we can keep citations attached to questions, notes, and card drafts.</p>
          <div className="reader-step complete"><span>✓</span><div><strong>Private upload</strong><small>Complete</small></div></div>
          <div className={document.status === "ready" ? "reader-step complete" : "reader-step"}><span>{document.status === "ready" ? "✓" : "2"}</span><div><strong>Page extraction</strong><small>{document.status === "ready" ? `${document.pageCount} pages ready` : "Ready to prepare"}</small></div></div>
          <div className="reader-step"><span>3</span><div><strong>Source-aware study tools</strong><small>After extraction</small></div></div>
          {document.status !== "ready" && <button className="button primary reader-prepare-button" onClick={prepareSource} disabled={isPreparing}>{isPreparing ? "Extracting pages…" : document.status === "failed" ? "Try extraction again" : "Prepare this source"}</button>}
          {preparationError && <p className="reader-preparation-error" role="alert">{preparationError}</p>}
        </aside>
      </div>
      <style jsx>{`
        .document-reader { min-height: 100vh; display: flex; flex-direction: column; background: #edf0ec; }.document-reader-header { height: 66px; display: grid; grid-template-columns: 1fr minmax(0, 520px) 1fr; align-items: center; gap: 20px; padding: 0 24px; background: #fffefa; border-bottom: 1px solid #dde2df; }.document-reader-title { overflow: hidden; display: grid; gap: 2px; text-align: center; }.document-reader-title strong { overflow: hidden; text-overflow: ellipsis; font-size: 13px; white-space: nowrap; }.document-reader-title span { color: #76837d; font-size: 10px; }.reader-open-link { justify-self: end; color: #39766a; font-size: 12px; font-weight: 700; text-decoration: none; }.reader-open-link:hover { text-decoration: underline; }.document-reader-layout { flex: 1; min-height: 0; display: grid; grid-template-columns: 210px minmax(420px, 1fr) 290px; }.document-reader-aside { padding: 24px 18px; background: #f7f8f5; border-right: 1px solid #dde2df; }.reader-file-icon { display: grid; place-items: center; width: 47px; height: 60px; margin: 14px 0; border-radius: 4px 7px 7px 4px; color: white; background: #496b80; font: 12px Georgia, serif; }.document-reader-aside strong, .document-reader-aside small { display: block; overflow: hidden; text-overflow: ellipsis; }.document-reader-aside strong { font-size: 12px; line-height: 1.4; }.document-reader-aside small { margin-top: 5px; color: #78857f; font-size: 10px; white-space: nowrap; }.reader-source-meta { display: grid; gap: 7px; margin-top: 24px; padding-top: 18px; border-top: 1px solid #e0e5df; }.reader-source-meta span { color: #667771; font-size: 10px; }.document-reader-canvas { position: relative; min-height: 0; background: #e2e5e0; }.document-frame { width: 100%; height: 100%; min-height: calc(100vh - 66px); border: 0; background: white; }.reader-loading { position: absolute; inset: 0; display: grid; place-items: center; align-content: center; padding: 30px; text-align: center; }.reader-loading > div { width: 30px; height: 30px; border: 3px solid #b9d0be; border-top-color: #437967; border-radius: 50%; animation: spin 900ms linear infinite; }.reader-loading h1 { margin: 17px 0 7px; color: #314340; font: 24px Georgia, serif; font-weight: 500; }.reader-loading p { max-width: 300px; margin: 0; color: #687771; font-size: 12px; line-height: 1.5; }.reader-error > span { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 50%; color: #9c4b4b; background: #fae8e7; font: 22px Georgia, serif; }.reader-error .button { margin-top: 20px; }.document-reader-next { padding: 26px 20px; background: #fffefa; border-left: 1px solid #dde2df; }.document-reader-next h2 { margin: 0 0 10px; font: 21px/1.15 Georgia, serif; font-weight: 500; }.document-reader-next > p:not(.eyebrow) { margin: 0 0 24px; color: #65746f; font-size: 12px; line-height: 1.55; }.reader-step { display: flex; gap: 9px; align-items: flex-start; padding: 11px 0; border-top: 1px solid #edf0ec; }.reader-step > span { display: grid; place-items: center; width: 21px; height: 21px; border-radius: 50%; color: #6f8079; background: #edf1ed; font-size: 10px; }.reader-step.complete > span { color: #39775e; background: #e3f0e5; }.reader-step strong, .reader-step small { display: block; }.reader-step strong { color: #40504c; font-size: 11px; }.reader-step small { margin-top: 3px; color: #84908a; font-size: 10px; } @keyframes spin { to { transform: rotate(360deg); } } @media (max-width: 980px) { .document-reader-layout { grid-template-columns: 170px minmax(340px, 1fr); }.document-reader-next { display: none; } } @media (max-width: 680px) { .document-reader-header { grid-template-columns: 1fr auto; padding: 0 18px; }.document-reader-title { display: none; }.document-reader-layout { grid-template-columns: 1fr; }.document-reader-aside { display: none; }.document-frame { min-height: calc(100vh - 66px); } }
      `}</style>
      <style jsx>{`
        .reader-prepare-button { width: 100%; margin-top: 18px; }
        .reader-preparation-error { margin-top: 12px !important; color: #9a4a4a !important; font-size: 11px !important; }
      `}</style>
    </div>
  );
}
