"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import type { StudyDocument } from "@/components/types";

const PdfContinuousViewer = dynamic(() => import("@/components/PdfContinuousViewer"), {
  ssr: false,
  loading: () => <div className="reader-loading reader-inline"><div /><h1>Rendering your PDF</h1><p>Preparing the page canvas and selectable text layer.</p></div>,
});

type DocumentReaderProps = {
  document: StudyDocument;
  onBack: () => void;
  onDocumentUpdated: (document: StudyDocument) => void;
};

const statusCopy = {
  pending: { label: "Needs extraction", detail: "Upload complete. Extract pages when you are ready.", tone: "pending" },
  processing: { label: "Extracting", detail: "We are preparing this PDF for citations.", tone: "processing" },
  ready: { label: "Studyable", detail: "Page text is ready for citations, notes, and AI study tools.", tone: "ready" },
  failed: { label: "Needs retry", detail: "Extraction failed. Try again or upload a cleaner PDF.", tone: "failed" },
} as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function clampPage(page: number, pageCount: number | null) {
  const maximumPage = pageCount && pageCount > 0 ? pageCount : 9999;
  return Math.min(Math.max(page, 1), maximumPage);
}

function pageLabel(pageCount: number | null) {
  return pageCount ? `${pageCount} ${pageCount === 1 ? "page" : "pages"}` : "Page count pending";
}

export function DocumentReader({ document, onBack, onDocumentUpdated }: DocumentReaderProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isPreparing, setIsPreparing] = useState(false);
  const [preparationError, setPreparationError] = useState("");
  const [renderError, setRenderError] = useState("");
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(document.pageCount);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [copiedCitation, setCopiedCitation] = useState(false);
  const canvasRef = useRef<HTMLElement | null>(null);
  const pageRefs = useRef(new Map<number, HTMLDivElement>());
  const scrollFrameRef = useRef<number | null>(null);
  const status = statusCopy[document.status];
  const visiblePage = clampPage(currentPage, pdfPageCount);
  const extractionReady = document.status === "ready";
  const extractionFailed = document.status === "failed";
  const extractionActive = isPreparing || document.status === "processing";
  const pageProgress = pdfPageCount ? Math.round((visiblePage / pdfPageCount) * 100) : null;
  const pdfPages = Array.from({ length: pdfPageCount ?? 0 }, (_, index) => index + 1);

  useEffect(() => {
    let cancelled = false;

    async function loadDocument() {
      setSignedUrl(null);
      setError("");
      setRenderError("");
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
      const diagnostic = result.details ? ` (${result.stage}: ${result.details})` : "";
      setPreparationError(`${result.error ?? "We couldn’t prepare this source."}${diagnostic}`);
      return;
    }

    onDocumentUpdated(result.document as StudyDocument);
  }

  function goToPage(page: number) {
    const nextPage = clampPage(page, pdfPageCount);
    setCurrentPage(nextPage);
    window.requestAnimationFrame(() => {
      globalThis.document.getElementById(`pdf-page-${nextPage}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handlePdfLoaded({ numPages }: { numPages: number }) {
    setPdfPageCount(numPages);
    setCurrentPage((page) => clampPage(page, numPages));
    setRenderError("");
  }

  function trackScrollPosition() {
    if (scrollFrameRef.current) return;
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const canvas = canvasRef.current;
      if (!canvas || !pdfPageCount) return;
      const anchor = canvas.getBoundingClientRect().top + Math.min(220, canvas.clientHeight * 0.35);
      let closestPage = visiblePage;
      let closestDistance = Number.POSITIVE_INFINITY;
      for (const [pageNumber, element] of pageRefs.current.entries()) {
        const rect = element.getBoundingClientRect();
        const distance = Math.abs(rect.top - anchor);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestPage = pageNumber;
        }
      }
      setCurrentPage((page) => page === closestPage ? page : closestPage);
    });
  }

  async function copyPageCitation() {
    const citation = `${document.title}, p. ${visiblePage}`;
    try {
      await navigator.clipboard.writeText(citation);
      setCopiedCitation(true);
      window.setTimeout(() => setCopiedCitation(false), 1800);
    } catch {
      setPreparationError("We couldn’t copy the citation from this browser. You can still cite the current page manually.");
    }
  }

  return (
    <div className="document-reader">
      <header className="document-reader-header">
        <button className="back-link" onClick={onBack}>← <span>Library</span></button>
        <div className="document-reader-title"><strong>{document.title}</strong><span>Private PDF · {status.label}</span></div>
        <div className="reader-header-actions">
          <button className="reader-icon-button" onClick={() => goToPage(visiblePage - 1)} disabled={visiblePage <= 1}>‹</button>
          <label className="reader-page-control"><span>Page</span><input type="number" min="1" max={pdfPageCount ?? undefined} value={visiblePage} onChange={(event) => goToPage(Number(event.target.value))} />{pdfPageCount && <small>/ {pdfPageCount}</small>}</label>
          <button className="reader-icon-button" onClick={() => goToPage(visiblePage + 1)} disabled={Boolean(pdfPageCount && visiblePage >= pdfPageCount)}>›</button>
          <div className="reader-zoom"><button onClick={() => setZoom((value) => Math.max(75, value - 25))}>−</button><span>{zoom}%</span><button onClick={() => setZoom((value) => Math.min(175, value + 25))}>+</button></div>
          {signedUrl ? <a className="reader-open-link" href={signedUrl} target="_blank" rel="noreferrer">Open ↗</a> : <span />}
        </div>
      </header>

      <div className="document-reader-layout">
        <aside className="document-reader-aside">
          <p className="eyebrow">Source</p>
          <div className="reader-file-icon">PDF</div>
          <strong>{document.title}</strong>
          <small>{document.originalFilename}</small>
          <span className={`reader-status ${status.tone}`}>{status.label}</span>
          <div className="reader-source-meta">
            <dl><div><dt>Access</dt><dd>Private to you</dd></div><div><dt>Pages</dt><dd>{pageLabel(pdfPageCount)}</dd></div><div><dt>Added</dt><dd>{formatDate(document.createdAt)}</dd></div></dl>
          </div>
          <div className="reader-topic-links">
            <p className="eyebrow">Linked topics</p>
            {document.linkedTopics.length ? document.linkedTopics.map((topic) => <span key={topic.id}>{topic.name}</span>) : <small>No linked topics yet</small>}
          </div>
          <div className="reader-page-rail">
            <div className="page-map-heading">
              <div><p className="eyebrow">Page map</p><strong>{pdfPageCount ? `Page ${visiblePage}` : "Loading pages"}</strong></div>
              {pageProgress !== null && <span>{pageProgress}%</span>}
            </div>
            {pdfPageCount ? <>
              <div className="page-map-progress"><span style={{ width: `${pageProgress ?? 0}%` }} /></div>
              <div className="page-map-grid" aria-label="PDF page navigation">
                {pdfPages.map((page) => <button key={page} className={page === visiblePage ? "active" : ""} onClick={() => goToPage(page)} aria-current={page === visiblePage ? "page" : undefined}>{page}</button>)}
              </div>
            </> : <small>Open the PDF to build a page map.</small>}
          </div>
        </aside>

        <main className="document-reader-canvas" ref={canvasRef} onScroll={trackScrollPosition}>
          {!signedUrl && !error && <div className="reader-loading"><div /><h1>Opening your PDF</h1><p>Generating a secure, temporary reading link.</p></div>}
          {error && <div className="reader-loading reader-error"><span>!</span><h1>Couldn’t open this PDF</h1><p>{error}</p><button className="button primary" onClick={onBack}>Return to library</button></div>}
          {signedUrl && <>
            <div className="reader-progress-bar"><span style={{ width: `${pageProgress ?? 0}%` }} /></div>
            <div className="pdf-stage">
              <PdfContinuousViewer
                file={signedUrl}
                pages={pdfPages}
                zoom={zoom}
                renderError={renderError}
                onLoadSuccess={handlePdfLoaded}
                onLoadError={(message) => setRenderError(message)}
                onPageRenderError={(message) => setRenderError(message)}
                registerPageRef={(pageNumber, element) => {
                    if (element) pageRefs.current.set(pageNumber, element);
                    else pageRefs.current.delete(pageNumber);
                }}
              />
            </div>
            <div className="reader-floating-tools"><span>{pdfPageCount ? `Page ${visiblePage} of ${pdfPageCount}` : `Page ${visiblePage}`}</span><button onClick={copyPageCitation}>{copiedCitation ? "Copied" : "Copy page citation"}</button></div>
          </>}
        </main>

        <aside className="document-reader-next">
          <p className="eyebrow">Study readiness</p>
          <h2>{extractionReady ? "This PDF is studyable" : "Make this PDF studyable"}</h2>
          <p>{status.detail}</p>
          <div className="reader-step complete"><span>✓</span><div><strong>Private upload</strong><small>Complete</small></div></div>
          <div className={extractionReady ? "reader-step complete" : extractionActive ? "reader-step active" : "reader-step"}><span>{extractionReady ? "✓" : "2"}</span><div><strong>Page extraction</strong><small>{extractionReady ? `${document.pageCount} pages ready` : extractionActive ? "Working through the PDF" : extractionFailed ? "Retry available" : "Ready to prepare"}</small></div></div>
          <div className={extractionReady ? "reader-step complete" : "reader-step"}><span>{extractionReady ? "✓" : "3"}</span><div><strong>Source-aware study tools</strong><small>{extractionReady ? "Ready for notes, cards, and AI citations" : "Unlocked after extraction"}</small></div></div>
          {!extractionReady && <button className="button primary reader-prepare-button" onClick={prepareSource} disabled={extractionActive}>{isPreparing ? "Extracting pages…" : extractionFailed ? "Try extraction again" : "Prepare this source"}</button>}
          {preparationError && <p className="reader-preparation-error" role="alert">{preparationError}</p>}
          {extractionReady && <div className="reader-ready-card"><strong>Citation layer ready</strong><p>Questions, notes, and flashcards can now point back to page numbers from this source.</p></div>}
          <div className="reader-tool-list">
            <button onClick={copyPageCitation}><span>⌘</span><div><strong>Copy current citation</strong><small>{document.title}, p. {visiblePage}</small></div></button>
            <button disabled><span>↗</span><div><strong>Create note from selection</strong><small>Coming with notes polish</small></div></button>
            <button disabled><span>✦</span><div><strong>Ask this source</strong><small>Coming with AI integration</small></div></button>
          </div>
        </aside>
      </div>
      <style jsx>{`
        .document-reader {
          height: 100vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #edf0ec;
        }

        .document-reader-header {
          flex: 0 0 auto;
          min-height: 66px;
          display: grid;
          grid-template-columns: 1fr minmax(0, 420px) 1fr;
          align-items: center;
          gap: 18px;
          padding: 10px 20px;
          background: #fffefa;
          border-bottom: 1px solid #dde2df;
        }

        .document-reader-title {
          overflow: hidden;
          display: grid;
          gap: 2px;
          text-align: center;
        }

        .document-reader-title strong {
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 13px;
          white-space: nowrap;
        }

        .document-reader-title span {
          color: #76837d;
          font-size: 10px;
        }

        .reader-header-actions {
          justify-self: end;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .reader-open-link {
          color: #39766a;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
        }

        .reader-open-link:hover {
          text-decoration: underline;
        }

        .reader-icon-button,
        .reader-zoom button {
          display: grid;
          place-items: center;
          width: 29px;
          height: 29px;
          border: 1px solid #d9e1da;
          border-radius: 7px;
          color: #49645d;
          background: #f8faf7;
          font-weight: 700;
        }

        .reader-page-control {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #65746f;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .05em;
        }

        .reader-page-control input {
          width: 54px;
          height: 29px;
          border: 1px solid #d9e1da;
          border-radius: 7px;
          color: #20343a;
          background: #fffefa;
          text-align: center;
        }

        .reader-page-control small {
          color: #7c8882;
          font-size: 11px;
          letter-spacing: 0;
          text-transform: none;
        }

        .reader-zoom {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 6px;
          border-left: 1px solid #e1e7e1;
          border-right: 1px solid #e1e7e1;
          color: #65746f;
          font-size: 11px;
        }

        .reader-zoom button {
          width: 25px;
          height: 25px;
          border: 0;
          background: transparent;
        }

        .document-reader-layout {
          flex: 1;
          min-height: 0;
          display: grid;
          grid-template-columns: 230px minmax(420px, 1fr) 315px;
          overflow: hidden;
        }

        .document-reader-aside {
          min-height: 0;
          padding: 24px 18px;
          background: #f7f8f5;
          border-right: 1px solid #dde2df;
          overflow: auto;
        }

        .reader-file-icon {
          display: grid;
          place-items: center;
          width: 47px;
          height: 60px;
          margin: 14px 0;
          border-radius: 4px 7px 7px 4px;
          color: white;
          background: #496b80;
          font: 12px Georgia, serif;
        }

        .document-reader-aside strong,
        .document-reader-aside small {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .document-reader-aside strong {
          font-size: 12px;
          line-height: 1.4;
        }

        .document-reader-aside small {
          margin-top: 5px;
          color: #78857f;
          font-size: 10px;
          white-space: nowrap;
        }

        .reader-status {
          display: inline-block;
          margin-top: 13px;
          padding: 5px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
        }

        .reader-status.ready {
          color: #39765e;
          background: #e5f1e7;
        }

        .reader-status.pending {
          color: #6a746f;
          background: #edf2ee;
        }

        .reader-status.processing {
          color: #8a6c36;
          background: #fff3dc;
        }

        .reader-status.failed {
          color: #954747;
          background: #fae8e7;
        }

        .reader-source-meta,
        .reader-topic-links,
        .reader-page-rail {
          margin-top: 22px;
          padding-top: 18px;
          border-top: 1px solid #e0e5df;
        }

        .reader-source-meta dl {
          display: grid;
          gap: 11px;
          margin: 0;
        }

        .reader-source-meta div {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .reader-source-meta dt {
          color: #89958f;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        .reader-source-meta dd {
          margin: 0;
          color: #4f615b;
          font-size: 10px;
          text-align: right;
        }

        .reader-topic-links span {
          display: inline-block;
          margin: 0 5px 6px 0;
          padding: 5px 7px;
          border-radius: 999px;
          color: #426f62;
          background: #e8f1e9;
          font-size: 10px;
          font-weight: 700;
        }

        .reader-topic-links small,
        .reader-page-rail small {
          color: #798780;
          font-size: 10px;
          line-height: 1.45;
        }

        .page-map-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }

        .page-map-heading .eyebrow {
          margin-bottom: 4px;
        }

        .page-map-heading strong {
          color: #30413d;
          font-size: 12px;
        }

        .page-map-heading span {
          padding: 4px 7px;
          border-radius: 999px;
          color: #426f62;
          background: #e8f1e9;
          font-size: 10px;
          font-weight: 700;
        }

        .page-map-progress {
          height: 5px;
          margin-bottom: 12px;
          overflow: hidden;
          border-radius: 999px;
          background: #e2e8e2;
        }

        .page-map-progress span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: #5b927a;
          transition: width 180ms ease;
        }

        .page-map-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 5px;
        }

        .page-map-grid button {
          min-width: 0;
          min-height: 29px;
          border: 1px solid #dfe6df;
          border-radius: 7px;
          color: #61716b;
          background: #fbfcf9;
          font-size: 10px;
          font-weight: 700;
        }

        .page-map-grid button:hover,
        .page-map-grid button.active {
          color: #ffffff;
          background: #497970;
          border-color: #497970;
        }

        .document-reader-canvas {
          position: relative;
          min-height: 0;
          overflow: auto;
          background: #dfe3dd;
        }

        .pdf-stage {
          min-height: calc(100vh - 66px);
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 38px 28px 82px;
        }

        .pdf-document {
          display: grid;
          justify-items: center;
          gap: 28px;
        }

        .pdf-page-wrap {
          display: grid;
          justify-items: center;
          gap: 8px;
          scroll-margin-top: 18px;
        }

        .pdf-page-label {
          color: #6a7670;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        .pdf-page {
          overflow: hidden;
          background: #fffefa;
          box-shadow: 0 10px 28px rgba(28, 44, 39, .16);
        }

        .pdf-page :global(canvas),
        .pdf-page :global(.react-pdf__Page__textContent),
        .pdf-page :global(.react-pdf__Page__annotations) {
          border-radius: 1px;
        }

        .reader-page-loading {
          padding: 34px;
          color: #66756f;
          font-size: 12px;
        }

        .reader-progress-bar {
          position: sticky;
          z-index: 2;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: rgba(231, 235, 229, .9);
        }

        .reader-progress-bar span {
          display: block;
          height: 100%;
          background: #5b927a;
          transition: width 180ms ease;
        }

        .reader-floating-tools {
          position: sticky;
          bottom: 18px;
          z-index: 3;
          display: flex;
          align-items: center;
          gap: 10px;
          width: max-content;
          margin: -64px auto 18px;
          padding: 8px 10px;
          border: 1px solid rgba(232, 238, 232, .35);
          border-radius: 999px;
          color: #eef6f0;
          background: rgba(30, 52, 52, .86);
          box-shadow: 0 8px 22px rgba(25, 38, 36, .22);
          font-size: 11px;
          backdrop-filter: blur(8px);
        }

        .reader-floating-tools button {
          border: 0;
          color: #dcefe2;
          background: transparent;
          font-size: 11px;
          font-weight: 700;
        }

        .reader-loading {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          align-content: center;
          padding: 30px;
          text-align: center;
        }

        .reader-inline {
          position: relative;
          min-height: 420px;
        }

        .reader-loading > div {
          width: 30px;
          height: 30px;
          border: 3px solid #b9d0be;
          border-top-color: #437967;
          border-radius: 50%;
          animation: spin 900ms linear infinite;
        }

        .reader-loading h1 {
          margin: 17px 0 7px;
          color: #314340;
          font: 24px Georgia, serif;
          font-weight: 500;
        }

        .reader-loading p {
          max-width: 300px;
          margin: 0;
          color: #687771;
          font-size: 12px;
          line-height: 1.5;
        }

        .reader-error > span {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          color: #9c4b4b;
          background: #fae8e7;
          font: 22px Georgia, serif;
        }

        .reader-error .button {
          margin-top: 20px;
        }

        .document-reader-next {
          min-height: 0;
          padding: 26px 20px;
          background: #fffefa;
          border-left: 1px solid #dde2df;
          overflow: auto;
        }

        .document-reader-next h2 {
          margin: 0 0 10px;
          font: 21px/1.15 Georgia, serif;
          font-weight: 500;
        }

        .document-reader-next > p:not(.eyebrow) {
          margin: 0 0 24px;
          color: #65746f;
          font-size: 12px;
          line-height: 1.55;
        }

        .reader-step {
          display: flex;
          gap: 9px;
          align-items: flex-start;
          padding: 11px 0;
          border-top: 1px solid #edf0ec;
        }

        .reader-step > span {
          display: grid;
          place-items: center;
          width: 21px;
          height: 21px;
          border-radius: 50%;
          color: #6f8079;
          background: #edf1ed;
          font-size: 10px;
        }

        .reader-step.complete > span {
          color: #39775e;
          background: #e3f0e5;
        }

        .reader-step.active > span {
          color: #866425;
          background: #fff3dc;
        }

        .reader-step strong,
        .reader-step small {
          display: block;
        }

        .reader-step strong {
          color: #40504c;
          font-size: 11px;
        }

        .reader-step small {
          margin-top: 3px;
          color: #84908a;
          font-size: 10px;
        }

        .reader-prepare-button {
          width: 100%;
          margin-top: 18px;
        }

        .reader-preparation-error {
          margin: 12px 0 0 !important;
          color: #9a4a4a !important;
          font-size: 11px !important;
          line-height: 1.45 !important;
        }

        .reader-ready-card {
          margin-top: 18px;
          padding: 13px;
          border: 1px solid #d6e6d8;
          border-radius: 9px;
          background: #eef6f0;
        }

        .reader-ready-card strong {
          color: #376a57;
          font-size: 12px;
        }

        .reader-ready-card p {
          margin: 5px 0 0;
          color: #62756c;
          font-size: 11px;
          line-height: 1.45;
        }

        .reader-tool-list {
          display: grid;
          gap: 8px;
          margin-top: 18px;
        }

        .reader-tool-list button {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          width: 100%;
          padding: 11px;
          border: 1px solid #e2e8e2;
          border-radius: 8px;
          color: #31413e;
          background: #fbfcf9;
          text-align: left;
        }

        .reader-tool-list button:disabled {
          opacity: .65;
        }

        .reader-tool-list button > span {
          display: grid;
          place-items: center;
          width: 25px;
          height: 25px;
          border-radius: 50%;
          color: #3d796d;
          background: #e5f1e7;
        }

        .reader-tool-list strong,
        .reader-tool-list small {
          display: block;
        }

        .reader-tool-list strong {
          font-size: 11px;
        }

        .reader-tool-list small {
          margin-top: 3px;
          color: #7a8780;
          font-size: 10px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1120px) {
          .document-reader-layout {
            grid-template-columns: 190px minmax(340px, 1fr) 285px;
          }

          .reader-header-actions {
            gap: 5px;
          }

          .reader-zoom {
            display: none;
          }
        }

        @media (max-width: 930px) {
          .document-reader-header {
            grid-template-columns: auto 1fr;
          }

          .reader-header-actions {
            grid-column: 1 / -1;
            justify-self: stretch;
            justify-content: flex-end;
          }

          .document-reader-layout {
            grid-template-columns: 180px minmax(340px, 1fr);
          }

          .document-reader-next {
            display: none;
          }
        }

        @media (max-width: 680px) {
          .document-reader-header {
            grid-template-columns: 1fr auto;
            padding: 10px 18px;
          }

          .document-reader-title {
            display: none;
          }

          .reader-header-actions {
            justify-content: space-between;
          }

          .reader-page-control span,
          .reader-page-control small {
            display: none;
          }

          .document-reader-layout {
            grid-template-columns: 1fr;
          }

          .document-reader-aside {
            display: none;
          }

          .pdf-stage {
            min-height: calc(100vh - 104px);
            padding: 24px 14px 76px;
          }

          .reader-floating-tools {
            width: calc(100% - 28px);
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
}
